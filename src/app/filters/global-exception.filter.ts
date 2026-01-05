import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import type { Request, Response } from 'express';
import { Logger } from 'nestjs-pino';
import { ZodValidationException } from 'nestjs-zod';
import { FOREIGN_KEY_VIOLATION, NOT_NULL_VIOLATION, UNIQUE_VIOLATION } from 'pg-error-constants';
import { QueryFailedError } from 'typeorm';
import { sentryConfig } from '../../config';
import type { ErrorDetails, ErrorResponse, ValidationError } from '../dto/error-response.dto';
import { ErrorCode } from '../dto/error-response.dto';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly sentryEnabled: boolean;

  constructor(private readonly logger: Logger) {
    // Initialize Sentry if DSN is provided
    this.sentryEnabled = sentryConfig.enabled;
    if (this.sentryEnabled && sentryConfig.dsn) {
      try {
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
      } catch (error) {
        this.sentryEnabled = false;
        this.logger.error({ err: error }, 'Failed to initialize Sentry - error tracking disabled');
      }
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
    if (errorResponse.status >= 500) {
      this.captureException(exception, request);
      this.logger.error(
        {
          err: exception,
          req: request,
          status: errorResponse.status,
        },
        `Internal server error: ${errorResponse.message}`
      );
    } else if (errorResponse.status >= 400) {
      this.logger.warn(
        {
          req: request,
          status: errorResponse.status,
        },
        `Client error: ${errorResponse.message}`
      );
    }

    response.status(errorResponse.status).json(errorResponse);
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
    const zodErrors = exceptionResponse.errors as Array<{
      path: (string | number)[];
      message: string;
      code?: string;
    }>;

    // Transform Zod errors to our ValidationError format
    const validation: ValidationError[] =
      zodErrors?.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        rule: err.code,
      })) || [];

    return {
      status: HttpStatus.BAD_REQUEST,
      code: ErrorCode.VALIDATION_ERROR,
      message: (exceptionResponse.message as string) ?? 'Validation failed',
      validation,
      ...context,
    };
  }

  private handleHttpException(
    exception: HttpException,
    context: { timestamp: string; path: string; requestId?: string }
  ): ErrorResponse {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string;
    let code: ErrorCode;

    // Determine error code based on status
    if (status === HttpStatus.UNAUTHORIZED) {
      code = ErrorCode.UNAUTHORIZED;
    } else if (status === HttpStatus.FORBIDDEN) {
      code = ErrorCode.FORBIDDEN;
    } else if (status === HttpStatus.NOT_FOUND) {
      code = ErrorCode.NOT_FOUND;
    } else if (status >= 500) {
      code = ErrorCode.INTERNAL_SERVER_ERROR;
    } else {
      code = ErrorCode.BAD_REQUEST;
    }

    // Extract message
    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as Record<string, unknown>;
      const msgValue = responseObj.message;
      // Handle both string and string[] from NestJS
      message = Array.isArray(msgValue)
        ? msgValue.join(', ')
        : ((msgValue as string) ?? exception.message);
    } else {
      message = exception.message;
    }

    return {
      status,
      code,
      message,
      ...context,
    };
  }

  private handleDatabaseError(
    exception: QueryFailedError,
    context: { timestamp: string; path: string; requestId?: string }
  ): ErrorResponse {
    // PostgreSQL error object has these properties
    const dbError = exception as QueryFailedError & {
      code?: string;
      detail?: string;
      constraint?: string;
      table?: string;
      column?: string;
      schema?: string;
    };

    // Build details from PostgreSQL error (only in development)
    const isDevelopment = process.env.NODE_ENV === 'development';
    const details: ErrorDetails = {};

    if (isDevelopment) {
      if (dbError.constraint) details.constraint = dbError.constraint;
      if (dbError.table) details.table = dbError.table;
    }

    // Column is safe to expose (needed for UI field highlighting)
    if (dbError.column) details.column = dbError.column;

    const hasDetails = Object.keys(details).length > 0;

    // Map PostgreSQL error codes to HTTP status, messages, and codes
    let status: HttpStatus;
    let message: string;
    let code: ErrorCode;

    switch (dbError.code) {
      case UNIQUE_VIOLATION:
        status = HttpStatus.CONFLICT;
        message = 'A record with this value already exists';
        code = ErrorCode.DATABASE_CONFLICT_ERROR;
        break;

      case FOREIGN_KEY_VIOLATION:
        status = HttpStatus.BAD_REQUEST;
        message = 'Referenced record does not exist';
        code = ErrorCode.DATABASE_VALIDATION_ERROR;
        break;

      case NOT_NULL_VIOLATION:
        status = HttpStatus.BAD_REQUEST;
        message = 'Required field is missing';
        code = ErrorCode.DATABASE_VALIDATION_ERROR;
        break;

      default:
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Database error occurred';
        code = ErrorCode.DATABASE_ERROR;
    }

    return {
      status,
      code,
      message,
      details: hasDetails ? details : undefined,
      ...context,
    };
  }

  private handleGenericError(context: {
    timestamp: string;
    path: string;
    requestId?: string;
  }): ErrorResponse {
    // Return generic message to avoid leaking internal details (SQL, file paths, etc.)
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
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

    try {
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
    } catch (sentryError) {
      // Log but don't throw to avoid crashing the exception handler
      this.logger.warn(
        { err: sentryError, url: request.url, method: request.method },
        'Failed to capture exception in Sentry'
      );
    }
  }

  /**
   * Remove sensitive headers before sending to Sentry
   */
  private sanitizeHeaders(headers: Request['headers']): Record<string, unknown> {
    const sanitized: Record<string, unknown> = Object.create(null);
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

    // Safely copy headers without dynamic property injection
    for (const [key, value] of Object.entries(headers)) {
      // Prevent prototype pollution by checking for dangerous keys
      if (this.isDangerousKey(key)) {
        continue;
      }

      if (sensitiveHeaders.includes(key.toLowerCase())) {
        Object.defineProperty(sanitized, key, {
          value: '[REDACTED]',
          enumerable: true,
          configurable: true,
          writable: true,
        });
      } else {
        Object.defineProperty(sanitized, key, {
          value,
          enumerable: true,
          configurable: true,
          writable: true,
        });
      }
    }

    return sanitized;
  }

  /**
   * Remove sensitive data from request body before sending to Sentry
   * Recursively sanitizes nested objects and arrays
   */
  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];

    // Handle arrays
    if (Array.isArray(body)) {
      return body.map((item) => this.sanitizeBody(item));
    }

    // Handle objects - deep sanitization with prototype pollution protection
    const sanitized: Record<string, unknown> = Object.create(null);
    for (const [key, value] of Object.entries(body)) {
      // Prevent prototype pollution by checking for dangerous keys
      if (this.isDangerousKey(key)) {
        continue;
      }

      // Check if key matches sensitive field (case-insensitive)
      const isSensitive = sensitiveFields.some((field) =>
        key.toLowerCase().includes(field.toLowerCase())
      );

      if (isSensitive) {
        Object.defineProperty(sanitized, key, {
          value: '[REDACTED]',
          enumerable: true,
          configurable: true,
          writable: true,
        });
      } else if (value && typeof value === 'object') {
        // Recursively sanitize nested objects/arrays
        Object.defineProperty(sanitized, key, {
          value: this.sanitizeBody(value),
          enumerable: true,
          configurable: true,
          writable: true,
        });
      } else {
        Object.defineProperty(sanitized, key, {
          value,
          enumerable: true,
          configurable: true,
          writable: true,
        });
      }
    }

    return sanitized;
  }

  /**
   * Check if a key is dangerous and could lead to prototype pollution
   */
  private isDangerousKey(key: string): boolean {
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    return dangerousKeys.includes(key);
  }
}
