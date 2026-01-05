import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import type { Request, Response } from 'express';
import { Logger } from 'nestjs-pino';
import { ZodValidationException } from 'nestjs-zod';
import { QueryFailedError } from 'typeorm';
import { sentryConfig } from '../../config';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  requestId?: string;
  errors?: unknown[]; // For Zod validation errors
  details?: Record<string, unknown>; // For additional error details
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly sentryEnabled: boolean;

  constructor(private readonly logger: Logger) {
    // Initialize Sentry if DSN is provided
    this.sentryEnabled = sentryConfig.enabled;
    if (this.sentryEnabled && sentryConfig.dsn) {
      Sentry.init({
        dsn: sentryConfig.dsn,
        environment: sentryConfig.environment,
        // Only capture errors, not transactions (performance monitoring)
        tracesSampleRate: 0,
        // Don't send any PII (Personally Identifiable Information) by default
        beforeSend(event) {
          // Remove sensitive data from breadcrumbs
          if (event.breadcrumbs) {
            event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
              if (breadcrumb.data) {
                const { authorization, cookie, ...safeData } = breadcrumb.data;
                breadcrumb.data = safeData;
              }
              return breadcrumb;
            });
          }
          return event;
        },
      });
      this.logger.log('Sentry initialized for error tracking');
    } else {
      this.logger.log('Sentry is disabled (no SENTRY_DSN provided)');
    }
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Send to Sentry and log errors with appropriate level
    // Only send server errors (>= 500) to Sentry to avoid noise from client errors
    if (errorResponse.statusCode >= 500) {
      this.captureException(exception, request);
      this.logger.error(
        {
          err: exception,
          req: request,
          statusCode: errorResponse.statusCode,
        },
        `Internal server error: ${errorResponse.message}`
      );
    } else if (errorResponse.statusCode >= 400) {
      this.logger.warn(
        {
          req: request,
          statusCode: errorResponse.statusCode,
        },
        `Client error: ${errorResponse.message}`
      );
    }

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(exception: unknown, request: Request): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const requestId = request.headers['x-request-id'] as string | undefined;

    const baseContext = { timestamp, path, requestId };

    // Handle Zod validation exceptions (must be before HttpException as it extends it)
    if (exception instanceof ZodValidationException) {
      return this.handleZodValidationException(exception, baseContext);
    }

    // Handle NestJS HTTP exceptions
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception, baseContext);
    }

    // Handle TypeORM database errors
    if (exception instanceof QueryFailedError) {
      return this.handleDatabaseError(exception, baseContext);
    }

    // Handle generic Error instances and unknown errors
    return this.handleGenericError(baseContext);
  }

  private handleZodValidationException(
    exception: ZodValidationException,
    context: { timestamp: string; path: string; requestId?: string }
  ): ErrorResponse {
    const exceptionResponse = exception.getResponse() as Record<string, unknown>;
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: (exceptionResponse.message as string) ?? exception.message,
      error: (exceptionResponse.error as string) ?? 'Validation Error',
      errors: exceptionResponse.errors as unknown[],
      ...context,
    };
  }

  private handleHttpException(
    exception: HttpException,
    context: { timestamp: string; path: string; requestId?: string }
  ): ErrorResponse {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string | string[];
    let error: string;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
      error = exception.name;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as Record<string, unknown>;
      message = (responseObj.message as string | string[]) ?? exception.message;
      error = (responseObj.error as string) ?? exception.name;
    } else {
      message = exception.message;
      error = exception.name;
    }

    return {
      statusCode: status,
      message,
      error,
      ...context,
    };
  }

  private handleDatabaseError(
    exception: QueryFailedError,
    context: { timestamp: string; path: string; requestId?: string }
  ): ErrorResponse {
    const dbError = exception as QueryFailedError & { code?: string; detail?: string };

    // PostgreSQL error codes
    switch (dbError.code) {
      case '23505': // unique_violation
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'A record with this value already exists',
          error: 'Conflict',
          ...context,
        };
      case '23503': // foreign_key_violation
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Referenced record does not exist',
          error: 'Bad Request',
          ...context,
        };
      case '23502': // not_null_violation
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Required field is missing',
          error: 'Bad Request',
          ...context,
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error occurred',
          error: 'Internal Server Error',
          ...context,
        };
    }
  }

  private handleGenericError(context: {
    timestamp: string;
    path: string;
    requestId?: string;
  }): ErrorResponse {
    // Return generic message to avoid leaking internal details (SQL, file paths, etc.)
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
      ...context,
    };
  }

  /**
   * Capture exception in Sentry with enriched context
   * Only called for server errors (status >= 500)
   */
  private captureException(exception: unknown, request: Request): void {
    if (!this.sentryEnabled) {
      return;
    }

    Sentry.withScope((scope) => {
      // Add request context
      scope.setContext('request', {
        url: request.url,
        method: request.method,
        headers: this.sanitizeHeaders(request.headers),
        query: request.query,
        body: this.sanitizeBody(request.body),
      });

      // Add user context if available (from auth middleware)
      const user = (request as unknown as Record<string, unknown>).user as
        | { id: string; email?: string }
        | undefined;
      if (user?.id) {
        scope.setUser({
          id: user.id,
          email: user.email,
        });
      }

      // Add useful tags for filtering in Sentry
      scope.setTag('path', request.path);
      scope.setTag('method', request.method);
      scope.setTag('url', request.url);

      // Capture the exception
      Sentry.captureException(exception);
    });
  }

  /**
   * Remove sensitive headers before sending to Sentry
   */
  private sanitizeHeaders(headers: Request['headers']): Record<string, unknown> {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Remove sensitive data from request body before sending to Sentry
   */
  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...(body as Record<string, unknown>) };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
