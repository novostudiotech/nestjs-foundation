import { extractCookies } from './cookies.util';
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
    test('should return 201 for valid product creation', async ({ http, authenticatedUser }) => {
      const { cookies } = authenticatedUser;

      const response = await http.post('/products', validProductData, {
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookies,
        },
      });

      expect(response.status).toBe(201);
      expect(response.data).toBeDefined();
      expect(response.data.message).toBe('Product created successfully');
      expect(response.data.product).toBeDefined();
      expect(response.data.product.name).toBe(validProductData.name);
      expect(response.data.product.price).toBe(validProductData.price);
      expect(response.data.product.createdBy).toBeDefined();
      expect(typeof response.data.product.createdBy).toBe('string');
    });

    test('should return 400 for missing required fields', async ({ http, authenticatedUser }) => {
      const { cookies } = authenticatedUser;

      const response = await http.post(
        '/products',
        {
          // name is required but missing
          price: 99.99,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookies,
          },
        }
      );

      expect(response.status).toBe(400);
      expect(response.data.statusCode).toBe(400);
      expect(response.data.message).toBe('Validation failed');
      expect(Array.isArray(response.data.errors)).toBe(true);
      const nameError = response.data.errors.find((err: { path: string[] }) =>
        err.path.includes('name')
      );
      expect(nameError).toBeDefined();
    });

    test('should return 400 for invalid name (too short)', async ({ http, authenticatedUser }) => {
      const { cookies } = authenticatedUser;

      const response = await http.post(
        '/products',
        {
          name: 'A', // Too short (min 2)
          price: 99.99,
          category: 'electronics',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookies,
          },
        }
      );

      expect(response.status).toBe(400);
      const nameError = response.data.errors.find((err: { path: string[] }) =>
        err.path.includes('name')
      );
      expect(nameError).toBeDefined();
    });

    test('should return 400 for invalid price (negative)', async ({ http, authenticatedUser }) => {
      const { cookies } = authenticatedUser;

      const response = await http.post(
        '/products',
        {
          name: 'Test Product',
          price: -10, // Negative price
          category: 'electronics',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookies,
          },
        }
      );

      expect(response.status).toBe(400);
      const priceError = response.data.errors.find((err: { path: string[] }) =>
        err.path.includes('price')
      );
      expect(priceError).toBeDefined();
    });

    test('should return 400 for invalid category (not in enum)', async ({
      http,
      authenticatedUser,
    }) => {
      const { cookies } = authenticatedUser;

      const response = await http.post(
        '/products',
        {
          name: 'Test Product',
          price: 99.99,
          category: 'invalid-category', // Not in enum
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookies,
          },
        }
      );

      expect(response.status).toBe(400);
      const categoryError = response.data.errors.find((err: { path: string[] }) =>
        err.path.includes('category')
      );
      expect(categoryError).toBeDefined();
    });

    test('should return 400 for invalid imageUrl (not a URL)', async ({
      http,
      authenticatedUser,
    }) => {
      const { cookies } = authenticatedUser;

      const response = await http.post(
        '/products',
        {
          name: 'Test Product',
          price: 99.99,
          category: 'electronics',
          imageUrl: 'not-a-url', // Invalid URL
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookies,
          },
        }
      );

      expect(response.status).toBe(400);
      const imageUrlError = response.data.errors.find((err: { path: string[] }) =>
        err.path.includes('imageUrl')
      );
      expect(imageUrlError).toBeDefined();
    });

    test('should return 400 for invalid tags (too many)', async ({ http, authenticatedUser }) => {
      const { cookies } = authenticatedUser;

      const response = await http.post(
        '/products',
        {
          name: 'Test Product',
          price: 99.99,
          category: 'electronics',
          tags: Array(11).fill('tag'), // Too many (max 10)
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookies,
          },
        }
      );

      expect(response.status).toBe(400);
      const tagsError = response.data.errors.find((err: { path: string[] }) =>
        err.path.includes('tags')
      );
      expect(tagsError).toBeDefined();
    });

    test('should return 400 for invalid nested object (metadata.dimensions)', async ({
      http,
      authenticatedUser,
    }) => {
      const { cookies } = authenticatedUser;

      const response = await http.post(
        '/products',
        {
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
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookies,
          },
        }
      );

      expect(response.status).toBe(400);
      const dimensionsError = response.data.errors.find((err: { path: string[] }) =>
        err.path.includes('dimensions')
      );
      expect(dimensionsError).toBeDefined();
    });

    test('should return 400 for invalid query parameters', async ({ http }) => {
      const response = await http.get('/products', {
        params: {
          page: -1, // Invalid (min 1)
          limit: 200, // Invalid (max 100)
        },
      });

      expect(response.status).toBe(400);
      expect(response.data.statusCode).toBe(400);
    });

    test('should return 400 for invalid sortBy in query', async ({ http }) => {
      const response = await http.get('/products', {
        params: {
          sortBy: 'invalid-field', // Not in enum
        },
      });

      expect(response.status).toBe(400);
    });
  });

  test.describe('Body Parser', () => {
    test('should parse JSON body correctly in POST request', async ({
      http,
      authenticatedUser,
    }) => {
      const { cookies } = authenticatedUser;

      const response = await http.post('/products', validProductData, {
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookies,
        },
      });

      expect(response.status).toBe(201);
      expect(response.data.product).toBeDefined();
      expect(typeof response.data.product.price).toBe('number');
      expect(response.data.product.price).toBe(99.99);
    });

    test('should parse JSON body correctly in PUT request', async ({ http, authenticatedUser }) => {
      const { cookies } = authenticatedUser;

      // First create a product
      const createResponse = await http.post('/products', validProductData, {
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookies,
        },
      });
      const productId = createResponse.data.product.id;

      // Then update it
      const updateData = {
        ...validProductData,
        name: 'Updated Product',
        price: 149.99,
      };

      const response = await http.put(`/products/${productId}`, updateData, {
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookies,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.product.name).toBe('Updated Product');
      expect(typeof response.data.product.price).toBe('number');
      expect(response.data.product.price).toBe(149.99);
    });

    test('should parse JSON body correctly in PATCH request', async ({
      http,
      authenticatedUser,
    }) => {
      const { cookies } = authenticatedUser;

      // First create a product
      const createResponse = await http.post('/products', validProductData, {
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookies,
        },
      });
      const productId = createResponse.data.product.id;

      // Then partially update it
      const response = await http.patch(
        `/products/${productId}`,
        {
          name: 'Patched Product',
          price: 199.99,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookies,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.product.name).toBe('Patched Product');
      expect(typeof response.data.product.price).toBe('number');
      expect(response.data.product.price).toBe(199.99);
    });
  });

  test.describe('Authorization', () => {
    test('should return 401 for POST without authentication', async ({ http }) => {
      const response = await http.post('/products', validProductData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(401);
    });

    test('should return 401 for PUT without authentication', async ({ http }) => {
      const response = await http.put('/products/123', validProductData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(401);
    });

    test('should return 401 for PATCH without authentication', async ({ http }) => {
      const response = await http.patch(
        '/products/123',
        { name: 'Updated' },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBe(401);
    });

    test('should return 401 for DELETE without authentication', async ({ http }) => {
      const response = await http.delete('/products/123');

      expect(response.status).toBe(401);
    });

    test('should allow GET without authentication', async ({ http }) => {
      const response = await http.get('/products');

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.data).toBeDefined();
      expect(response.data.pagination).toBeDefined();
    });

    test('should allow GET by ID without authentication', async ({ http, authenticatedUser }) => {
      const { cookies } = authenticatedUser;

      // First create a product
      const createResponse = await http.post('/products', validProductData, {
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookies,
        },
      });
      const productId = createResponse.data.product.id;

      // Then get it without authentication
      const response = await http.get(`/products/${productId}`);

      expect(response.status).toBe(200);
      expect(response.data.product).toBeDefined();
    });

    test('should allow POST with authentication', async ({ http, authenticatedUser }) => {
      const { cookies } = authenticatedUser;

      const response = await http.post('/products', validProductData, {
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookies,
        },
      });

      expect(response.status).toBe(201);
    });
  });

  test.describe('Error Handling', () => {
    test('should return 404 for non-existent product', async ({ http }) => {
      const response = await http.get('/products/non-existent-id');

      expect(response.status).toBe(404);
    });

    test('should return 404 for updating non-existent product', async ({
      http,
      authenticatedUser,
    }) => {
      const { cookies } = authenticatedUser;

      const response = await http.put('/products/non-existent-id', validProductData, {
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookies,
        },
      });

      expect(response.status).toBe(404);
    });

    test('should return 404 for deleting non-existent product', async ({
      http,
      authenticatedUser,
    }) => {
      const { cookies } = authenticatedUser;

      const response = await http.delete('/products/non-existent-id', {
        headers: {
          Cookie: cookies,
        },
      });

      expect(response.status).toBe(404);
    });

    test('should return 400 for invalid data', async ({ http, authenticatedUser }) => {
      const { cookies } = authenticatedUser;

      const response = await http.post(
        '/products',
        {
          name: 'A', // Too short
          price: -10, // Negative
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookies,
          },
        }
      );

      expect(response.status).toBe(400);
      expect(response.data.statusCode).toBe(400);
    });
  });

  test.describe('Functionality', () => {
    test('should return only current user products from /products/mine', async ({ http }) => {
      // Create two separate authenticated users
      const user1 = {
        email: `test-user1-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
        name: 'User 1',
        password: 'TestPassword123!',
      };
      const user2 = {
        email: `test-user2-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
        name: 'User 2',
        password: 'TestPassword123!',
      };

      await http.post('/auth/sign-up/email', user1);
      const signIn1Response = await http.post('/auth/sign-in/email', {
        email: user1.email,
        password: user1.password,
      });
      const user1Cookies = extractCookies(signIn1Response.headers) || '';

      await http.post('/auth/sign-up/email', user2);
      const signIn2Response = await http.post('/auth/sign-in/email', {
        email: user2.email,
        password: user2.password,
      });
      const user2Cookies = extractCookies(signIn2Response.headers) || '';

      // User 1 creates a product
      await http.post(
        '/products',
        {
          ...validProductData,
          name: 'User 1 Product',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: user1Cookies,
          },
        }
      );

      // User 2 creates a product
      await http.post(
        '/products',
        {
          ...validProductData,
          name: 'User 2 Product',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: user2Cookies,
          },
        }
      );

      // User 1 should only see their own product
      const user1Response = await http.get('/products/mine', {
        headers: {
          Cookie: user1Cookies,
        },
      });

      expect(user1Response.status).toBe(200);
      expect(user1Response.data.data).toBeDefined();
      expect(Array.isArray(user1Response.data.data)).toBe(true);
      expect(user1Response.data.data.length).toBe(1);
      expect(user1Response.data.data[0].name).toBe('User 1 Product');
      expect(user1Response.data.pagination.total).toBe(1);

      // User 2 should only see their own product
      const user2Response = await http.get('/products/mine', {
        headers: {
          Cookie: user2Cookies,
        },
      });

      expect(user2Response.status).toBe(200);
      expect(user2Response.data.data.length).toBe(1);
      expect(user2Response.data.data[0].name).toBe('User 2 Product');
      expect(user2Response.data.pagination.total).toBe(1);
    });

    test('should create, read, update, and delete a product', async ({
      http,
      authenticatedUser,
    }) => {
      const { cookies } = authenticatedUser;

      // Create
      const createResponse = await http.post('/products', validProductData, {
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookies,
        },
      });
      expect(createResponse.status).toBe(201);
      const productId = createResponse.data.product.id;

      // Read
      const getResponse = await http.get(`/products/${productId}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.data.product.id).toBe(productId);

      // Update
      const updateResponse = await http.put(
        `/products/${productId}`,
        {
          ...validProductData,
          name: 'Updated Product',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookies,
          },
        }
      );
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.product.name).toBe('Updated Product');

      // Delete
      const deleteResponse = await http.delete(`/products/${productId}`, {
        headers: {
          Cookie: cookies,
        },
      });
      expect(deleteResponse.status).toBe(204);

      // Verify deleted
      const getDeletedResponse = await http.get(`/products/${productId}`);
      expect(getDeletedResponse.status).toBe(404);
    });

    test('should filter products by category', async ({ http, authenticatedUser }) => {
      const { cookies } = authenticatedUser;

      // Create products with different categories
      await http.post(
        '/products',
        {
          ...validProductData,
          name: 'Electronics Product',
          category: 'electronics',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookies,
          },
        }
      );

      await http.post(
        '/products',
        {
          ...validProductData,
          name: 'Clothing Product',
          category: 'clothing',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookies,
          },
        }
      );

      // Filter by category
      const response = await http.get('/products', {
        params: {
          category: 'electronics',
        },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
      expect(response.data.data.every((p: any) => p.category === 'electronics')).toBe(true);
    });

    test('should filter products by status', async ({ http, authenticatedUser }) => {
      const { cookies } = authenticatedUser;

      // Create products with different statuses
      await http.post(
        '/products',
        {
          ...validProductData,
          name: 'Active Product',
          status: 'active',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookies,
          },
        }
      );

      await http.post(
        '/products',
        {
          ...validProductData,
          name: 'Draft Product',
          status: 'draft',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookies,
          },
        }
      );

      // Filter by status
      const response = await http.get('/products', {
        params: {
          status: 'active',
        },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
      expect(response.data.data.every((p: any) => p.status === 'active')).toBe(true);
    });

    test('should filter products by price range', async ({ http, authenticatedUser }) => {
      const { cookies } = authenticatedUser;

      // Create products with different prices
      await http.post(
        '/products',
        {
          ...validProductData,
          name: 'Cheap Product',
          price: 10,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookies,
          },
        }
      );

      await http.post(
        '/products',
        {
          ...validProductData,
          name: 'Expensive Product',
          price: 1000,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookies,
          },
        }
      );

      // Filter by price range
      const response = await http.get('/products', {
        params: {
          minPrice: 50,
          maxPrice: 500,
        },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
      expect(response.data.data.every((p: any) => p.price >= 50 && p.price <= 500)).toBe(true);
    });

    test('should search products by name', async ({ http, authenticatedUser }) => {
      const { cookies } = authenticatedUser;

      // Create products
      await http.post(
        '/products',
        {
          ...validProductData,
          name: 'Unique Search Term Product',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookies,
          },
        }
      );

      await http.post(
        '/products',
        {
          ...validProductData,
          name: 'Another Product',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookies,
          },
        }
      );

      // Search
      const response = await http.get('/products', {
        params: {
          search: 'Unique Search Term',
        },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
      expect(response.data.data.some((p: any) => p.name.includes('Unique Search Term'))).toBe(true);
    });

    test('should sort products', async ({ http, authenticatedUser }) => {
      const { cookies } = authenticatedUser;

      // Create products with different prices
      await http.post(
        '/products',
        {
          ...validProductData,
          name: 'Product A',
          price: 100,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookies,
          },
        }
      );

      await http.post(
        '/products',
        {
          ...validProductData,
          name: 'Product B',
          price: 50,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookies,
          },
        }
      );

      // Sort by price ascending
      const response = await http.get('/products', {
        params: {
          sortBy: 'price',
          sortOrder: 'asc',
        },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
      const prices = response.data.data.map((p: any) => p.price);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });

    test('should paginate products', async ({ http, authenticatedUser }) => {
      const { cookies } = authenticatedUser;

      // Create multiple products
      for (let i = 0; i < 5; i++) {
        await http.post(
          '/products',
          {
            ...validProductData,
            name: `Product ${i}`,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Cookie: cookies,
            },
          }
        );
      }

      // Get first page
      const page1Response = await http.get('/products', {
        params: {
          page: 1,
          limit: 2,
        },
      });

      expect(page1Response.status).toBe(200);
      expect(page1Response.data.data.length).toBeLessThanOrEqual(2);
      expect(page1Response.data.pagination.page).toBe(1);
      expect(page1Response.data.pagination.limit).toBe(2);

      // Get second page
      const page2Response = await http.get('/products', {
        params: {
          page: 2,
          limit: 2,
        },
      });

      expect(page2Response.status).toBe(200);
      expect(page2Response.data.pagination.page).toBe(2);
    });
  });
});
