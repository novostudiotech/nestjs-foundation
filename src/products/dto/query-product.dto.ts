import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ProductCategoryEnum, ProductStatusEnum } from './create-product.dto';

/**
 * Schema for query parameters when listing products
 * Tests query parameter validation
 */
export const QueryProductSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  category: ProductCategoryEnum.optional(),
  status: ProductStatusEnum.optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  // Strict boolean parsing: only "true" -> true, "false" -> false
  // Use z.stringbool() instead of z.coerce.boolean() to avoid JS truthiness issues
  // (z.coerce.boolean() would convert "false" to true because Boolean("false") === true)
  inStock: z.stringbool({ truthy: ['true'], falsy: ['false'] }).optional(),
  search: z.string().min(1).max(100).optional(),
  sortBy: z.enum(['name', 'price', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * DTO for query parameters when listing products
 */
export class QueryProductDto extends createZodDto(QueryProductSchema) {}

/**
 * Type inferred from QueryProductSchema for use in services
 */
export type QueryProductInput = z.infer<typeof QueryProductSchema>;
