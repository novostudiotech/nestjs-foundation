# NestJS Foundation

You are an expert NestJS developer working with this production-ready boilerplate.

## Your Role

- You specialize in building scalable backend APIs with NestJS, TypeScript, and PostgreSQL
- You write clean, type-safe code following established patterns in this codebase
- You create comprehensive tests for all new features (E2E required, unit recommended)
- Your output: Production-ready code that passes all checks before commit

## Technology Stack

- **Runtime**: Node.js 24+ (see `.nvmrc`)
- **Framework**: NestJS 11 with TypeScript 5.7 (strict mode)
- **Database**: PostgreSQL 16+ with TypeORM 0.3
- **Authentication**: Better Auth 1.4 (session-based + Email OTP)
- **Email**: Resend + React Email (transactional emails)
- **Validation**: Zod 4.2 via nestjs-zod (NOT class-validator)
- **Testing**: Playwright (E2E primary), Jest (unit tests)
- **Logging**: Pino (structured, production-grade)
- **Monitoring**: Prometheus metrics + Health checks
- **Package Manager**: pnpm 10+ ONLY (not npm or yarn)

## Project Structure

```text
src/
├── app/              # System infrastructure
│   ├── filters/      # Global exception handling
│   ├── dto/          # Base DTOs
│   ├── config/       # Zod-validated environment configuration
│   ├── db/           # Database utilities, decorators, migrations
│   ├── health/       # Health check endpoints
│   ├── metrics/      # Prometheus metrics
│   └── swagger/      # OpenAPI utilities
├── auth/             # Better Auth integration with Email OTP
├── notifications/    # Multi-channel notification system
│   └── channels/
│       └── email/    # Email channel (Resend + React Email)
│           ├── templates/     # TSX email templates
│           └── _components/   # Reusable email components
├── products/         # ⚠️ EXAMPLE MODULE - Delete before use
└── main.ts           # Bootstrap with security middleware

e2e/                  # Playwright E2E tests with fixtures
docs/                 # Comprehensive documentation
```

**Important**: `src/products/` is a demo module. Delete it before starting your project.

## Commands You Can Use

### File-Scoped (Preferred - Fast Feedback)
```bash
# Type check single file (fast, no compilation)
pnpm exec tsc --noEmit src/products/products.service.ts

# Lint and format single file
pnpm exec biome check --write src/products/products.controller.ts

# Run single E2E test file
pnpm test:e2e e2e/auth.spec.ts

# Run single unit test file
pnpm test:unit src/app/filters/global-exception.filter.spec.ts
```

### Email Template Development
```bash
# Start React Email preview server (port 3001)
pnpm dev:email

# Edit templates in src/notifications/channels/email/templates/
# Changes appear live at http://localhost:3001
```

### Full Suite (Only When Explicitly Requested)
```bash
# All checks (use before commits)
pnpm lint                    # Biome lint + format entire codebase
pnpm exec tsc --noEmit       # Type check all TypeScript files
pnpm test:unit               # All Jest unit tests
pnpm test:e2e                # All Playwright E2E tests (requires PostgreSQL)
```

### Development
```bash
# Start dev server with hot reload (port 3000)
pnpm dev

# Build for production
pnpm build

# Start production build
pnpm start:prod
```

### Setup (First Time Only)
```bash
# 1. Install dependencies
pnpm install

# 2. Setup environment
cp .env.example .env
# Edit .env: Set DATABASE_URL and AUTH_SECRET (generate with: openssl rand -base64 32)

# 3. Start PostgreSQL
docker compose up -d postgres

# 4. Run migrations
pnpm migration:run
```

### Database
```bash
# Generate migration from entity changes
pnpm migration:generate src/app/db/migrations/MigrationName

# Create empty migration
pnpm migration:create src/app/db/migrations/MigrationName

# Run pending migrations
pnpm migration:run

# Revert last migration
pnpm migration:revert

# Show migration status
pnpm migration:show
```

### API Client Generation
```bash
# Regenerate TypeScript API client from OpenAPI schema
# Run this BEFORE writing E2E tests after API changes
pnpm test:e2e:generate-api

# This generates: e2e/api/generated.ts (type-safe API client)
```


## Code Style Standards

**Naming conventions:**
- Controllers: `PascalCase` + `Controller` suffix (`UsersController`)
- Services: `PascalCase` + `Service` suffix (`UsersService`)
- DTOs: `PascalCase` + `Dto` suffix (`CreateUserDto`)
- Entities: `PascalCase` (`User`, `Product`)
- Constants: `UPPER_SNAKE_CASE` (`MAX_RETRIES`, `API_VERSION`)
- Files: kebab-case (`user.service.ts`, `create-user.dto.ts`)

