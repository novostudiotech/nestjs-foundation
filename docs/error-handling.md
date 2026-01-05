# Error Handling

Standardized error responses with machine-readable codes for i18n and optional Sentry integration for server error tracking.

## Error Response Structure

All errors return consistent JSON with error codes for client-side handling:

```typescript
{
  "status": 400,                            // HTTP status code
  "code": "VALIDATION_ERROR",               // Machine-readable code for i18n
  "message": "Validation failed",           // Human-readable message (English)
  "timestamp": "2024-01-05T12:00:00Z",
  "path": "/api/users",
  "requestId": "abc-123",
  "validation": [...],                      // Field-level errors (optional)
  "details": {...}                          // Additional context (optional)
}
```

## Error Codes Reference

| Code | Status | Description | Details |
|------|--------|-------------|---------|
| `VALIDATION_ERROR` | 400 | Zod validation failed | Includes `validation` array with field errors |
| `BAD_REQUEST` | 400 | Generic bad request | Malformed request, invalid params |
| `UNAUTHORIZED` | 401 | Authentication required/failed | Missing or invalid JWT token |
| `FORBIDDEN` | 403 | Insufficient permissions | User lacks access rights |
| `NOT_FOUND` | 404 | Resource not found | User ID, endpoint doesn't exist |
| `DATABASE_CONFLICT_ERROR` | 409 | Unique constraint violation (23505) | Includes `details.column` |
| `DATABASE_VALIDATION_ERROR` | 400 | FK/not-null/check violations (23503, 23502, 23514) | Includes `details.column` |
| `DATABASE_ERROR` | 500 | Unknown database error | Connection issues, unexpected codes |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error | Unhandled exceptions |

> **Security**: In production, `details.constraint` and `details.table` are hidden. Only `details.column` is exposed for UI field highlighting.

## Response Examples

**Validation Error:**
```json
{
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "validation": [
    { "field": "email", "message": "Invalid email format", "rule": "email" },
    { "field": "password", "message": "Must be at least 8 characters", "rule": "too_small" }
  ]
}
```

**Database Conflict:**
```json
{
  "status": 409,
  "code": "DATABASE_CONFLICT_ERROR",
  "message": "A record with this value already exists",
  "details": { "column": "email" }
}
```

**Database Validation:**
```json
{
  "status": 400,
  "code": "DATABASE_VALIDATION_ERROR",
  "message": "Referenced record does not exist",
  "details": { "column": "user_id" }
}
```

## Client-Side Implementation

### TypeScript Types

```typescript
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_CONFLICT_ERROR = 'DATABASE_CONFLICT_ERROR',
  DATABASE_VALIDATION_ERROR = 'DATABASE_VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

export interface ValidationError {
  field: string;
  message: string;
  rule?: string;
}

export interface ErrorResponse {
  status: number;
  code: ErrorCode;
  message: string;
  timestamp: string;
  path: string;
  requestId?: string;
  validation?: ValidationError[];
  details?: { column?: string; [key: string]: unknown };
}
```

### i18n Messages

```typescript
const errorMessages: Record<string, Record<string, string>> = {
  en: {
    VALIDATION_ERROR: 'Please check your input',
    DATABASE_CONFLICT_ERROR: 'This value is already in use',
    DATABASE_VALIDATION_ERROR: 'Invalid reference',
    UNAUTHORIZED: 'Please log in to continue',
    FORBIDDEN: 'Access denied',
    NOT_FOUND: 'Resource not found',
    INTERNAL_SERVER_ERROR: 'Something went wrong. Please try again.',
  },
};
```

### Axios Interceptor

```typescript
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = error.response?.data as ErrorResponse | undefined;
    
    if (!apiError?.code) return Promise.reject(error);

    switch (apiError.code) {
      case 'UNAUTHORIZED':
        window.location.href = '/login';
        break;
        
      case 'VALIDATION_ERROR':
        // Set field-level errors
        apiError.validation?.forEach(err => {
          setFieldError(err.field, err.message);
        });
        break;
        
      case 'DATABASE_CONFLICT_ERROR':
        const field = apiError.details?.column || 'value';
        toast.error(`This ${field} is already in use`);
        break;
        
      default:
        const message = errorMessages[locale]?.[apiError.code] || apiError.message;
        toast.error(message);
    }
    
    return Promise.reject(error);
  }
);
```

## Error Tracking with Sentry

Optional integration for automatic server error tracking (5xx only). Disabled by default.

### Quick Setup

1. **Get DSN**: Create project at [sentry.io](https://sentry.io/) → **Settings** → **Client Keys (DSN)**
2. **Configure** `.env`:
   ```bash
   SENTRY_DSN=https://xxx@sentry.io/123
   SENTRY_ENVIRONMENT=production  # optional, defaults to NODE_ENV
   ```
3. **Done**: Server errors (≥500) are now tracked automatically

To disable: remove `SENTRY_DSN` or leave empty.

### What Gets Tracked

**Captured:**
- Server errors (status ≥ 500) with full stack traces
- Request context: URL, method, headers, query params
- User info: ID and email (if authenticated)
- Tags: path, method, environment

**Excluded:**
- Client errors (4xx) to reduce noise
- Sensitive data (auto-redacted): auth headers, cookies, passwords, tokens, API keys

### Testing Sentry

```typescript
// Test error capture
@Get('/test-error')
testError() {
  throw new Error('Test Sentry');
}
```

```bash
# Test sanitization
curl -X POST http://localhost:3000/test \
  -H "Authorization: Bearer secret" \
  -d '{"password": "secret123"}'
```

Check Sentry dashboard - sensitive fields should show `[REDACTED]`.

### Environment Strategy

| Environment | Setup |
|-------------|-------|
| **Development** | Disable or use separate dev project |
| **Staging** | Use staging environment tag, test alerts |
| **Production** | Always enable, set `SENTRY_ENVIRONMENT=production`, configure alerts |

### Alerts & Monitoring

**Configure in Sentry Settings:**
- **Alerts**: Critical errors, error rate spikes, new errors
- **Slack**: Settings → Integrations → Slack
- **Email**: Settings → Notifications

**Key metrics:**
- Error rate (errors/hour)
- Affected users
- Most frequent errors
- Resolution time

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Errors not appearing | Check `SENTRY_DSN` is set, verify error is ≥500, check logs |
| Too many errors | Verify 4xx aren't sent, adjust rate limits, add custom filters |
| Sensitive data leaking | Update `sensitiveFields` in GlobalExceptionFilter |

## Backend Implementation

**Error codes**: `src/app/dto/error-response.dto.ts`  
**Exception filter**: `src/app/filters/global-exception.filter.ts`  
**PostgreSQL codes**: [`pg-error-constants`](https://github.com/LinusU/pg-error-constants)

### Adding New Error Codes

1. Add to `ErrorCode` enum in `src/app/dto/error-response.dto.ts`
2. Update `GlobalExceptionFilter` to return the new code
3. Update this documentation
4. Add client-side types and i18n messages

## Best Practices

1. **Always check `code` field first** - Use for programmatic error handling
2. **Use `message` as fallback** - Display when no translation available
3. **Log `requestId`** - Include in error reports for debugging
4. **Handle `validation` for forms** - Use for field-specific messages
5. **Use `details` for context** - Database constraint info, etc.
6. **Don't expose internals** - Error messages are generic for security

## References

- [GlobalExceptionFilter](../src/app/filters/global-exception.filter.ts)
- [Error Response DTO](../src/app/dto/error-response.dto.ts)
- [PostgreSQL Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [Sentry Node.js Docs](https://docs.sentry.io/platforms/node/)
