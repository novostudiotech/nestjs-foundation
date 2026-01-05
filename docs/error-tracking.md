# Error Tracking with Sentry

This guide covers Sentry integration for automatic error tracking and monitoring.

## Overview

Sentry is integrated into the GlobalExceptionFilter for automatic error capture. It's completely optional and disabled by default.

## Setup

### 1. Create Sentry Account

- Go to [sentry.io](https://sentry.io/) and sign up
- Create a new project for your application
- Choose "Node.js" as the platform

### 2. Get Your DSN

- Navigate to **Settings** → **Projects** → **[Your Project]** → **Client Keys (DSN)**
- Copy the DSN URL (looks like: `https://xxx@sentry.io/123`)

### 3. Configure Environment

Add to your `.env` file:

```bash
# Sentry Configuration (Optional)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=development  # or staging, production
```

## How It Works

### Automatic Error Capture

- **Only server errors** (status code >= 500) are sent to Sentry
- **Client errors** (4xx) are excluded to avoid noise
- **Zero overhead** when disabled (no DSN provided)

### Privacy Protection

Sensitive data is automatically redacted:
- Authorization headers
- Cookies
- API keys
- Passwords, tokens, secrets in request body

### Rich Context

Each error includes:
- **Request details**: URL, method, headers, query params
- **User info**: User ID and email (if authenticated)
- **Tags**: Path, method, URL for easy filtering
- **Stack traces**: Full error stack for debugging

### Example Error in Sentry

```json
{
  "exception": {
    "type": "Error",
    "value": "Database connection failed"
  },
  "request": {
    "url": "/api/users",
    "method": "POST",
    "headers": {
      "authorization": "[REDACTED]",
      "content-type": "application/json"
    }
  },
  "user": {
    "id": "user-123",
    "email": "user@example.com"
  },
  "tags": {
    "path": "/api/users",
    "method": "POST",
    "environment": "production"
  }
}
```

## Disable Sentry

To disable Sentry, leave `SENTRY_DSN` empty or remove it:

```bash
# Sentry disabled
SENTRY_DSN=
```

The application will log: `Sentry is disabled (no SENTRY_DSN provided)`

## Testing

### Test Sentry Integration

1. Set `SENTRY_DSN` in your `.env`
2. Start the application: `pnpm dev`
3. Trigger a 500 error:

```typescript
// In any controller
@Get('/test-error')
testError() {
  throw new Error('Test Sentry integration');
}
```

4. Check your Sentry dashboard for the captured error

### Test Error Sanitization

```typescript
@Post('/test-sensitive')
testSensitive(@Body() body: { password: string }) {
  throw new Error('Error with sensitive data');
}
```

Send request:
```bash
curl -X POST http://localhost:3000/test-sensitive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer secret-token" \
  -d '{"password": "my-secret-password"}'
```

Check Sentry - password and auth header should be `[REDACTED]`.

## Best Practices

### Development

- **Disable Sentry** or use a separate development project
- Test error tracking with development DSN
- Don't send development errors to production project

### Staging

- Use a **staging environment** in Sentry
- Test error tracking before production deployment
- Configure alerts for critical errors

### Production

- **Always enable Sentry** with proper environment tagging
- Set `SENTRY_ENVIRONMENT=production`
- Configure alerts for critical errors
- Set up integrations (Slack, PagerDuty, etc.)

### Performance

- Only 500+ errors are sent (no overhead for successful requests)
- Sentry SDK is initialized once at startup
- Async error capture doesn't block responses

## Configuration

### Environment Variables

```bash
# Required to enable Sentry
SENTRY_DSN=https://xxx@sentry.io/123

# Optional - defaults to NODE_ENV
SENTRY_ENVIRONMENT=production
```

### Code Configuration

Sentry is configured in `src/app/filters/global-exception.filter.ts`:

```typescript
Sentry.init({
  dsn: sentryConfig.dsn,
  environment: sentryConfig.environment,
  tracesSampleRate: 0, // Disable performance monitoring
  beforeSend(event) {
    // Custom sanitization logic
    return event;
  },
});
```

## Alerts and Integrations

### Configure Alerts

1. Go to **Settings** → **Alerts**
2. Create alert rules:
   - **Critical errors**: Alert immediately
   - **Error rate spike**: Alert if error rate increases
   - **New errors**: Alert on first occurrence

### Slack Integration

1. Go to **Settings** → **Integrations** → **Slack**
2. Connect your Slack workspace
3. Configure which errors trigger Slack notifications

### Email Notifications

1. Go to **Settings** → **Notifications**
2. Configure email alerts for:
   - New errors
   - Error rate changes
   - Resolved errors

## Monitoring Dashboard

### Key Metrics

- **Error rate**: Errors per minute/hour
- **Affected users**: Number of users experiencing errors
- **Error frequency**: Most common errors
- **Response time**: Time to resolve errors

### Custom Dashboards

Create custom dashboards in Sentry:
1. Go to **Dashboards**
2. Add widgets for:
   - Error trends
   - Top errors by path
   - Errors by environment
   - User impact

## Troubleshooting

### Errors Not Appearing in Sentry

1. Check `SENTRY_DSN` is set correctly
2. Verify error is >= 500 status code
3. Check application logs for Sentry initialization
4. Test with a simple error endpoint

### Too Many Errors

1. Check if 4xx errors are being sent (shouldn't be)
2. Review error rate limits in Sentry settings
3. Add custom filtering in `beforeSend` hook

### Sensitive Data Leaking

1. Review sanitization logic in GlobalExceptionFilter
2. Add more fields to `sensitiveFields` array
3. Test with actual sensitive data

## References

- [Sentry Node.js Documentation](https://docs.sentry.io/platforms/node/)
- [Sentry Best Practices](https://docs.sentry.io/product/best-practices/)
- [GlobalExceptionFilter Implementation](../src/app/filters/global-exception.filter.ts)
