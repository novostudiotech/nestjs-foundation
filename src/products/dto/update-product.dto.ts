import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateProductSchema } from './create-product.dto';

/**
 * Schema for updating a product (all fields optional for PATCH)
 * Constructed from CreateProductSchema's shape with defaults removed
 * so omitted fields remain undefined and won't overwrite existing values
 */
export const UpdateProductSchema = z.object(
  Object.fromEntries(
    Object.entries(CreateProductSchema.shape).map(([key, schema]) => {
      // If the schema has a default, unwrap it and make it optional
      // Otherwise, just make it optional
      const zodSchema = schema as z.ZodTypeAny;
      if (zodSchema instanceof z.ZodDefault) {
        return [key, z.optional(zodSchema.unwrap())];
      }
      return [key, z.optional(zodSchema)];
    })
  )
);

/**
 * DTO for updating a product
 * All fields are optional for partial updates
 */
export class UpdateProductDto extends createZodDto(UpdateProductSchema) {}

/**
 * Type inferred from UpdateProductSchema for use in services
 */
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
