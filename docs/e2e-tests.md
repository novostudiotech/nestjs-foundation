# E2E Tests with Playwright

This project uses Playwright for end-to-end API testing with automatic server management.

## Quick Start

```bash
# Run all tests
pnpm test:e2e

# Debug mode
pnpm test:e2e:debug

# View report
pnpm test:e2e:report
```

## Configuration

- **Test Directory**: `./e2e`
- **Auto Server Start**: Dev server starts automatically before tests
- **Health Check**: Waits for `/health` endpoint before running tests
- **Workers**: 1 (sequential execution)
- **Timeout**: 30 seconds per test
- **Database**: Uses `TEST_DATABASE_URL` from `.env.test`

## Test Structure

```
e2e/
├── fixtures.ts           # Test fixtures (useApi, useDb, etc.)
├── api/                  # Generated API client
│   ├── generated.ts      # Auto-generated from OpenAPI
│   └── index.ts          # Client factory
├── *.spec.ts            # Test files
└── db.ts                # Database utilities
```

## Writing Tests

### Basic Example

```typescript
import { test, expect } from './fixtures';

test('should access API', async ({ useApi }) => {
  const api = await useApi();
  const response = await api.healthControllerCheck();
  expect(response.status).toBe(200);
});
```

### With Authentication

```typescript
test('should access protected route', async ({ useAuthenticatedApi }) => {
  const { api, user } = await useAuthenticatedApi();
  const session = await api.getSession();
  expect(session.data?.user.email).toBe(user.email);
});
```

### With Database

```typescript
test('should verify data in DB', async ({ useAuthenticatedApi, useDb }) => {
  const { user } = await useAuthenticatedApi();
  const db = useDb();
  
  const dbUser = await db.userRepo.findOne({ where: { email: user.email } });
  expect(dbUser).toBeDefined();
});
```

## Available Fixtures

See [E2E Fixtures Documentation](./e2e-fixtures.md) for detailed information about:

- **`useHttp()`** - Direct axios instance
- **`useApi()`** - Typed API client (unauthenticated)
- **`useAuthenticatedApi()`** - Pre-authenticated API client
- **`useDb()`** - Database access with TypeORM repositories

## API Client Generation

The API client is auto-generated from OpenAPI spec:

```bash
# Regenerate after API changes
pnpm test:e2e:generate-api
```

Generated files in `e2e/api/generated.ts` should never be edited manually.

## Best Practices

1. **Use appropriate fixtures** - `useApi` for public, `useAuthenticatedApi` for protected routes
2. **Verify database state** - Use `useDb` to check data persistence
3. **One assertion per test** - Keep tests focused and simple
4. **Clean test data** - Tests should be independent
5. **Type safety** - Leverage TypeScript for API calls

## Debugging

### Debug Mode

```bash
pnpm test:e2e:debug
```

Opens Playwright Inspector for step-by-step debugging.

### Verbose Output

```bash
DEBUG=1 pnpm test:e2e
```

Shows server logs for troubleshooting.

## CI/CD

In CI environments (`CI=true`):
- Uses GitHub Actions reporter
- Does not reuse existing server
- All output captured for debugging

## Common Issues

### Port Already in Use

```bash
lsof -ti:13000 | xargs kill -9
```

### Tests Timing Out

- Check if server starts successfully
- Verify `/health` endpoint is accessible
- Increase timeout in `playwright.config.ts` if needed

### Database Connection Issues

- Ensure `TEST_DATABASE_URL` is set in `.env.test`
- Check database is running and accessible
- Verify migrations are up to date
