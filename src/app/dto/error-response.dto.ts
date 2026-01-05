import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standardized error response structure
 *
 * Hierarchy:
 * 1. HTTP Status (status) - HTTP status code
 * 2. Error Code (code) - application level classification for i18n
 * 3. Message (message) - human-readable description
 * 4. Details (details) - additional context (constraint, table, column, etc.)
 * 5. Validation Errors (validation) - field-level validation errors
 */

/**
 * Application-level error codes for client-side handling and i18n
 */
export enum ErrorCode {
  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_VALIDATION_ERROR = 'DATABASE_VALIDATION_ERROR', // e.g., FK / NOT NULL
  BAD_REQUEST = 'BAD_REQUEST',
  DATABASE_CONFLICT_ERROR = 'DATABASE_CONFLICT_ERROR', // e.g., unique violation

  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',

  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',

  // Not found errors (404)
  NOT_FOUND = 'NOT_FOUND',

  // Server errors (500)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR', // fallback
}

/**
 * Field-level validation error for forms
 */
export interface ValidationError {
  /** Field path (e.g., "email", "user.address.city") */
  field: string;
  /** Validation error message */
  message: string;
  /** Validation rule that failed (e.g., "required", "email", "min") */
  rule?: string;
}

/**
 * Swagger DTO for validation error
 */
export class ValidationErrorDto {
  @ApiProperty({
    description: 'Field path (e.g., "email", "user.address.city")',
    example: 'email',
  })
  field: string;

  @ApiProperty({
    description: 'Validation error message',
    example: 'Invalid email format',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Validation rule that failed (e.g., "required", "email", "min")',
    example: 'email',
  })
  rule?: string;
}

/**
 * Additional error details
 * Contains database-specific or error-specific information
 */
export interface ErrorDetails {
  /** Database constraint name (e.g., "users_email_key") */
  constraint?: string;
  /** Database table name */
  table?: string;
  /** Database column name */
  column?: string;
  /** PostgreSQL error detail message */
  detail?: string;
  /** Additional context */
  [key: string]: unknown;
}

/**
 * Swagger DTO for error details
 */
export class ErrorDetailsDto {
  @ApiPropertyOptional({
    description: 'Database constraint name (e.g., "users_email_key")',
    example: 'users_email_key',
  })
  constraint?: string;

  @ApiPropertyOptional({
    description: 'Database table name',
    example: 'users',
  })
  table?: string;

  @ApiPropertyOptional({
    description: 'Database column name',
    example: 'email',
  })
  column?: string;

  @ApiPropertyOptional({
    description: 'PostgreSQL error detail message',
    example: 'Key (email)=(test@example.com) already exists.',
  })
  detail?: string;
}

/**
 * Standardized error response (interface for internal use)
 */
export interface ErrorResponse {
  /** HTTP status code (e.g., 400, 404, 500) */
  status: number;

  /** Application error code for i18n and client-side handling */
  code: ErrorCode;

  /** Human-readable error message (English) */
  message: string;

  /** ISO 8601 timestamp */
  timestamp: string;

  /** Request path */
  path: string;

  /** Request ID for tracing */
  requestId?: string;

  /** Field-level validation errors (for forms) */
  validation?: ValidationError[];

  /** Additional error details (constraint, table, column, etc.) */
  details?: ErrorDetails;
}

/**
 * Standardized error response (Swagger DTO for documentation)
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  status: number;

  @ApiProperty({
    enum: ErrorCode,
    description: 'Application error code for i18n and client-side handling',
    example: ErrorCode.VALIDATION_ERROR,
  })
  code: ErrorCode;

  @ApiProperty({
    description: 'Human-readable error message (English)',
    example: 'Validation failed',
  })
  message: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp',
    example: '2024-01-05T12:00:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path',
    example: '/api/products',
  })
  path: string;

  @ApiPropertyOptional({
    description: 'Request ID for tracing',
    example: 'abc-123',
  })
  requestId?: string;

  @ApiPropertyOptional({
    type: [ValidationErrorDto],
    description: 'Field-level validation errors (for forms)',
  })
  validation?: ValidationErrorDto[];

  @ApiPropertyOptional({
    type: ErrorDetailsDto,
    description: 'Additional error details (constraint, table, column, etc.)',
  })
  details?: ErrorDetailsDto;
}
