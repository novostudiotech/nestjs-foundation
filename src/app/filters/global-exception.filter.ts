import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import type { Request, Response } from 'express';
import { Logger } from 'nestjs-pino';
import { ZodValidationException } from 'nestjs-zod';
import { FOREIGN_KEY_VIOLATION, NOT_NULL_VIOLATION, UNIQUE_VIOLATION } from 'pg-error-constants';
import { QueryFailedError } from 'typeorm';
import { sentryConfig } from '#/app/config';
import type { ErrorDetails, ErrorResponse, ValidationError } from '#/app/dto/error-response.dto';
import { ErrorCode } from '#/app/dto/error-response.dto';
import { createRedactor } from './redact.util';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly sentryEnabled: boolean;
  private readonly redactHeaders: ReturnType<typeof createRedactor>;
  private readonly redactBody: ReturnType<typeof createRedactor>;

  constructor(private readonly logger: Logger) {
    // Headers redactor - removes sensitive authentication headers
    // Headers are flat (no nesting), so depth=0
    // Use plainKeys for headers with special characters (hyphens) that require bracket notation
    this.redactHeaders = createRedactor({
      keys: ['authorization', 'cookie'],
      plainKeys: ['["x-api-key"]', '["x-auth-token"]'],
      censor: '[REDACTED]',
      serialize: false,
      strict: false,
    });

    // Body redactor - removes sensitive fields from request body at any nesting depth
    // Uses createRedactor utility to automatically generate wildcard patterns
    // for multiple nesting levels (default: 3 levels deep)
    this.redactBody = createRedactor({
      keys: ['password', 'token', 'secret', 'apiKey', 'api_key', 'creditCard', 'credit_card'],
      depth: 3, // Redact keys up to 3 levels deep (e.g., body.data.user.password)
      censor: '[REDACTED]',
      serialize: false,
      strict: false,
    });

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

    // Build details from PostgreSQL error
    // TODO: Consider using centralized config for environment checks instead of direct process.env access
    // For consistency with other parts of the codebase (e.g., sentryConfig), add an isProduction
    // or environment property to the config module and use it here
    const isProduction = process.env.NODE_ENV === 'production';
    const details: ErrorDetails = {};

    // Table name is only exposed in non-production environments
    if (!isProduction) {
      if (dbError.table) details.table = dbError.table;
    }

    // TODO: Consider whether constraint names should be filtered in production
    // Constraint names like "users_email_key" or "orders_user_id_fkey" do reveal table and column names,
    // which constitutes minor information disclosure about database schema. This is currently an
    // intentional design decision for better UX (field highlighting) and debugging, but should be
    // reviewed if stricter security requirements are needed
    //
    // ---
    //
    // Column and constraint are safe to expose even in production:
    // - Column: needed for UI field highlighting (e.g., "email field has error")
    // - Constraint: provides useful context (e.g., "users_email_key", "orders_user_id_fkey")
    //   without revealing sensitive data or internal implementation details
    if (dbError.column) details.column = dbError.column;
    if (dbError.constraint) details.constraint = dbError.constraint;

    const hasDetails = Object.keys(details).length > 0;

    // Map PostgreSQL error codes to HTTP status, messages, and codes
    let status: HttpStatus;
    let message: string;
    let code: ErrorCode;

    switch (dbError.code) {
      case UNIQUE_VIOLATION:
        status = HttpStatus.BAD_REQUEST;
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
        // TODO: Consider simplifying the user type assertion
        // The double type assertion is safe due to the user?.id guard, but could be cleaner.
        // Options: 1) Define a RequestWithUser interface, or 2) Extract to a helper method
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
   * Uses fast-redact for secure and performant sanitization
   */
  private sanitizeHeaders(headers: Request['headers']): Record<string, unknown> {
    if (!headers || typeof headers !== 'object') {
      return {};
    }

    // fast-redact is safe from prototype pollution as it validates paths at compile time
    // We pass headers directly - fast-redact will handle them safely
    return this.redactHeaders(headers) as Record<string, unknown>;
  }

  /**
   * Remove sensitive data from request body before sending to Sentry
   * Uses fast-redact for secure and performant deep sanitization
   */
  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') {
      return body;
    }

    // Handle arrays - recursively sanitize each item
    if (Array.isArray(body)) {
      return body.map((item) => this.sanitizeBody(item));
    }

    // fast-redact is safe from prototype pollution as it validates paths at compile time
    // It handles nested objects and wildcards efficiently
    // We pass the body directly - fast-redact will handle it safely
    return this.redactBody(body) as unknown;
  }
}
