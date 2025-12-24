import { expect, test } from './fixtures';

test.describe('API Validation', () => {
  test('should return 400 for invalid email in user creation', async ({ api }) => {
    const response = await api.appControllerCreateUser({
      email: 'invalid-email',
      name: 'Test User',
    });
    const { status, data } = response as { status: number; data: any };

    expect(status).toBe(400);
    expect(data).toBeDefined();
    // Zod validation error structure: message is a string, errors is an array
    expect(data.statusCode).toBe(400);
    expect(data.message).toBe('Validation failed');
    expect(typeof data.message).toBe('string');
    expect(Array.isArray(data.errors)).toBe(true);
    expect(data.errors.length).toBeGreaterThan(0);
    // Check that error has expected structure
    expect(data.errors[0]).toHaveProperty('code');
    expect(data.errors[0]).toHaveProperty('path');
    expect(data.errors[0]).toHaveProperty('message');
  });

  test('should return 400 for missing required fields', async ({ api }) => {
    const response = await api.appControllerCreateUser({
      email: 'test@example.com',
      // name is required but missing
    } as any);
    const { status, data } = response as { status: number; data: any };

    expect(status).toBe(400);
    expect(data).toBeDefined();
    expect(data.statusCode).toBe(400);
    expect(data.message).toBe('Validation failed');
    expect(Array.isArray(data.errors)).toBe(true);
    expect(data.errors.length).toBeGreaterThan(0);
    // Should have an error for missing 'name' field
    const nameError = data.errors.find((err: { path: string[] }) => err.path.includes('name'));
    expect(nameError).toBeDefined();
  });

  test('should return 400 for invalid age (below minimum)', async ({ api }) => {
    const response = await api.appControllerCreateUser({
      email: 'test@example.com',
      name: 'Test User',
      age: 17, // Below minimum of 18
    });
    const { status, data } = response as { status: number; data: any };

    expect(status).toBe(400);
    expect(data).toBeDefined();
    expect(data.statusCode).toBe(400);
    expect(data.message).toBe('Validation failed');
    expect(Array.isArray(data.errors)).toBe(true);
    expect(data.errors.length).toBeGreaterThan(0);
    // Should have an error for 'age' field
    const ageError = data.errors.find((err: { path: string[] }) => err.path.includes('age'));
    expect(ageError).toBeDefined();
  });

  test('should return 201 for valid user creation', async ({ api }) => {
    const response = await api.appControllerCreateUser({
      email: 'test@example.com',
      name: 'Test User',
      age: 25,
    });
    const { status, data } = response as { status: number; data: any };

    expect(status).toBe(201);
    expect(data).toBeDefined();
    expect(data.message).toBe('User created successfully');
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe('test@example.com');
    expect(data.user.name).toBe('Test User');
  });
});
