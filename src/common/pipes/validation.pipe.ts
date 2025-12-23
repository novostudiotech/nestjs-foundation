import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

/**
 * Creates a configured validation pipe with detailed error messages
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true, // Remove properties that are not in DTO
    forbidNonWhitelisted: true, // Throw error if extra properties are present
    transform: true, // Automatically transform payloads to DTO instances
    transformOptions: {
      enableImplicitConversion: true, // Enable automatic type conversion
    },
    exceptionFactory: (errors: ValidationError[]) => {
      // Recursive function to format errors including nested ones
      const formatErrors = (errors: ValidationError[], parentPath = ''): any[] => {
        return errors.flatMap((error) => {
          const propertyPath = parentPath ? `${parentPath}.${error.property}` : error.property;

          const result: any[] = [];

          // If there are validation errors for the current property
          if (error.constraints) {
            result.push({
              property: propertyPath,
              value: error.value,
              errors: Object.values(error.constraints),
            });
          }

          // If there are nested errors (e.g., in objects)
          if (error.children && error.children.length > 0) {
            result.push(...formatErrors(error.children, propertyPath));
          }

          // Fallback: if error has neither constraints nor children, report it anyway
          // This ensures we don't silently lose validation errors
          if (!error.constraints && (!error.children || error.children.length === 0)) {
            result.push({
              property: propertyPath,
              value: error.value,
              errors: ['Validation failed for this property'],
            });
          }

          return result;
        });
      };

      const formattedErrors = formatErrors(errors);

      return new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: formattedErrors,
      });
    },
    // Enable detailed error messages
    disableErrorMessages: false,
    // Validate nested objects
    validationError: {
      target: false, // Don't include the whole object in response
      value: true, // Include the value that failed validation
    },
  });
}
