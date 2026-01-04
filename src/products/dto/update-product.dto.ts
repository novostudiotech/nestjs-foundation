import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateProductSchema } from './create-product.dto';

/**
 * Schema for updating a product (all fields optional for PATCH)
 * Uses partial() to make all fields optional
 */
export const UpdateProductSchema = CreateProductSchema.partial();

/**
 * DTO for updating a product
 * All fields are optional for partial updates
 */
export class UpdateProductDto extends createZodDto(UpdateProductSchema) {}

/**
 * Type inferred from UpdateProductSchema for use in services
 */
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
