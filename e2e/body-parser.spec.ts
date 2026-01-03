import { expect, test } from './fixtures';

/**
 * E2E tests to verify that body parser works correctly with bodyParser: false
 *
 * When bodyParser: false is set in NestJS, Express's default JSON/urlencoded parsers
 * are removed. Better Auth should re-add JSON parser, and we need to verify that:
 * 1. POST/PUT/PATCH requests with JSON bodies work correctly
 * 2. @Body() decorator receives parsed data (not undefined or raw string)
 * 3. JSON strings are parsed into objects (proves bodyParser middleware is applied)
 * 4. Validation still works correctly
 *
 * These tests guarantee that bodyParser is applied because:
 * - If bodyParser was NOT applied, req.body would be undefined or raw Buffer/string
 * - @Body() would receive undefined, causing validation to fail
 * - JSON strings would not be parsed into objects (numbers would remain strings)
 * - All these tests would fail if bodyParser wasn't working
 */
test.describe('Body Parser with bodyParser: false', () => {
  const validUserData = {
    email: 'test@example.com',
    name: 'Test User',
    age: 25,
  };

  test.describe('POST requests', () => {
    test('should parse JSON body correctly in POST request', async ({ http }) => {
      const response = await http.post('/users', validUserData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status !== 201) {
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
      }

      expect(response.status).toBe(201);
      expect(response.data).toBeDefined();
      expect(response.data.message).toBe('User created successfully');
      expect(response.data.user).toBeDefined();
      expect(response.data.user.email).toBe(validUserData.email);
      expect(response.data.user.name).toBe(validUserData.name);
      expect(response.data.user.age).toBe(validUserData.age);
    });

    test('should not receive undefined body in POST request', async ({ http }) => {
      // This test ensures that @Body() decorator receives actual data, not undefined
      const response = await http.post('/users', validUserData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status !== 201) {
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
      }

      expect(response.status).toBe(201);
      // If body was undefined, validation would fail or we'd get an error
      expect(response.data.user).toBeDefined();
      expect(response.data.user.email).toBe(validUserData.email);
    });

    test('should parse JSON string into object (proves bodyParser is applied)', async ({
      http,
    }) => {
      // This test explicitly verifies that bodyParser middleware is working.
      // If bodyParser was NOT applied, the body would remain as a raw string/Buffer,
      // and @Body() would receive undefined or a string, not a parsed object.
      // The fact that we receive a properly typed object with number fields (age)
      // proves that JSON parsing happened.
      const response = await http.post('/users', validUserData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status !== 201) {
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
      }

      expect(response.status).toBe(201);
      // Verify that age is a number, not a string - this proves JSON parsing occurred
      expect(typeof response.data.user.age).toBe('number');
      expect(response.data.user.age).toBe(25);
      // Verify that nested object structure is preserved (proves it's not a string)
      expect(response.data.user).toEqual(
        expect.objectContaining({
          email: expect.any(String),
          name: expect.any(String),
          age: expect.any(Number),
        })
      );
    });

    test('should validate JSON body in POST request', async ({ http }) => {
      const invalidData = {
        email: 'invalid-email', // Invalid email format
        name: 'A', // Too short (min 2)
      };

      const response = await http.post('/users', invalidData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(400);
      expect(response.data).toBeDefined();
      expect(response.data.statusCode).toBe(400);
      expect(response.data.message).toBe('Validation failed');
      expect(Array.isArray(response.data.errors)).toBe(true);
      expect(response.data.errors.length).toBeGreaterThan(0);
    });
  });

  test.describe('PUT requests', () => {
    test('should parse JSON body correctly in PUT request', async ({ http }) => {
      const response = await http.put('/users/123', validUserData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.message).toBe('User updated successfully');
      expect(response.data.user).toBeDefined();
      expect(response.data.user.email).toBe(validUserData.email);
      expect(response.data.user.name).toBe(validUserData.name);
      expect(response.data.user.age).toBe(validUserData.age);
    });

    test('should not receive undefined body in PUT request', async ({ http }) => {
      const response = await http.put('/users/123', validUserData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.user).toBeDefined();
      expect(response.data.user.email).toBe(validUserData.email);
    });

    test('should validate JSON body in PUT request', async ({ http }) => {
      const invalidData = {
        email: 'not-an-email',
        name: 'X', // Too short
        age: 15, // Below minimum
      };

      const response = await http.put('/users/123', invalidData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(400);
      expect(response.data.statusCode).toBe(400);
      expect(response.data.message).toBe('Validation failed');
      expect(Array.isArray(response.data.errors)).toBe(true);
    });
  });

  test.describe('PATCH requests', () => {
    test('should parse JSON body correctly in PATCH request', async ({ http }) => {
      const response = await http.patch('/users/123', validUserData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.message).toBe('User partially updated successfully');
      expect(response.data.user).toBeDefined();
      expect(response.data.user.email).toBe(validUserData.email);
      expect(response.data.user.name).toBe(validUserData.name);
      expect(response.data.user.age).toBe(validUserData.age);
    });

    test('should not receive undefined body in PATCH request', async ({ http }) => {
      const response = await http.patch('/users/123', validUserData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.user).toBeDefined();
      expect(response.data.user.email).toBe(validUserData.email);
    });
  });

  test.describe('Edge cases', () => {
    test('should handle empty JSON body', async ({ http }) => {
      const response = await http.post(
        '/users',
        {},
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Should fail validation because email and name are required
      expect(response.status).toBe(400);
      expect(response.data.statusCode).toBe(400);
    });

    test('should handle large JSON payload', async ({ http }) => {
      const largeName = 'A'.repeat(1000);
      const largeData = {
        email: 'large@example.com',
        name: largeName,
        age: 30,
      };

      const response = await http.post('/users', largeData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(201);
      expect(response.data.user.name).toBe(largeName);
    });

    test('should handle nested objects in JSON', async ({ http }) => {
      // Even though our schema doesn't support nested objects,
      // this tests that the body parser itself works
      const nestedData = {
        email: 'nested@example.com',
        name: 'Nested User',
        metadata: {
          source: 'test',
        },
      };

      const response = await http.post('/users', nestedData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Should succeed (extra fields are ignored by Zod by default)
      expect(response.status).toBe(201);
      expect(response.data.user.email).toBe(nestedData.email);
    });
  });
});
