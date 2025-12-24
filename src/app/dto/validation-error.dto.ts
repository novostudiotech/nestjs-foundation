import { ApiProperty } from '@nestjs/swagger';

export class ValidationErrorItemDto {
  @ApiProperty({
    description: 'Error code (e.g., invalid_type, invalid_format, too_small)',
    example: 'invalid_type',
  })
  code: string;

  @ApiProperty({
    description: 'Path to the field that failed validation',
    example: ['email'],
    type: [String],
  })
  path: string[];

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Invalid input: expected string, received undefined',
  })
  message: string;

  @ApiProperty({
    description: 'Expected type or format',
    example: 'string',
    required: false,
  })
  expected?: string;

  @ApiProperty({
    description: 'Minimum value (for too_small errors)',
    example: 2,
    required: false,
  })
  minimum?: number;

  @ApiProperty({
    description: 'Format expected (for invalid_format errors)',
    example: 'email',
    required: false,
  })
  format?: string;
}

export class ValidationErrorDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Validation failed',
  })
  message: string;

  @ApiProperty({
    description: 'Array of validation errors',
    type: [ValidationErrorItemDto],
  })
  errors: ValidationErrorItemDto[];
}