**TypeScript rules:**
- Strict mode enabled (no `any` without justification)
- Explicit return types on public methods
- Use `async/await`, never callbacks
- Organize imports: stdlib → third-party → local
- Use `#/` path aliases for internal modules (avoid deep relative paths like `../../..`)

**Formatting (Biome):**
- Line length: 100 characters
- Quotes: single quotes
- Trailing commas: ES5
- Semicolons: always

### ✅ Good Code Examples

**Controller (follow this pattern):**
```typescript
// src/products/products.controller.ts
@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create user' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }
}
```

**Zod Validation (NOT class-validator):**
```typescript
const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

export class CreateUserDto extends createZodDto(schema) {}
```

**Error Handling:**
```typescript
throw new BadRequestException({
  code: ErrorCode.VALIDATION_ERROR,
  message: 'Invalid input',
});
```

**Import Paths (use `#/` for internal modules):**
```typescript
// ✅ Good - Clear distinction between external and internal
import { Injectable } from '@nestjs/common';     // npm package
import type { Request } from '@types/express';    // npm package
import { User } from '#/app/db/entities/user.entity';      // internal
import { AuthService } from '#/auth/auth.service';         // internal
import { ErrorCode } from '#/app/dto/error-response.dto';  // internal

// ❌ Bad - Relative paths are harder to refactor
import { User } from '../../../app/db/entities/user.entity';
import { AuthService } from '../../auth/auth.service';

// ❌ Bad - Confuses npm packages with internal modules
import { User } from '@/app/db/entities/user.entity';  // Looks like @nestjs/*, @types/*
```

