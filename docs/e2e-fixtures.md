# E2E Test Fixtures

This document describes the available test fixtures for working with API clients in E2E tests, inspired by React hooks pattern.

## Overview

The project provides hook-style fixtures for testing API endpoints with automatic cookie/session management:

- **`useHttp()`** - Direct axios instance access
- **`useApi()`** - Unauthenticated API client instance
- **`useAuthenticatedApi(userData?)`** - Pre-authenticated API client with user session

All fixtures provide complete session isolation and automatic cookie management.

## Available Hooks

### `useHttp()`
Returns a configured axios instance for direct HTTP requests.

```typescript
const http = useHttp();
// Returns: AxiosInstance
```

**Use cases:**
- Direct HTTP requests to non-API endpoints
- Custom request configuration
- Testing middleware, redirects, etc.

### `useApi()`
Returns a typed API client instance without authentication.

```typescript
const api = await useApi();
// Returns: Promise<ApiClient>
```

**Use cases:**
- Testing public endpoints
- Manual authentication workflows
- Testing unauthenticated API behavior

### `useAuthenticatedApi(userData?)`
Returns a typed API client instance with automatic user authentication.

```typescript
const { api, user } = await useAuthenticatedApi();
// Returns: Promise<{ api: ApiClient; user: TestUser }>

const { api, user } = await useAuthenticatedApi({ name: 'Custom User' });
// Returns: Promise<{ api: ApiClient; user: TestUser }>
```

**Use cases:**
- Testing protected endpoints
- Multi-user scenarios
- Testing user-specific functionality

## Usage Examples

### HTTP Client (`useHttp` hook)

Use this hook when you need direct access to axios instance for custom HTTP requests:

```typescript
import { expect, test } from './fixtures';

test('should access public endpoint', async ({ useHttp }) => {
  const http = useHttp();
  const response = await http.get('/health');
  expect(response.status).toBe(200);
});

test('should serve Swagger JSON', async ({ useHttp }) => {
  const http = useHttp();
  const response = await http.get('/docs-json');
  expect(response.status).toBe(200);
  expect(response.data.info.title).toBeDefined();
});
```

### Unauthenticated API Client (`useApi` hook)

Use this hook when you need an API client instance without authentication:

```typescript
import { expect, test } from './fixtures';

test('should access public endpoint', async ({ useApi }) => {
  const api = await useApi();
  const response = await api.healthControllerCheck();
  expect(response.status).toBe(200);
});

test('should register and sign in manually', async ({ useApi }) => {
  const api = await useApi();

  const user = {
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    password: 'Password123!',
  };

  // Register
  await api.signUpWithEmailAndPassword({
    email: user.email,
    name: user.name,
    password: user.password,
  });

  // Sign in
  await api.signInEmail({
    email: user.email,
    password: user.password,
  });

  // Now authenticated
  const session = await api.getSession();
  expect(session.data?.user.email).toBe(user.email);
});
```

### Authenticated API Client (`useAuthenticatedApi` hook)

Use this hook when you need to test protected routes with automatic user authentication:

```typescript
import { expect, test } from './fixtures';

test('should access protected route', async ({ useAuthenticatedApi }) => {
  const { api, user } = await useAuthenticatedApi();

  // User is already authenticated
  const session = await api.getSession();
  expect(session.data?.user.email).toBe(user.email);
  expect(session.data?.user.name).toBe(user.name);
});

test('should create product as authenticated user', async ({ useAuthenticatedApi }) => {
  const { api } = await useAuthenticatedApi();

  const response = await api.productsControllerCreate({
    name: 'Test Product',
    price: 99.99,
    category: 'electronics',
  });

  expect(response.status).toBe(201);
});

test('should create product with custom user data', async ({ useAuthenticatedApi }) => {
  const { api, user } = await useAuthenticatedApi({
    name: 'Custom User',
    email: 'custom@example.com'
  });

  const session = await api.getSession();
  expect(user.name).toBe('Custom User');
  expect(session.data?.user.name).toBe('Custom User');
});
```

### Multiple API Client Instances

#### Using `useAuthenticatedApi` (Recommended)

The easiest way to test multi-user scenarios:

```typescript
import { expect, test } from './fixtures';

test('should maintain separate sessions', async ({ useAuthenticatedApi }) => {
  // Create two pre-authenticated users
  const { api: api1, user: user1 } = await useAuthenticatedApi({ name: 'User 1' });
  const { api: api2, user: user2 } = await useAuthenticatedApi({ name: 'User 2' });

  // Each client is already authenticated
  const session1 = await api1.getSession();
  const session2 = await api2.getSession();

  expect(session1.data?.user.email).toBe(user1.email);
  expect(session2.data?.user.email).toBe(user2.email);
  expect(session1.data?.user.name).toBe('User 1');
  expect(session2.data?.user.name).toBe('User 2');
});

test('should test user isolation', async ({ useAuthenticatedApi, useApi }) => {
  // Create authenticated user
  const { api: authApi, user } = await useAuthenticatedApi();

  // Create product as authenticated user
  const createResponse = await authApi.productsControllerCreate({
    name: 'My Product',
    price: 99.99,
    category: 'electronics',
  });
  expect(createResponse.status).toBe(201);

  const productId = createResponse.data.product.id;

  // Try to access with unauthenticated client
  const publicApi = await useApi();
  const publicResponse = await publicApi.productsControllerFindOne(productId);
  expect(publicResponse.status).toBe(200); // Public read access

  // Try to delete with unauthenticated client (should fail)
  const deleteResponse = await publicApi.productsControllerRemove(productId);
  expect(deleteResponse.status).toBe(401); // Requires authentication
});
```

