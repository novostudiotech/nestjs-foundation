import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { CreateProductInput, CreateProductSchema } from './dto/create-product.dto';
import { QueryProductInput } from './dto/query-product.dto';
import { UpdateProductInput } from './dto/update-product.dto';

/**
 * Product type with database fields (id, timestamps, createdBy)
 * Based on CreateProductSchema with additional fields
 */
export type Product = z.infer<typeof CreateProductSchema> & {
  id: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ProductsService {
  private products: Product[] = [];
  private nextId = 1;

  /**
   * Create a new product
   */
  create(createProductDto: CreateProductInput, userId: string): Product {
    const now = new Date();
    const product: Product = {
      id: String(this.nextId++),
      ...createProductDto,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };
    this.products.push(product);
    return product;
  }

  /**
   * Find all products with optional filtering and pagination
   */
  findAll(query: QueryProductInput): {
    data: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  } {
    let filtered = [...this.products];

    // Apply filters
    if (query.category) {
      filtered = filtered.filter((p) => p.category === query.category);
    }
    if (query.status) {
      filtered = filtered.filter((p) => p.status === query.status);
    }
    if (query.minPrice !== undefined) {
      const minPrice = query.minPrice;
      filtered = filtered.filter((p) => p.price >= minPrice);
    }
    if (query.maxPrice !== undefined) {
      const maxPrice = query.maxPrice;
      filtered = filtered.filter((p) => p.price <= maxPrice);
    }
    if (query.inStock !== undefined) {
      filtered = filtered.filter((p) => p.inStock === query.inStock);
    }
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    filtered.sort((a, b) => {
      const aVal = a[sortBy as keyof Product];
      const bVal = b[sortBy as keyof Product];
      if (aVal === undefined || bVal === undefined) return 0;
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Apply pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    return {
      data: paginated,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };
  }

  /**
   * Find one product by ID
   */
  findOne(id: string): Product {
    const product = this.products.find((p) => p.id === id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  /**
   * Update a product (full update)
   */
  update(id: string, updateProductDto: CreateProductInput): Product {
    const product = this.findOne(id);
    Object.assign(product, updateProductDto, { updatedAt: new Date() });
    return product;
  }

  /**
   * Partially update a product
   */
  patch(id: string, patchProductDto: UpdateProductInput): Product {
    const product = this.findOne(id);
    Object.assign(product, patchProductDto, { updatedAt: new Date() });
    return product;
  }

  /**
   * Remove a product
   */
  remove(id: string): void {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    this.products.splice(index, 1);
  }

  /**
   * Find all products created by a specific user with optional filtering and pagination
   */
  findByUserId(
    userId: string,
    query: QueryProductInput
  ): {
    data: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  } {
    // First filter by userId
    let filtered = this.products.filter((p) => p.createdBy === userId);

    // Apply filters
    if (query.category) {
      filtered = filtered.filter((p) => p.category === query.category);
    }
    if (query.status) {
      filtered = filtered.filter((p) => p.status === query.status);
    }
    if (query.minPrice !== undefined) {
      const minPrice = query.minPrice;
      filtered = filtered.filter((p) => p.price >= minPrice);
    }
    if (query.maxPrice !== undefined) {
      const maxPrice = query.maxPrice;
      filtered = filtered.filter((p) => p.price <= maxPrice);
    }
    if (query.inStock !== undefined) {
      filtered = filtered.filter((p) => p.inStock === query.inStock);
    }
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    filtered.sort((a, b) => {
      const aVal = a[sortBy as keyof Product];
      const bVal = b[sortBy as keyof Product];
      if (aVal === undefined || bVal === undefined) return 0;
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Apply pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    return {
      data: paginated,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };
  }
}