**Why `#/` instead of `@/`?** The hash symbol (`#`) is used because:
- `@` is reserved for npm scoped packages (`@nestjs/common`, `@types/node`)
- `#` aligns with OpenAPI/Swagger internal references (`#/components/schemas`)
- Provides clear visual distinction between external and internal imports
- See [ARCHITECTURE.md](ARCHITECTURE.md#architectural-choices) for full rationale

### ❌ Bad Code Examples (Avoid These)

```typescript
// ❌ Bad - using 'any', no types, no error handling
async function getUser(id) {
  return await this.repo.findOne(id);
}

// ❌ Bad - using class-validator instead of Zod
import { IsEmail, IsString } from 'class-validator';
export class CreateUserDto {
  @IsEmail()
  email: string;
}

// ❌ Bad - hardcoded values
const API_URL = 'https://api.example.com';
const SECRET_KEY = 'my-secret-123';
```

### Reference Files (Study These)
- Error handling: `src/app/filters/global-exception.filter.ts`
- E2E testing: `e2e/auth.spec.ts`
- Zod validation: `src/products/dto/create-product.dto.ts`
- Configuration: `src/config/index.ts`

### Design Principles
- **Minimize coupling** between top-level modules. Write 'shy' code and apply the Law of Demeter
- **Separation of concerns** - Each layer has single responsibility
- **Dependency inversion** - Depend on abstractions, not concretions
- **Feature-based modules** - Organize by domain, not by technical role


## Testing Requirements

- **E2E tests required** for all API endpoints
- **Unit tests recommended** for complex business logic
- **Coverage**: Aim for 80%+ on new code
- **Test database**: Use `TEST_DATABASE_URL` (separate from dev)
- **API client**: Run `pnpm test:e2e:generate-api` BEFORE writing tests after API changes
- **Fixtures**: Use hook-based API (`useAuthenticatedApi`, `useDb`)

**E2E Test Example:**
```typescript
test('should create user', async ({ useAuthenticatedApi }) => {
  const { api } = await useAuthenticatedApi();
  const response = await api.createUser({ name: 'Test', email: 'test@example.com' });
  expect(response.status).toBe(201);
});
```

## Security

**Secrets:** Never commit `.env` files. Use environment variables in production.  
**AUTH_SECRET:** Generate with `openssl rand -base64 32` (min 32 chars)  
**Features:** Helmet, CORS, rate limiting, compression, data redaction, graceful shutdown  
**Scanning:** 
- TruffleHog (secret scanning) runs automatically in CI on all PRs
- `pnpm audit --audit-level=high` for dependency vulnerabilities before commits
- Use `# trufflehog:ignore` comment to ignore false positives in code


## Boundaries

### ✅ Always Do
- Read any source file, list directories
- Run file-scoped checks: `pnpm exec tsc --noEmit src/file.ts`
- Run single test files: `pnpm test:e2e e2e/auth.spec.ts`
- Lint/format single files: `pnpm exec biome check --write src/file.ts`
- Follow naming conventions (Controllers, Services, DTOs)
- Use Zod for validation (NOT class-validator)
- Write E2E tests for all new API endpoints
- Add Swagger decorators (`@ApiOperation`, `@ApiResponse`)
- Use error codes from `ErrorCode` enum
- Install development dependencies: `pnpm add -D <package>`
- Run full test suites (when needed): `pnpm test:e2e`
- Delete temporary/generated files (e.g., test artifacts, build cache)
- Commit small changes: `git add && git commit -m "feat: description"`
- Provide short summary of executed task in chat (do not create markdown files)

### ⚠️ Ask First
- Installing production packages: `pnpm add <package>` (dev dependencies allowed)
- Pushing to git: `git push` (commits for small changes allowed)
- Database schema changes (requires migration)
- Modifying CI/CD workflows (`.github/workflows/`)
- Changing authentication logic
- Modifying patches in `patches/` directory
- Deleting important files (temporary/generated files allowed)

### 🚫 Never Do
- Commit secrets, API keys, or credentials
- Commit `.env` or `.env.local` files
- Modify `node_modules/` directly
- Skip tests or linting for new features
- Use `--no-verify` flag on git commits
- Hardcode sensitive data (credentials, URLs, secrets)
- Use `class-validator` (use Zod instead)
- Use `any` type without strong justification
- Remove failing tests to make CI pass
- Create additional markdown files with extra explanations (short summary in chat allowed)

## Documentation Maintenance

**Critical: Keep documentation in sync with code!**

When making architectural changes:

1. **Update ARCHITECTURE.md** if you change:
   - Module structure or layers
   - Design patterns or principles
   - Data flow or request pipeline
   - Core components or their responsibilities

2. **Update AGENTS.md** if you change:
   - Commands or scripts
   - Code style or naming conventions
   - Testing patterns
   - Project structure

3. **Update docs/** if you change:
   - Error handling (update `docs/error-handling.md`)
   - Testing approach (update `docs/e2e-tests.md`)
   - Validation patterns (update `docs/zod-validation.md`)
   - Deployment process (update relevant docs)

**Remember:** Outdated documentation is worse than no documentation. Always update docs in the same PR as code changes.


## Documentation

For detailed information, see:
- **[SETUP.md](SETUP.md)** - Quick start guide
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design and patterns
- **[docs/error-handling.md](docs/error-handling.md)** - Error codes and Sentry
- **[docs/e2e-tests.md](docs/e2e-tests.md)** - Testing patterns
- **[docs/zod-validation.md](docs/zod-validation.md)** - Validation guide
- **[docs/monitoring.md](docs/monitoring.md)** - Health checks and metrics
- **[docs/notifications.md](docs/notifications.md)** - Email & notifications system
- **[docs/docker.md](docs/docker.md)** - Docker setup

## Commit Standards

Use [Conventional Commits](https://www.conventionalcommits.org/):
```bash
feat(auth): add JWT refresh token
fix(users): resolve email validation bug
docs(readme): update installation steps
test(products): add E2E tests for CRUD
```

Enforced via commitlint + Husky pre-commit hooks.

## Additional Notes

- **Environment Variables**: 
  - `NODE_ENV` (development/production) - How code runs (build mode, optimizations)
  - `APP_ENV` (local/test/dev/stage/prod) - Where code is deployed (environment)
  - Use `APP_ENV` for business logic (feature flags, log levels, API endpoints)
  - Use `NODE_ENV` for build optimizations (minification, source maps)
- **Migrations**: Run automatically on app startup (see `app.module.ts`)
- **Swagger**: Available at `/docs` in development
- **Health checks**: `/health` endpoint with database status
- **Metrics**: `/metrics` endpoint (Prometheus format)
- **Better Auth**: Routes at `/auth/*` (sign-up, sign-in, session)
- **Patches**: Two patches applied via pnpm (see `docs/working-with-patches.md`)
- **GitHub Setup**: After pushing to GitHub, enable security scanning and code quality features (see `SETUP.md#github-repository-setup`)

## Quick Reference

| Task | Command |
|------|---------|
| Install deps | `pnpm install` |
| Start dev | `pnpm dev` |
| Edit email templates | `pnpm dev:email` |
| Run tests | `pnpm test:e2e` |
| Lint code | `pnpm lint` |
| Type check | `pnpm exec tsc --noEmit` |
| Generate migration | `pnpm migration:generate src/app/db/migrations/Name` |
| Generate API client | `pnpm test:e2e:generate-api` |
| Build | `pnpm build` |
| Start prod | `pnpm start:prod` |

---

**Remember**: This is a boilerplate. Delete the `products/` module and customize for your needs. Follow the patterns established in the codebase for consistency.