#### Using `useApi` (Manual Authentication)

For more control over the authentication process:

```typescript
import { expect, test } from './fixtures';

test('should maintain separate sessions', async ({ useApi }) => {
  const api1 = await useApi();
  const api2 = await useApi();

  // Register and sign in user1
  await api1.signUpWithEmailAndPassword({
    email: 'user1@test.com',
    name: 'User 1',
    password: 'Pass1!',
  });
  await api1.signInEmail({ email: 'user1@test.com', password: 'Pass1!' });

  // Register and sign in user2
  await api2.signUpWithEmailAndPassword({
    email: 'user2@test.com',
    name: 'User 2',
    password: 'Pass2!',
  });
  await api2.signInEmail({ email: 'user2@test.com', password: 'Pass2!' });

  // Each client maintains its own session
  const session1 = await api1.getSession();
  const session2 = await api2.getSession();

  expect(session1.data?.user.email).toBe('user1@test.com');
  expect(session2.data?.user.email).toBe('user2@test.com');
});
```

## Key Features

### Automatic Cookie Management

Each API client instance automatically:
- Extracts cookies from response headers
- Stores cookies in memory
- Sends cookies with subsequent requests
- Maintains isolated sessions per instance

### Type Safety

All API methods are fully typed based on the OpenAPI specification:

```typescript
// With authenticated API hook
test('typed API usage', async ({ useAuthenticatedApi }) => {
  const { api, user } = await useAuthenticatedApi();

  // TypeScript knows the exact shape of request/response
  const response = await api.signInEmail({
    email: 'test@example.com',  // ✓ Required
    password: 'password',        // ✓ Required
    // rememberMe: true,         // ✓ Optional
  });

  // Response is typed
  if (response.data) {
    const email = response.data.user.email; // ✓ Type-safe
  }

  // User object is also typed
  expect(user.email).toBeDefined(); // ✓ TestUser type
  expect(user.name).toBeDefined();  // ✓ TestUser type
});

// With unauthenticated API hook
test('public API usage', async ({ useApi }) => {
  const api = await useApi();

  const response = await api.healthControllerCheck();
  // Response type is inferred from OpenAPI spec
  expect(response.status).toBe(200);
});
```

### Session Isolation

Each API client instance has its own cookie jar, ensuring complete session isolation:

```typescript
const api1 = createApiClient();
const api2 = createApiClient();

// api1 and api2 have completely separate sessions
// Signing in with api1 does NOT affect api2
```

## Migration from Legacy Approach

### From Factory Functions to Hooks

**Before (factory functions):**
```typescript
test('old way', async ({ createApi, createAuthenticatedApi }) => {
  // Unauthenticated
  const api = createApi();

  // Authenticated
  const { api: authApi, user } = await createAuthenticatedApi();

  const response = await authApi.getSession();
  expect(response.status).toBe(200);
});
```

**After (hooks):**
```typescript
test('new way', async ({ useApi, useAuthenticatedApi }) => {
  // Unauthenticated
  const api = await useApi();

  // Authenticated
  const { api: authApi, user } = await useAuthenticatedApi();

  const response = await authApi.getSession();
  expect(response.status).toBe(200);
});
```

### From `http` + `authenticatedUser` to `useAuthenticatedApi`

**Before (legacy):**
```typescript
test('old way', async ({ http, authenticatedUser }) => {
  const { cookies } = authenticatedUser;

  const response = await http.get('/auth/get-session', {
    headers: { Cookie: cookies },
  });

  expect(response.status).toBe(200);
});
```

**After (recommended):**
```typescript
test('new way', async ({ useAuthenticatedApi }) => {
  const { api } = await useAuthenticatedApi();

  const response = await api.getSession();

  expect(response.status).toBe(200);
});
```

### Benefits of Hook Approach

1. **React-like pattern** - Familiar hooks API for React developers
2. **Automatic cookie management** - No manual cookie extraction/injection
3. **Type safety** - Full TypeScript support with clear return types
4. **Better DX** - Cleaner, more readable test code
5. **Session isolation** - Each test gets a fresh, isolated session
6. **Easier multi-user testing** - Create multiple instances easily
7. **Separation of concerns** - Different hooks for different use cases

## Regenerating API Client

The API client is automatically generated from the OpenAPI specification:

```bash
# Regenerate after API changes
pnpm orval
```

The generated code (`e2e/api/generated.ts`) should never be edited manually.

## Implementation Details

- **Mutator**: `e2e/api/client.ts` - Handles axios instance creation and cookie management
- **Wrapper**: `e2e/api/index.ts` - Provides `createApiClient` factory with Proxy-based instance injection
- **Fixtures**: `e2e/fixtures.ts` - Playwright test fixtures with hook-style API
- **Generated**: `e2e/api/generated.ts` - Auto-generated API methods (do not edit)

### Hook Implementation

The fixtures use async hooks that return configured instances:

```typescript
// HTTP hook - returns axios instance
useHttp: () => AxiosInstance

// API hook - returns typed API client
useApi: () => Promise<ApiClient>

// Authenticated API hook - returns client + user data
useAuthenticatedApi: (userData?: Partial<TestUser>) => Promise<{
  api: ApiClient;
  user: TestUser;
}>
```

Each hook creates a new isolated instance with its own cookie jar for complete session isolation.
