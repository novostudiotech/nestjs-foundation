# Validation with Zod

This project uses [Zod](https://zod.dev/) with [nestjs-zod](https://github.com/risen228/nestjs-zod) for request validation. Zod provides TypeScript-first schema validation with static type inference.

## Why Zod?

- ✅ TypeScript-first with automatic type inference
- ✅ 5x faster than class-validator
- ✅ Smaller bundle size (~8KB vs ~50KB)
- ✅ Better composition and reusability
- ✅ Automatic Swagger documentation

## Example Usage

```typescript
import { Body, Controller, Post } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Define Zod schema
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  age: z.number().int().min(18).optional(),
});

// Generate DTO with automatic type inference and Swagger docs
class CreateUserDto extends createZodDto(CreateUserSchema) {}

@Controller('users')
export class UsersController {
  @Post()
  create(@Body() dto: CreateUserDto) {
    // dto is automatically validated and typed
    return { message: 'User created', user: dto };
  }
}
```

## Testing Validation

```bash
# Valid request
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "John Doe", "age": 25}'

# Invalid request (will return 400 with detailed errors)
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid-email", "name": "A", "age": 15}'
```

## Common Patterns

### Basic Validation

```typescript
const UserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  age: z.number().int().min(18).max(120).optional(),
});
```

### Nested Objects

```typescript
const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zipCode: z.string().regex(/^\d{5}$/),
});

const UserWithAddressSchema = z.object({
  name: z.string(),
  address: AddressSchema,
});
```

### Arrays

```typescript
const CreatePostSchema = z.object({
  title: z.string(),
  tags: z.array(z.string()).min(1).max(10),
});
```

### Enums

```typescript
const UserRoleSchema = z.object({
  role: z.enum(['user', 'admin', 'moderator']),
});
```

### Optional Fields

```typescript
const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  age: z.number().int().min(18).optional(),
});
```

### String Transformations

```typescript
const CreateUserSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  name: z.string().trim(),
});
```

### Custom Validation

```typescript
const RegisterSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
```

### Query Parameters with Type Coercion

Query parameters from URLs are always received as strings. Use `z.coerce` for numbers and `z.stringbool()` for booleans to automatically convert them to the correct types:

```typescript
const QuerySchema = z.object({
  // Coerce string to number: "1" -> 1, "20" -> 20
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  
  // Strict boolean parsing: only "true" -> true, "false" -> false
  // Use z.stringbool() instead of z.coerce.boolean() to avoid JS truthiness issues
  // (z.coerce.boolean() would convert "false" to true because Boolean("false") === true)
  includeDeleted: z.stringbool({ truthy: ["true"], falsy: ["false"] }).default(false),
  expandRelations: z.stringbool({ truthy: ["true"], falsy: ["false"] }).default(false),
  
  // String parameters don't need coercion
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
});

class QueryDto extends createZodDto(QuerySchema) {}

@Get()
findAll(@Query() query: QueryDto) {
  // query.page is number (not string!)
  // query.includeDeleted is boolean (not string!)
  // query.search is string | undefined
}
```

**Why use `z.coerce` and `z.stringbool()`?**
- Without coercion: `?page=1` → validation error (expected number, got string)
- With coercion: `?page=1` → automatically converts "1" to 1 ✅
- **Important**: Use `z.stringbool()` for booleans, not `z.coerce.boolean()`
  - `z.coerce.boolean()` uses JavaScript truthiness: `Boolean("false") === true` ❌
  - `z.stringbool()` strictly parses "true"/"false" strings: `"false" → false` ✅

**Example requests:**
```bash
# All parameters are coerced from strings to correct types
GET /items?page=2&limit=10&includeDeleted=true&expandRelations=false
# → { page: 2, limit: 10, includeDeleted: true, expandRelations: false }

# Invalid values still trigger validation errors
GET /items?page=abc
# → 400 Bad Request: "Invalid input: expected number, received NaN"

GET /items?includeDeleted=yes
# → 400 Bad Request: "Invalid input: expected 'true' or 'false'"
```

## Schema Reuse

You can extract and reuse schemas:

```typescript
// common-schemas.ts
export const EmailSchema = z.string().email();
export const NameSchema = z.string().min(2).max(100);
export const AgeSchema = z.number().int().min(18).max(120);

// user.dto.ts
import { EmailSchema, NameSchema, AgeSchema } from './common-schemas';

const CreateUserSchema = z.object({
  email: EmailSchema,
  name: NameSchema,
  age: AgeSchema.optional(),
});
```

## Type Inference

Zod automatically infers TypeScript types from schemas:

```typescript
const UserSchema = z.object({
  email: z.string().email(),
  name: z.string(),
});

// Automatically inferred type
type User = z.infer<typeof UserSchema>;
// { email: string; name: string }
```

## Error Format

When validation fails, Zod returns detailed errors:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "origin": "string",
      "code": "invalid_format",
      "format": "email",
      "path": ["email"],
      "message": "Invalid email address"
    },
    {
      "origin": "string",
      "code": "too_small",
      "minimum": 2,
      "path": ["name"],
      "message": "Too small: expected string to have >=2 characters"
    }
  ]
}
```

## Additional Resources

- [Official Zod Documentation](https://zod.dev/)
- [nestjs-zod GitHub](https://github.com/risen228/nestjs-zod)
