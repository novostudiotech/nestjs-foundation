import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Logger } from 'nestjs-pino';
import { ZodValidationException } from 'nestjs-zod';
import { QueryFailedError } from 'typeorm';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  requestId?: string;
  errors?: unknown[]; // For Zod validation errors
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log the error with appropriate level
    if (errorResponse.statusCode >= 500) {
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

    // Handle Zod validation exceptions (must be before HttpException as it extends it)
    if (exception instanceof ZodValidationException) {
      const exceptionResponse = exception.getResponse() as Record<string, unknown>;
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: (exceptionResponse.message as string) ?? exception.message,
        error: (exceptionResponse.error as string) ?? 'Validation Error',
        errors: exceptionResponse.errors as unknown[],
        timestamp,
        path,
        requestId,
      };
    }

    // Handle NestJS HTTP exceptions
    if (exception instanceof HttpException) {
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
        timestamp,
        path,
        requestId,
      };
    }

    // Handle TypeORM database errors
    if (exception instanceof QueryFailedError) {
      const dbError = exception as QueryFailedError & { code?: string; detail?: string };

      // PostgreSQL error codes
      switch (dbError.code) {
        case '23505': // unique_violation
          return {
            statusCode: HttpStatus.CONFLICT,
            message: 'A record with this value already exists',
            error: 'Conflict',
            timestamp,
            path,
            requestId,
          };
        case '23503': // foreign_key_violation
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Referenced record does not exist',
            error: 'Bad Request',
            timestamp,
            path,
            requestId,
          };
        case '23502': // not_null_violation
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Required field is missing',
            error: 'Bad Request',
            timestamp,
            path,
            requestId,
          };
        default:
          return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Database error occurred',
            error: 'Internal Server Error',
            timestamp,
            path,
            requestId,
          };
      }
    }

    // Handle generic Error instances
    // Return generic message to avoid leaking internal details (SQL, file paths, etc.)
    if (exception instanceof Error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'Internal Server Error',
        timestamp,
        path,
        requestId,
      };
    }

    // Handle unknown errors
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
      timestamp,
      path,
      requestId,
    };
  }
}
