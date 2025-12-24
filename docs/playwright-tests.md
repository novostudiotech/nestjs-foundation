# Playwright E2E Tests

This project uses Playwright for end-to-end (e2e) API testing.

## Overview

Playwright tests are configured to automatically start the dev server, run tests, and shut down the server when complete.

## Configuration

### Files Structure

```
├── playwright.config.ts      # Playwright configuration
├── e2e/                       # E2E tests directory
│   ├── fixtures.ts           # Custom fixtures (HTTP client)
│   └── health.spec.ts        # Example health check test
└── docs/
    └── playwright-tests.md   # This file
```

### Configuration Details

- **Test Directory**: `./e2e`
- **Auto Server Start**: Dev server starts automatically before tests
- **Health Check**: Waits for `/health` endpoint before running tests
- **Workers**: Single worker (no parallel execution)
- **Timeout**: 30 seconds per test
- **Results**: Stored in `./e2e-results/`
- **Reports**: HTML reports in `./playwright-report/`

## Running Tests

```bash
# Run all e2e tests
pnpm run test:e2e

# Run tests with UI (interactive mode)
pnpm run test:e2e:ui

# Run tests in debug mode
pnpm run test:e2e:debug

# View test report
pnpm run test:e2e:report
```

## Writing Tests

### Basic Test Example

```typescript
import { expect, test } from './fixtures'

test.describe('My API Tests', () => {
  test('should do something', async ({ http }) => {
    const { status, data } = await http.get('/my-endpoint')
    
    expect(status).toBe(200)
    expect(data.result).toBe('expected-value')
  })
})
```

### HTTP Client

The `http` fixture provides an Axios-based client with these methods:

- `http.get<T>(url, config?)`
- `http.post<T>(url, data?, config?)`
- `http.put<T>(url, data?, config?)`
- `http.patch<T>(url, data?, config?)`
- `http.delete<T>(url, config?)`

All methods return the full Axios response with `status` and `data` properties.

### Testing Different Status Codes

```typescript
test('should handle errors', async ({ http }) => {
  const { status, data } = await http.get('/non-existent')
  
  expect(status).toBe(404)
  expect(data.error).toBeDefined()
})
```

## CI/CD Integration

In CI environments (when `CI=true`):
- Uses GitHub Actions reporter
- Does not reuse existing server
- All output is captured for debugging

## Debugging

### Debug Mode

```bash
pnpm run test:e2e:debug
```

Opens Playwright Inspector for step-by-step debugging.

### Verbose Output

```bash
DEBUG=1 pnpm run test:e2e
```

Shows server stdout/stderr for troubleshooting.

## Best Practices

1. **Use Descriptive Test Names**: Make test descriptions clear and specific
2. **Test One Thing**: Each test should verify a single behavior
3. **Use Fixtures**: Leverage the `http` fixture for API calls
4. **Check Status Codes**: Always verify the HTTP status code
5. **Validate Data Structure**: Check that response data matches expectations
6. **Clean Test Data**: Ensure tests don't depend on external state

## Common Issues

### Port Already in Use

If tests fail because port 3000 is in use:

```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or change the port in playwright.config.ts
```

### Tests Timing Out

- Increase timeout in `playwright.config.ts`
- Check if the server starts successfully
- Verify `/health` endpoint is accessible

### Axios Not Found

```bash
# Reinstall dependencies
pnpm install
```

## Comparison with Jest E2E Tests

| Feature | Jest E2E | Playwright |
|---------|----------|------------|
| Test Runner | Jest | Playwright |
| HTTP Client | Supertest | Axios |
| Server Control | Manual | Automatic |
| UI Mode | ❌ | ✅ |
| Debug Tools | Node Inspector | Playwright Inspector |
| Parallel Tests | ✅ | Configurable |

## Migration from mots-api

This configuration is a minimal version adapted from the mots-api project:

**Retained:**
- Basic fixture structure with HTTP client
- Auto-start dev server
- Health check before tests
- Test organization

**Simplified:**
- ❌ No database migrations (global-setup)
- ❌ No device authentication fixtures
- ❌ No test-specific database setup
- ✅ Cleaner, minimal setup for general API testing
