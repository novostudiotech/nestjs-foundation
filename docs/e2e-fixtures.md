# E2E Test Fixtures

Hook-style test fixtures for API testing with automatic session management.

## Available Fixtures

### `useHttp()`
Direct axios instance for custom HTTP requests.

```typescript
test('example', async ({ useHttp }) => {
  const http = useHttp();
  const response = await http.get('/health');
  expect(response.status).toBe(200);
});
```

### `useApi()`
Typed API client without authentication.

```typescript
test('example', async ({ useApi }) => {
  const api = await useApi();
  const response = await api.healthControllerCheck();
  expect(response.status).toBe(200);
});
```

### `useAuthenticatedApi(userData?)`
Pre-authenticated API client with user session.

```typescript
test('example', async ({ useAuthenticatedApi }) => {
  const { api, user } = await useAuthenticatedApi();
  const session = await api.getSession();
  expect(session.data?.user.email).toBe(user.email);
});

// Custom user data
test('custom user', async ({ useAuthenticatedApi }) => {
  const { api, user } = await useAuthenticatedApi({ 
    name: 'Custom User',
    email: 'custom@example.com'
  });
  expect(user.name).toBe('Custom User');
});
```

### `useDb()`
Database access with TypeORM repositories. Worker-scoped (shared across tests in same worker).

```typescript
test('example', async ({ useDb }) => {
  const db = useDb();
  
  // Access repositories
  const users = await db.userRepo.find();
  
  // Raw queries
  const result = await db.dataSource.query('SELECT COUNT(*) FROM "user"');
});
```

**Available repositories:**
- `db.userRepo` - User table
- `db.sessionRepo` - Session table
- `db.accountRepo` - Account table
- `db.verificationRepo` - Verification table
- `db.dataSource` - Direct DataSource access

## Common Patterns

### Multi-user Testing

```typescript
test('multiple users', async ({ useAuthenticatedApi }) => {
  const { api: api1, user: user1 } = await useAuthenticatedApi({ name: 'User 1' });
  const { api: api2, user: user2 } = await useAuthenticatedApi({ name: 'User 2' });

  const session1 = await api1.getSession();
  const session2 = await api2.getSession();

  expect(session1.data?.user.email).toBe(user1.email);
  expect(session2.data?.user.email).toBe(user2.email);
});
```

### Verify Database State

```typescript
test('verify DB after API call', async ({ useAuthenticatedApi, useDb }) => {
  const { user } = await useAuthenticatedApi();
  const db = useDb();

  // Verify user in database
  const dbUser = await db.userRepo.findOne({ where: { email: user.email } });
  expect(dbUser).toBeDefined();
  expect(dbUser?.name).toBe(user.name);

  // Verify session created
  const sessions = await db.sessionRepo.find({ where: { userId: dbUser!.id } });
  expect(sessions.length).toBeGreaterThan(0);
});
```

### Public vs Protected Routes

```typescript
test('access control', async ({ useApi, useAuthenticatedApi }) => {
  const publicApi = await useApi();
  const { api: authApi } = await useAuthenticatedApi();

  // Public endpoint - both work
  const publicResponse = await publicApi.healthControllerCheck();
  expect(publicResponse.status).toBe(200);

  // Protected endpoint - only authenticated works
  const sessionResponse = await authApi.getSession();
  expect(sessionResponse.status).toBe(200);
  expect(sessionResponse.data).toBeDefined();

  const unauthResponse = await publicApi.getSession();
  expect(unauthResponse.data).toBeNull();
});
```

## Key Features

### Automatic Session Management
- Each API client has isolated cookie jar
- Cookies automatically extracted and sent
- No manual cookie handling needed

### Type Safety
All API methods are fully typed from OpenAPI spec:

```typescript
test('typed API', async ({ useAuthenticatedApi }) => {
  const { api } = await useAuthenticatedApi();

  // TypeScript knows exact request/response shape
  const response = await api.productsControllerCreate({
    name: 'Product',      // ✓ Required
    price: 99.99,         // ✓ Required
    category: 'electronics' // ✓ Required
  });

  expect(response.data.product.id).toBeDefined();
});
```

### Worker-Scoped Database
- One DB connection per Playwright worker
- Connection automatically closed when worker finishes
- Shared across all tests in same worker for efficiency

## Implementation Details

- **Fixtures**: `e2e/fixtures.ts` - Playwright test fixtures
- **API Client**: `e2e/api/` - Generated from OpenAPI spec
- **Database**: `e2e/db.ts` - TypeORM connection and repositories
- **Generated**: `e2e/api/generated.ts` - Auto-generated (do not edit)

## Regenerating API Client

```bash
pnpm test:e2e:generate-api
```

Regenerates `e2e/api/generated.ts` from OpenAPI specification.
