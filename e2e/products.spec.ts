import { expect, test } from './fixtures';

/**
 * E2E tests for Products module
 * Tests validation, body parser, authorization, error handling, and functionality
 */
test.describe('Products Module', () => {
  const validProductData = {
    name: 'Test Product',
    description: 'This is a test product description',
    price: 99.99,
    currency: 'USD' as const,
    category: 'electronics' as const,
    status: 'active' as const,
    inStock: true,
    stockQuantity: 100,
    tags: ['test', 'demo'],
    imageUrl: 'https://example.com/image.jpg',
    discountPercentage: 10,
    metadata: {
      brand: 'Test Brand',
      manufacturer: 'Test Manufacturer',
      sku: 'TEST-001',
      dimensions: {
        width: 10,
        height: 20,
        depth: 5,
      },
    },
  };

  test.describe('Validation', () => {
    test('should return 201 for valid product creation', async ({ useAuthenticatedApi }) => {
      const { api } = await useAuthenticatedApi();

      const response = await api.productsControllerCreate(validProductData);

      expect(response.status).toBe(201);
      expect(response.data).toBeDefined();
      expect(response.data.message).toBe('Product created successfully');
      expect(response.data.product).toBeDefined();
      expect(response.data.product.name).toBe(validProductData.name);
      expect(response.data.product.price).toBe(validProductData.price);
      expect(response.data.product.createdBy).toBeDefined();
      expect(typeof response.data.product.createdBy).toBe('string');
    });

    test('should return 400 for missing required fields', async ({ useAuthenticatedApi }) => {
      const { api } = await useAuthenticatedApi();

      const response = await api.productsControllerCreate({
        // name is required but missing
        price: 99.99,
      } as any);

      expect(response.status).toBe(400);
      // biome-ignore lint/suspicious/noExplicitAny: Error response type varies
      const data = response.data as any;
      expect(data.statusCode).toBe(400);
      expect(data.message).toBe('Validation failed');
      expect(Array.isArray(data.errors)).toBe(true);
      const nameError = data.errors.find((err: { path: string[] }) => err.path.includes('name'));
      expect(nameError).toBeDefined();
    });

    test('should return 400 for invalid name (too short)', async ({ useAuthenticatedApi }) => {
      const { api } = await useAuthenticatedApi();

      const response = await api.productsControllerCreate({
        name: 'A', // Too short (min 2)
        price: 99.99,
        category: 'electronics',
      } as any);

      expect(response.status).toBe(400);
      // biome-ignore lint/suspicious/noExplicitAny: Error response type varies
      const data = response.data as any;
      const nameError = data.errors.find((err: { path: string[] }) => err.path.includes('name'));
      expect(nameError).toBeDefined();
    });

    test('should return 400 for invalid price (negative)', async ({ useAuthenticatedApi }) => {
      const { api } = await useAuthenticatedApi();

      const response = await api.productsControllerCreate({
        name: 'Test Product',
        price: -10, // Negative price
        category: 'electronics',
      } as any);

      expect(response.status).toBe(400);
      // biome-ignore lint/suspicious/noExplicitAny: Error response type varies
      const data = response.data as any;
      const priceError = data.errors.find((err: { path: string[] }) => err.path.includes('price'));
      expect(priceError).toBeDefined();
    });

    test('should return 400 for invalid category (not in enum)', async ({
      useAuthenticatedApi,
    }) => {
      const { api } = await useAuthenticatedApi();

      const response = await api.productsControllerCreate({
        name: 'Test Product',
        price: 99.99,
        category: 'invalid-category', // Not in enum
      } as any);

      expect(response.status).toBe(400);
      // biome-ignore lint/suspicious/noExplicitAny: Error response type varies
      const data = response.data as any;
      const categoryError = data.errors.find((err: { path: string[] }) =>
        err.path.includes('category')
      );
      expect(categoryError).toBeDefined();
    });

    test('should return 400 for invalid imageUrl (not a URL)', async ({ useAuthenticatedApi }) => {
      const { api } = await useAuthenticatedApi();

      const response = await api.productsControllerCreate({
        name: 'Test Product',
        price: 99.99,
        category: 'electronics',
        imageUrl: 'not-a-url', // Invalid URL
      } as any);

      expect(response.status).toBe(400);
      // biome-ignore lint/suspicious/noExplicitAny: Error response type varies
      const data = response.data as any;
      const imageUrlError = data.errors.find((err: { path: string[] }) =>
        err.path.includes('imageUrl')
      );
      expect(imageUrlError).toBeDefined();
    });

    test('should return 400 for invalid tags (too many)', async ({ useAuthenticatedApi }) => {
      const { api } = await useAuthenticatedApi();

      const response = await api.productsControllerCreate({
        name: 'Test Product',
        price: 99.99,
        category: 'electronics',
        tags: Array(11).fill('tag'), // Too many (max 10)
      } as any);

      expect(response.status).toBe(400);
      // biome-ignore lint/suspicious/noExplicitAny: Error response type varies
      const data = response.data as any;
      const tagsError = data.errors.find((err: { path: string[] }) => err.path.includes('tags'));
      expect(tagsError).toBeDefined();
    });

    test('should return 400 for invalid nested object (metadata.dimensions)', async ({
      useAuthenticatedApi,
    }) => {
      const { api } = await useAuthenticatedApi();

      const response = await api.productsControllerCreate({
        name: 'Test Product',
        price: 99.99,
        category: 'electronics',
        metadata: {
          dimensions: {
            width: -10, // Negative value
            height: 20,
            depth: 5,
          },
        },
      } as any);

      expect(response.status).toBe(400);
      // biome-ignore lint/suspicious/noExplicitAny: Error response type varies
      const data = response.data as any;
      const dimensionsError = data.errors.find((err: { path: string[] }) =>
        err.path.includes('dimensions')
      );
      expect(dimensionsError).toBeDefined();
    });

    test('should return 400 for invalid query parameters', async ({ useApi }) => {
      const api = await useApi();

      const response = await api.productsControllerFindAll({
        page: -1, // Invalid (min 1)
        limit: 200, // Invalid (max 100)
      });

      expect(response.status).toBe(400);
      // biome-ignore lint/suspicious/noExplicitAny: Error response type varies
      const data = response.data as any;
      expect(data.statusCode).toBe(400);
    });

    test('should return 400 for invalid sortBy in query', async ({ useApi }) => {
      const api = await useApi();

      const response = await api.productsControllerFindAll({
        sortBy: 'invalid-field' as any, // Not in enum
      });

      expect(response.status).toBe(400);
    });
  });

  test.describe('Body Parser', () => {
    test('should parse JSON body correctly in POST request', async ({ useAuthenticatedApi }) => {
      const { api } = await useAuthenticatedApi();

      const response = await api.productsControllerCreate(validProductData);

      expect(response.status).toBe(201);
      expect(response.data.product).toBeDefined();
      expect(typeof response.data.product.price).toBe('number');
      expect(response.data.product.price).toBe(99.99);
    });

    test('should parse JSON body correctly in PUT request', async ({ useAuthenticatedApi }) => {
      const { api } = await useAuthenticatedApi();

      // First create a product
      const createResponse = await api.productsControllerCreate(validProductData);
      const productId = createResponse.data.product.id;

      // Then update it
      const updateData = {
        ...validProductData,
        name: 'Updated Product',
        price: 149.99,
      };

      const response = await api.productsControllerUpdate(productId, updateData);

      expect(response.status).toBe(200);
      expect(response.data.product.name).toBe('Updated Product');
      expect(typeof response.data.product.price).toBe('number');
      expect(response.data.product.price).toBe(149.99);
    });

    test('should parse JSON body correctly in PATCH request', async ({ useAuthenticatedApi }) => {
      const { api } = await useAuthenticatedApi();

      // First create a product
      const createResponse = await api.productsControllerCreate(validProductData);
      const productId = createResponse.data.product.id;

      // Then partially update it
      const response = await api.productsControllerPatch(productId, {
        name: 'Patched Product',
        price: 199.99,
      });

      expect(response.status).toBe(200);
      expect(response.data.product.name).toBe('Patched Product');
      expect(typeof response.data.product.price).toBe('number');
      expect(response.data.product.price).toBe(199.99);
    });
  });

  test.describe('Authorization', () => {
    test('should return 401 for POST without authentication', async ({ useApi }) => {
      const api = await useApi();

      const response = await api.productsControllerCreate(validProductData);

      expect(response.status).toBe(401);
    });

    test('should return 401 for PUT without authentication', async ({ useApi }) => {
      const api = await useApi();

      const response = await api.productsControllerUpdate('123', validProductData);

      expect(response.status).toBe(401);
    });

    test('should return 401 for PATCH without authentication', async ({ useApi }) => {
      const api = await useApi();

      const response = await api.productsControllerPatch('123', { name: 'Updated' });

      expect(response.status).toBe(401);
    });

    test('should return 401 for DELETE without authentication', async ({ useApi }) => {
      const api = await useApi();

      const response = await api.productsControllerRemove('123');

      expect(response.status).toBe(401);
    });

    test('should allow GET without authentication', async ({ useApi }) => {
      const api = await useApi();

      const response = await api.productsControllerFindAll();

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.data).toBeDefined();
      expect(response.data.pagination).toBeDefined();
    });

    test('should allow GET by ID without authentication', async ({
      useApi,
      useAuthenticatedApi,
    }) => {
      const { api: authApi } = await useAuthenticatedApi();

      // First create a product
      const createResponse = await authApi.productsControllerCreate(validProductData);
      const productId = createResponse.data.product.id;

      // Then get it without authentication
      const api = await useApi();
      const response = await api.productsControllerFindOne(productId);

      expect(response.status).toBe(200);
      expect(response.data.product).toBeDefined();
    });

    test('should allow POST with authentication', async ({ useAuthenticatedApi }) => {
      const { api } = await useAuthenticatedApi();

      const response = await api.productsControllerCreate(validProductData);

      expect(response.status).toBe(201);
    });
  });

  test.describe('Error Handling', () => {
    test('should return 404 for non-existent product', async ({ useApi }) => {
      const api = await useApi();

      const response = await api.productsControllerFindOne('non-existent-id');

      expect(response.status).toBe(404);
    });

    test('should return 404 for updating non-existent product', async ({ useAuthenticatedApi }) => {
      const { api } = await useAuthenticatedApi();

      const response = await api.productsControllerUpdate('non-existent-id', validProductData);

      expect(response.status).toBe(404);
    });

    test('should return 404 for deleting non-existent product', async ({ useAuthenticatedApi }) => {
      const { api } = await useAuthenticatedApi();

      const response = await api.productsControllerRemove('non-existent-id');

      expect(response.status).toBe(404);
    });

    test('should return 400 for invalid data', async ({ useAuthenticatedApi }) => {
      const { api } = await useAuthenticatedApi();

      const response = await api.productsControllerCreate({
        name: 'A', // Too short
        price: -10, // Negative
      } as any);

      expect(response.status).toBe(400);
      // biome-ignore lint/suspicious/noExplicitAny: Error response type varies
      const data = response.data as any;
      expect(data.statusCode).toBe(400);
    });
  });

  test.describe('Functionality', () => {
    test('should return only current user products from /products/mine', async ({
      useAuthenticatedApi,
    }) => {
      // Create two separate authenticated users
      const { api: api1 } = await useAuthenticatedApi({ name: 'User 1' });
      const { api: api2 } = await useAuthenticatedApi({ name: 'User 2' });

      // User 1 creates a product
      await api1.productsControllerCreate({
        ...validProductData,
        name: 'User 1 Product',
      });

      // User 2 creates a product
      await api2.productsControllerCreate({
        ...validProductData,
        name: 'User 2 Product',
      });

      // User 1 should only see their own product
      const user1Response = await api1.productsControllerGetMine();

      expect(user1Response.status).toBe(200);
      expect(user1Response.data.data).toBeDefined();
      expect(Array.isArray(user1Response.data.data)).toBe(true);
      expect(user1Response.data.data.length).toBe(1);
      expect(user1Response.data.data[0].name).toBe('User 1 Product');
      expect(user1Response.data.pagination.total).toBe(1);

      // User 2 should only see their own product
      const user2Response = await api2.productsControllerGetMine();

      expect(user2Response.status).toBe(200);
      expect(user2Response.data.data.length).toBe(1);
      expect(user2Response.data.data[0].name).toBe('User 2 Product');
      expect(user2Response.data.pagination.total).toBe(1);
    });

    test('should create, read, update, and delete a product', async ({
      useApi,
      useAuthenticatedApi,
    }) => {
      const { api } = await useAuthenticatedApi();

      // Create
      const createResponse = await api.productsControllerCreate(validProductData);
      expect(createResponse.status).toBe(201);
      const productId = createResponse.data.product.id;

      // Read
      const unauthApi = await useApi();
      const getResponse = await unauthApi.productsControllerFindOne(productId);
      expect(getResponse.status).toBe(200);
      expect(getResponse.data.product.id).toBe(productId);

      // Update
      const updateResponse = await api.productsControllerUpdate(productId, {
        ...validProductData,
        name: 'Updated Product',
      });
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.product.name).toBe('Updated Product');

      // Delete
      const deleteResponse = await api.productsControllerRemove(productId);
      expect(deleteResponse.status).toBe(204);

      // Verify deleted
      const getDeletedResponse = await unauthApi.productsControllerFindOne(productId);
      expect(getDeletedResponse.status).toBe(404);
    });

    test('should filter products by category', async ({ useApi, useAuthenticatedApi }) => {
      const { api } = await useAuthenticatedApi();

      // Create products with different categories
      await api.productsControllerCreate({
        ...validProductData,
        name: 'Electronics Product',
        category: 'electronics',
      });

      await api.productsControllerCreate({
        ...validProductData,
        name: 'Clothing Product',
        category: 'clothing',
      });

      // Filter by category
      const unauthApi = await useApi();
      const response = await unauthApi.productsControllerFindAll({
        category: 'electronics',
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
      expect(response.data.data.every((p: any) => p.category === 'electronics')).toBe(true);
    });

    test('should filter products by status', async ({ useApi, useAuthenticatedApi }) => {
      const { api } = await useAuthenticatedApi();

      // Create products with different statuses
      await api.productsControllerCreate({
        ...validProductData,
        name: 'Active Product',
        status: 'active',
      });

      await api.productsControllerCreate({
        ...validProductData,
        name: 'Draft Product',
        status: 'draft',
      });

      // Filter by status
      const unauthApi = await useApi();
      const response = await unauthApi.productsControllerFindAll({
        status: 'active',
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
      expect(response.data.data.every((p: any) => p.status === 'active')).toBe(true);
    });

    test('should filter products by price range', async ({ useApi, useAuthenticatedApi }) => {
      const { api } = await useAuthenticatedApi();

      // Create products with different prices
      await api.productsControllerCreate({
        ...validProductData,
        name: 'Cheap Product',
        price: 10,
      });

      await api.productsControllerCreate({
        ...validProductData,
        name: 'Expensive Product',
        price: 1000,
      });

      // Filter by price range
      const unauthApi = await useApi();
      const response = await unauthApi.productsControllerFindAll({
        minPrice: 50,
        maxPrice: 500,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
      expect(response.data.data.every((p: any) => p.price >= 50 && p.price <= 500)).toBe(true);
    });

    test('should search products by name', async ({ useApi, useAuthenticatedApi }) => {
      const { api } = await useAuthenticatedApi();

      // Create products
      await api.productsControllerCreate({
        ...validProductData,
        name: 'Unique Search Term Product',
      });

      await api.productsControllerCreate({
        ...validProductData,
        name: 'Another Product',
      });

      // Search
      const unauthApi = await useApi();
      const response = await unauthApi.productsControllerFindAll({
        search: 'Unique Search Term',
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
      expect(response.data.data.some((p: any) => p.name.includes('Unique Search Term'))).toBe(true);
    });

    test('should sort products', async ({ useApi, useAuthenticatedApi }) => {
      const { api } = await useAuthenticatedApi();

      // Create products with different prices
      await api.productsControllerCreate({
        ...validProductData,
        name: 'Product A',
        price: 100,
      });

      await api.productsControllerCreate({
        ...validProductData,
        name: 'Product B',
        price: 50,
      });

      // Sort by price ascending
      const unauthApi = await useApi();
      const response = await unauthApi.productsControllerFindAll({
        sortBy: 'price',
        sortOrder: 'asc',
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
      const prices = response.data.data.map((p: any) => p.price);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });

    test('should paginate products', async ({ useApi, useAuthenticatedApi }) => {
      const { api } = await useAuthenticatedApi();

      // Create multiple products
      for (let i = 0; i < 5; i++) {
        await api.productsControllerCreate({
          ...validProductData,
          name: `Product ${i}`,
        });
      }

      // Get first page
      const unauthApi = await useApi();
      const page1Response = await unauthApi.productsControllerFindAll({
        page: 1,
        limit: 2,
      });

      expect(page1Response.status).toBe(200);
      expect(page1Response.data.data.length).toBeLessThanOrEqual(2);
      expect(page1Response.data.pagination.page).toBe(1);
      expect(page1Response.data.pagination.limit).toBe(2);

      // Get second page
      const page2Response = await unauthApi.productsControllerFindAll({
        page: 2,
        limit: 2,
      });

      expect(page2Response.status).toBe(200);
      expect(page2Response.data.pagination.page).toBe(2);
    });
  });
});
