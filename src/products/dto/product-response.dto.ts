import { ApiProperty } from '@nestjs/swagger';

/**
 * Product entity response
 */
export class ProductResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Test Product' })
  name: string;

  @ApiProperty({ example: 'This is a test product description', required: false })
  description?: string;

  @ApiProperty({ example: 99.99 })
  price: number;

  @ApiProperty({ example: 'USD', enum: ['USD', 'EUR', 'RUB'] })
  currency: string;

  @ApiProperty({
    example: 'electronics',
    enum: ['electronics', 'clothing', 'food', 'books', 'toys', 'other'],
  })
  category: string;

  @ApiProperty({ example: 'active', enum: ['draft', 'active', 'archived', 'out_of_stock'] })
  status: string;

  @ApiProperty({ example: true })
  inStock: boolean;

  @ApiProperty({ example: 100, required: false })
  stockQuantity?: number;

  @ApiProperty({ example: ['test', 'demo'], type: [String], required: false })
  tags?: string[];

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  imageUrl?: string;

  @ApiProperty({ example: 10, required: false })
  discountPercentage?: number;

  @ApiProperty({
    example: {
      brand: 'Test Brand',
      manufacturer: 'Test Manufacturer',
      sku: 'TEST-001',
    },
    required: false,
  })
  metadata?: Record<string, unknown>;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', required: false })
  publishedAt?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  createdBy: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: string;
}

/**
 * Create product response
 */
export class CreateProductResponseDto {
  @ApiProperty({ example: 'Product created successfully' })
  message: string;

  @ApiProperty({ type: ProductResponseDto })
  product: ProductResponseDto;
}

/**
 * Update product response
 */
export class UpdateProductResponseDto {
  @ApiProperty({ example: 'Product updated successfully' })
  message: string;

  @ApiProperty({ type: ProductResponseDto })
  product: ProductResponseDto;
}

/**
 * Patch product response
 */
export class PatchProductResponseDto {
  @ApiProperty({ example: 'Product partially updated successfully' })
  message: string;

  @ApiProperty({ type: ProductResponseDto })
  product: ProductResponseDto;
}

/**
 * Get one product response
 */
export class GetProductResponseDto {
  @ApiProperty({ type: ProductResponseDto })
  product: ProductResponseDto;

  @ApiProperty({ example: false })
  isOwner: boolean;
}

/**
 * Pagination metadata
 */
export class PaginationDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 10 })
  totalPages: number;
}

/**
 * Paginated products response
 */
export class PaginatedProductsResponseDto {
  @ApiProperty({ type: [ProductResponseDto] })
  data: ProductResponseDto[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}
