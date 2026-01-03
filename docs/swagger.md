# Swagger Security Configuration

This document explains OpenAPI security concepts: security schemes vs security requirements, and when to use scopes.

## Security Schemes vs Security Requirements

### Security Scheme (`addSecurity()`)

**What it does:**
Declares a **security scheme** — defines *what authentication method exists*.

In OpenAPI, this goes into:

```yaml
components:
  securitySchemes:
    apiKey:
      type: apiKey
      in: header
      name: Authorization
```

In NestJS:

```typescript
.addSecurity('apiKey', {
  type: 'apiKey',
  in: 'header',
  name: 'Authorization',
  description: 'API key for authentication',
})
```

👉 You **describe the scheme**, but don't specify that it's actually used.

---

### Security Requirements (`addSecurityRequirements()`)

**What it does:**
Specifies **which scheme is required** (globally or per operation).

In OpenAPI:

```yaml
security:
  - apiKey: []
```

In NestJS:

```typescript
.addSecurityRequirements('apiKey', [])
```

👉 This is where you **actually apply** the security.

---

## Mental Model

- `addSecurity()` → **what kind of lock exists**
- `addSecurityRequirements()` → **where the lock is applied**

You can declare 10 schemes, but until you add requirements, **the door is open**.

---

## Global vs Operation-Level Security

### Global Security

`addSecurityRequirements()` makes security **global** — applies to all endpoints unless overridden:

```typescript
const config = new DocumentBuilder()
  .addSecurity('apiKey', { ... })
  .addSecurityRequirements('apiKey', [])
  .build();
```

### Operation-Level Security

For controller/method-level security, use `@ApiSecurity()`:

```typescript
@Controller('users')
@ApiSecurity('apiKey') // Controller-level
export class UsersController {
  @Get()
  @ApiSecurity('bearerAuth') // Method-level (overrides controller)
  findAll() {
    // Requires bearerAuth, not apiKey
  }
}
```

Operation-level security **takes precedence** over global security.

---

## Scopes in OpenAPI

**Scopes** are *permissions/access rights within OAuth2/OpenID Connect* that define **what the client can do** after authentication.

⚠️ **Scopes are NOT used for API Key or Basic Auth.** They only apply to OAuth2 flows.

| Authentication Type        | Uses Scopes? |
| ------------------------- | ------------ |
| API key (header/query)     | ❌ No         |
| HTTP Basic                 | ❌ No         |
| JWT bearer token (simple) | ❌ No*        |
| OAuth2                    | ✅ Yes        |
| OpenID Connect            | ✅ Yes        |

*JWT can use scopes, **but only if the JWT is part of an OAuth2/OIDC flow.**

---

## Examples

### API Key (No Scopes)

```typescript
.addSecurity('apiKey', {
  type: 'apiKey',
  in: 'header',
  name: 'Authorization',
})
.addSecurityRequirements('apiKey', []) // Empty array - no scopes
```

### OAuth2 with Scopes

```typescript
.addSecurity('oauth2', {
  type: 'oauth2',
  flows: {
    authorizationCode: {
      authorizationUrl: 'https://example.com/auth',
      tokenUrl: 'https://example.com/token',
      scopes: {
        'read:items': 'Read your items',
        'write:items': 'Modify items',
      },
    },
  },
})
.addSecurityRequirements('oauth2', ['read:items', 'write:items'])
```

### Bearer JWT (No Scopes)

```typescript
.addBearerAuth()
.addSecurityRequirements('bearerAuth', []) // No scopes - just token validation
```
