import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Product status enum
 */
export const ProductStatusEnum = z.enum(['draft', 'active', 'archived', 'out_of_stock']);

/**
 * Product category enum
 */
export const ProductCategoryEnum = z.enum([
  'electronics',
  'clothing',
  'food',
  'books',
  'toys',
  'other',
]);

/**
 * Schema for product metadata (nested object)
 */
const ProductMetadataSchema = z.object({
  brand: z.string().min(1).optional(),
  manufacturer: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  barcode: z.string().min(1).optional(),
  weight: z.number().positive().optional(),
  dimensions: z
    .object({
      width: z.number().positive(),
      height: z.number().positive(),
      depth: z.number().positive(),
    })
    .optional(),
});

/**
 * Schema for creating a product
 * Includes various validation types to test validation pipes
 */
export const CreateProductSchema = z
  .object({
    name: z.string().min(2).max(200),
    description: z.string().min(10).max(5000).optional(),
    price: z.number().positive().max(999999.99),
    currency: z.enum(['USD', 'EUR', 'RUB']).default('USD'),
    category: ProductCategoryEnum,
    status: ProductStatusEnum.default('draft'),
    inStock: z.boolean().default(true),
    stockQuantity: z.number().int().min(0).optional(),
    tags: z.array(z.string().min(1).max(50)).max(10).optional(),
    imageUrl: z.string().url().optional(),
    discountPercentage: z.number().min(0).max(100).optional(),
    metadata: ProductMetadataSchema.optional(),
    publishedAt: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      // When inStock is true, stockQuantity must be present and >= 1
      if (data.inStock === true) {
        return data.stockQuantity !== undefined && data.stockQuantity >= 1;
      }
      return true;
    },
    {
      message: 'When inStock is true, stockQuantity must be provided and must be at least 1',
      path: ['stockQuantity'],
    }
  )
  .refine(
    (data) => {
      // When inStock is false, stockQuantity must be 0 (if present)
      if (data.inStock === false && data.stockQuantity !== undefined) {
        return data.stockQuantity === 0;
      }
      return true;
    },
    {
      message: 'When inStock is false, stockQuantity must be 0',
      path: ['stockQuantity'],
    }
  );

/**
 * DTO for creating a product
 * Generated from Zod schema with automatic Swagger integration
 */
export class CreateProductDto extends createZodDto(CreateProductSchema) {}

/**
 * Type inferred from CreateProductSchema for use in services
 */
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
