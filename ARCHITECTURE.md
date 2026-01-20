# Architecture Overview

This document describes the architecture, design decisions, and patterns used in NestJS Foundation.

## Table of Contents

- [Design Principles & Philosophy](#design-principles--philosophy)
- [System Overview](#system-overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Core Components](#core-components)
- [Request Flow](#request-flow)
- [Authentication Flow](#authentication-flow)
- [Error Handling Strategy](#error-handling-strategy)
- [Database Architecture](#database-architecture)
- [Testing Architecture](#testing-architecture)
- [Monitoring & Observability](#monitoring--observability)
- [Security Architecture](#security-architecture)
- [Design Patterns](#design-patterns)
- [Key Design Decisions](#key-design-decisions)

## Design Principles & Philosophy

This section outlines the core principles and thinking patterns that guide development in this codebase.

### Core Principles

#### 1. Separation of Concerns (SoC)

**Each layer has a single, well-defined responsibility:**

```text
Controllers → Handle HTTP, delegate to services
Services   → Contain business logic
Entities   → Represent data structure
DTOs       → Define API contracts
Filters    → Handle cross-cutting concerns (errors, logging)
```

**Example - What NOT to do:**
```typescript
// ❌ Bad - Controller contains business logic
@Controller('users')
export class UsersController {
  @Post()
  async create(@Body() dto: CreateUserDto) {
    // Direct database access in controller
    const user = await this.userRepo.save({ ...dto });
    // Business logic in controller
    await this.emailService.sendWelcome(user.email);
    return user;
  }
}
```

**Example - What to do:**
```typescript
// ✅ Good - Controller delegates to service
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}

// Service contains business logic
@Injectable()
export class UsersService {
  async create(dto: CreateUserDto): Promise<User> {
    const user = await this.userRepo.save({ ...dto });
    await this.emailService.sendWelcome(user.email);
    return user;
  }
}
```

#### 2. Dependency Inversion Principle (DIP)

**Depend on abstractions, not concretions:**

```typescript
// ✅ Good - Depend on interfaces/abstractions
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>, // Abstract Repository
    private readonly emailService: EmailService,  // Injectable service
  ) {}
}

// ❌ Bad - Direct instantiation
@Injectable()
export class UsersService {
  private userRepo = new UserRepository(); // Tight coupling
}
```

**Benefits:**
- Easy to mock in tests
- Easy to swap implementations
- Loose coupling between components

#### 3. Single Responsibility Principle (SRP)

**Each class/function should do ONE thing well:**

```typescript
// ❌ Bad - Multiple responsibilities
class UserService {
  async createUser(dto) { /* ... */ }
  async sendEmail(email) { /* ... */ }
  async uploadAvatar(file) { /* ... */ }
  async generateReport() { /* ... */ }
}

// ✅ Good - Single responsibility per service
class UserService {
  async createUser(dto) { /* ... */ }
  async updateUser(id, dto) { /* ... */ }
}

class EmailService {
  async sendWelcome(email) { /* ... */ }
  async sendReset(email) { /* ... */ }
}

class StorageService {
  async upload(file) { /* ... */ }
}
```

#### 4. Open/Closed Principle (OCP)

**Open for extension, closed for modification:**

```typescript
// ✅ Good - Extensible via composition
interface PaymentProvider {
  processPayment(amount: number): Promise<void>;
}

class StripeProvider implements PaymentProvider { /* ... */ }
class PayPalProvider implements PaymentProvider { /* ... */ }

class PaymentService {
  constructor(private provider: PaymentProvider) {}
  
  async process(amount: number) {
    return this.provider.processPayment(amount);
  }
}
```

#### 5. DRY (Don't Repeat Yourself)

**Extract common logic into reusable components:**

```typescript
// ❌ Bad - Repeated validation logic
class UserController {
  @Post()
  async create(@Body() dto: CreateUserDto) {
    if (!dto.email) throw new BadRequestException('Email required');
    if (!dto.email.includes('@')) throw new BadRequestException('Invalid email');
    // ...
  }
}

// ✅ Good - Centralized validation via Zod
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export class CreateUserDto extends createZodDto(createUserSchema) {}
```

#### 6. KISS (Keep It Simple, Stupid)

**Prefer simple solutions over complex ones:**

```typescript
// ❌ Overly complex
const getActiveUsers = (users) => 
  users.reduce((acc, u) => 
    u.status === 'active' ? [...acc, u] : acc, []);

// ✅ Simple and clear
const getActiveUsers = (users) => 
  users.filter(u => u.status === 'active');
```

#### 7. YAGNI (You Aren't Gonna Need It)

**Don't build features you don't need yet:**

```typescript
// ❌ Over-engineering
class UserService {
  // We might need this someday...
  async getUsersByAgeRange(min, max) { /* ... */ }
  async getUsersByCountry(country) { /* ... */ }
  async getUsersByHobby(hobby) { /* ... */ }
}

// ✅ Build only what's needed now
class UserService {
  async getUser(id: string) { /* ... */ }
  async createUser(dto: CreateUserDto) { /* ... */ }
}
```

### Architectural Layers

This application follows a **4-layer architecture**:

```text
┌──────────────────────────────────────────────────────┐
│  Layer 1: Presentation (Controllers + DTOs)          │
│  Handles HTTP requests, routing, validation          │
│  Files: *.controller.ts, dto/*.dto.ts                │
└──────────────────────┬───────────────────────────────┘
                       ↓ calls
┌──────────────────────────────────────────────────────┐
│  Layer 2: Business Logic (Services)                  │
│  Business rules, orchestration, workflows            │
│  Files: *.service.ts                                 │
└──────────────────────┬───────────────────────────────┘
                       ↓ uses
┌──────────────────────────────────────────────────────┐
│  Layer 3: Data (Entities)                            │
│  Data structure, relationships, TypeORM models       │
│  Files: *.entity.ts                                  │
└──────────────────────┬───────────────────────────────┘
                       ↓ persisted via
┌──────────────────────────────────────────────────────┐
│  Layer 4: Data Access (TypeORM + PostgreSQL)         │
│  Database operations, queries, SQL execution         │
│  Implementation: TypeORM Repository + pg driver      │
└──────────────────────────────────────────────────────┘
```

**Flow Example:**
```typescript
// 1. Controller receives HTTP request
@Post()
async create(@Body() dto: CreateProductDto) {
  return this.productsService.create(dto);  // → Layer 2
}

// 2. Service executes business logic
async create(dto: CreateProductDto): Promise<Product> {
  const product = this.productRepo.create(dto);  // → Layer 3 (Entity)
  return this.productRepo.save(product);         // → Layer 4 (TypeORM)
}

// 3. Entity defines structure (Layer 3)
@Entity('products')
export class Product { /* ... */ }

// 4. TypeORM Repository persists to PostgreSQL (Layer 4)
```

**Layer Rules:**
- ✅ Upper layers can depend on lower layers
- ❌ Lower layers NEVER depend on upper layers
- ✅ Standard flow: Controller → Service → Repository → Database
- ❌ Don't skip layers (keeps dependencies clear)

### How to Think When Adding New Features

#### Step-by-Step: Adding New Features

1. **Define DTOs** - Zod schema for validation
2. **Create Controller** - Thin, delegates to service
3. **Implement Service** - Business logic, uses repository
4. **Define Entity** - TypeORM model (if needed)
5. **Write E2E Tests** - Required for all endpoints

**See working example:** `src/products/` module (study, then delete)

### Pattern Selection Guidelines

**When to use:**
- **Repository Pattern** - Database access (TypeORM provides this)
- **Service Pattern** - Business logic, orchestration (always use)
- **Factory Pattern** - Complex object creation with variants
- **Strategy Pattern** - Interchangeable algorithms
- **Decorator Pattern** - NestJS guards, interceptors, pipes

**See:** ARCHITECTURE.md has detailed examples if needed.

### Responsibility Boundaries

#### Controller Responsibilities

**Should:**
- ✅ Define HTTP routes and methods
- ✅ Parse request (query, params, body)
- ✅ Validate input (via pipes)
- ✅ Call service methods
- ✅ Return HTTP responses
- ✅ Add Swagger decorators

**Should NOT:**
- ❌ Contain business logic
- ❌ Access database directly
- ❌ Handle complex error scenarios (use filters)
- ❌ Transform data (use DTOs/interceptors)

#### Service Responsibilities

**Should:**
- ✅ Implement business logic
- ✅ Orchestrate operations across repositories
- ✅ Validate business rules
- ✅ Transform data between layers
- ✅ Call external services
- ✅ Emit events (if event-driven)

**Should NOT:**
- ❌ Know about HTTP (req, res, status codes)
- ❌ Depend on controllers
- ❌ Handle HTTP-specific errors

#### Entity Responsibilities

**Should:**
- ✅ Define data structure (columns, types)
- ✅ Define relationships (@ManyToOne, @OneToMany)
- ✅ Define database constraints (unique, nullable)
- ✅ Use decorators for metadata (@Entity, @Column)

**Should NOT:**
- ❌ Contain business logic
- ❌ Contain validation logic (use Zod in DTOs)
- ❌ Have methods beyond getters/setters

#### Data Access Layer (TypeORM + PostgreSQL)

**TypeORM Repositories** handle database operations:
- Injected via `@InjectRepository(Entity)`
- Provide standard methods: `find()`, `findOne()`, `save()`, `remove()`
- Custom queries via `createQueryBuilder()` or raw SQL when needed

**Should NOT:**
- ❌ Contain business logic (keep in services)
- ❌ Be extended unless custom query methods needed

### Cross-Cutting Concerns

Some concerns span all layers:

```text
┌──────────────────────────────────────────────┐
│         Cross-Cutting Concerns               │
│                                              │
│  • Logging (Pino)                           │
│  • Error Handling (Global Exception Filter) │
│  • Authentication (Guards)                   │
│  • Authorization (Guards)                    │
│  • Validation (Pipes)                        │
│  • Metrics (Prometheus)                      │
│                                              │
└──────────────────────────────────────────────┘
         ▼              ▼              ▼
    Controllers     Services      Repositories
```

**Handle via:**
- **Guards** - Authentication, authorization
- **Pipes** - Validation, transformation
- **Interceptors** - Logging, transformation, caching
- **Filters** - Error handling
- **Middleware** - Global concerns (CORS, helmet)

### Type Safety Philosophy

Use TypeScript strict mode, avoid `any`, use Zod for type inference: `type T = z.infer<typeof schema>`

### Testing Philosophy

**Test Pyramid:** E2E (required) → Integration (optional) → Unit (recommended)

**Strategy:** E2E for all endpoints, unit for complex logic, mock external services.

### Error Handling Philosophy

Errors are part of API contract. Use semantic status codes and error codes for i18n. **Principle:** Fail fast, fail clearly.

### Code Organization Philosophy

**Feature-based modules** (not technical role-based):
- ✅ `src/users/` contains controller, service, entity, DTOs
- ❌ Not `src/controllers/`, `src/services/` separated

**Benefits:** Related code together, easy to extract to microservice.

### Summary: Thinking Checklist

When adding new functionality, ask yourself:

1. **Separation**: Does each layer have a single responsibility?
2. **Patterns**: Am I using the right pattern for this problem?
3. **Types**: Is everything properly typed?
4. **Tests**: Have I written E2E tests?
5. **Errors**: Are errors handled with proper codes?
6. **DRY**: Am I repeating code that should be extracted?
7. **KISS**: Is this the simplest solution that works?
8. **YAGNI**: Am I building only what's needed now?
9. **Dependencies**: Am I depending on abstractions?
10. **Documentation**: Is this self-documenting or do I need comments?

## System Overview

NestJS Foundation is a **production-ready backend boilerplate** built with a **modular monolith architecture**. The system is designed for:

- **Scalability**: Horizontally scalable via containerization
- **Maintainability**: Clear separation of concerns, modular structure
- **Type Safety**: TypeScript strict mode throughout
- **Observability**: Structured logging, metrics, health checks
- **Security**: Built-in authentication, data redaction, secure defaults

### High-Level Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│  (Web App, Mobile App, Third-party Services)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP/HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway Layer                       │
│  (Helmet, CORS, Compression, Rate Limiting)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Auth       │  │   Products   │  │   Health     │       │
│  │   Module     │  │   Module     │  │   Module     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │     Global Exception Filter + Error Handler         │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  PostgreSQL  │  │    Sentry    │  │  Prometheus  │       │
│  │  (TypeORM)   │  │  (Optional)  │  │   (Metrics)  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

See **[AGENTS.md](AGENTS.md)** for the complete tech stack.

**Key Technologies:**
- **Framework**: NestJS 11 + TypeScript 5.7 (strict)
- **Database**: PostgreSQL 16 + TypeORM 0.3
- **Validation**: Zod 4.2 (not class-validator)
- **Testing**: Playwright (E2E) + Jest (unit)
- **Auth**: Better Auth 1.4 with Email OTP
- **Email**: Resend + React Email (transactional emails)

## Project Structure

See **[AGENTS.md](AGENTS.md)** for the complete structure.

**Key Directories:**
- `src/app/` - System infrastructure (filters, config, db, health, metrics, swagger)
- `src/auth/` - Better Auth integration with Email OTP
- `src/notifications/` - Multi-channel notification system (email, push, etc.)
- `src/products/` - ⚠️ EXAMPLE module (delete before use)
- `e2e/` - Playwright tests with fixtures
- `docs/` - Comprehensive documentation

**Module Pattern:**
```text
feature/
├── dto/                 # Zod schemas + DTOs
├── feature.controller.ts # HTTP endpoints
├── feature.service.ts    # Business logic
├── feature.entity.ts     # TypeORM entity
└── feature.module.ts     # NestJS module
```

## Core Components

### Core Components

1. **Bootstrap (`main.ts`)** - Security middleware, CORS, compression, graceful shutdown
2. **Configuration (`src/app/config/`)** - Zod-based env validation with type inference
3. **Exception Filter (`src/app/filters/`)** - Global error handling with Sentry
4. **Authentication (`src/auth/`)** - Better Auth with session-based auth + Email OTP
5. **Notifications (`src/notifications/`)** - Multi-channel notification system (email via Resend)
6. **Validation (`nestjs-zod`)** - Zod schemas for type-safe validation

**Implementation details:** See reference files in AGENTS.md and respective docs/

## Environment Configuration

The application uses two environment variables to control behavior:

### NODE_ENV - How Code Runs (Build Mode)

**Purpose:** Controls build mode, optimizations, and developer experience.

**Values:**
- `development` - Dev build with hot reload, verbose errors, source maps, **pretty logs**
- `production` - Optimized build with minification, no source maps, **JSON logs**

**Use for:**
- Developer experience (pretty logs vs JSON)
- Build optimizations (minification, source maps)
- Framework behavior (hot reload, error details)

**Examples:**
- `pnpm dev` → `NODE_ENV=development` → Pretty logs, easy debugging
- `pnpm start:prod` → `NODE_ENV=production` → JSON logs, optimized build

### APP_ENV - Where Code is Deployed (Deployment Environment)

**Purpose:** Determines runtime behavior based on where code is deployed.

**Values:**
- `local` - Developer's local machine
- `test` - Automated testing environment (E2E, integration tests)
- `dev` - Shared development server
- `stage` - Staging/QA environment (production-like for testing)
- `prod` - Live production environment

**Use for:**
- Business logic (feature flags, API endpoints)
- Log levels (prod=warn, stage=info, others=debug)
- Database retries (prod/stage=3 retries, others=0)
- Error details visibility (prod hides sensitive details)
- Sentry environment identification

**Examples:**
- Local development → `APP_ENV=local` → Debug logs, all error details
- E2E tests → `APP_ENV=test` → JSON logs (if prod build), error details visible
- Production → `APP_ENV=prod` → Warn logs, retries enabled, sensitive data hidden

### Key Principle: Separation of Concerns

```text
NODE_ENV (How)          APP_ENV (Where)
├─ Build mode          ├─ Business logic
├─ Developer UX        ├─ Log levels
└─ Framework behavior  └─ Runtime behavior
```

**Rule of thumb:**
- **NODE_ENV** = "How is the code running?" (dev build vs prod build)
- **APP_ENV** = "Where is the code deployed?" (local vs test vs prod)

### Environment File Loading

Environment files are loaded based on `APP_ENV` via `env.js`:

**Priority (first found wins):**
1. `.env.{APP_ENV}` (e.g., `.env.test`, `.env.prod`)
2. `.env` (fallback)

**Examples:**
- `APP_ENV=test` → Loads `.env.test` → `.env`
- `APP_ENV=prod` → Loads `.env.prod` → `.env`
- `APP_ENV=local` (default) → Loads `.env.local` → `.env`

**Configuration:**
- `env.js` - Loads `.env` files based on `APP_ENV`
- `src/app/config/config.module.ts` - Validates environment variables via Zod
- `src/app/config/env.ts` - Defines schema and types

## Request Flow

```text
Client Request
  → Middleware (Helmet, CORS, Compression)
  → NestJS Pipeline (Guards, Pipes, Controllers)
  → Service Layer (Business Logic)
  → Repository Layer (TypeORM)
  → Database (PostgreSQL)
  
Errors at any stage → GlobalExceptionFilter → Standardized Response
```

**Key Components:**
- **Middleware**: Security headers, CORS, compression, logging
- **Guards**: Authentication/authorization
- **Pipes**: Input validation (ZodValidationPipe)
- **Interceptors**: Response transformation (ZodSerializerInterceptor)
- **Filters**: Error handling (GlobalExceptionFilter)

## Authentication Flow

**Better Auth 1.4** provides session-based authentication with:

- **Routes**: `/auth/sign-up/email`, `/auth/sign-in/email`, `/auth/get-session`, `/auth/sign-out`
- **Session Storage**: Database (PostgreSQL) with HTTP-only cookies
- **Password Hashing**: bcrypt
- **Guards**: Use `@Session()` decorator to access current user in protected routes

**Key Entities**: User, Session, Account (see `src/auth/entities/`)

For implementation details, see Better Auth documentation and `src/auth/auth.config.ts`.

## Error Handling Strategy

### Error Classification

```text
Exception Type → Handler → HTTP Status → Error Code → Response

ZodValidationException
  ├─▶ handleZodValidationException()
  ├─▶ 400 Bad Request
  ├─▶ VALIDATION_ERROR
  └─▶ { status, code, message, validation: [...] }

QueryFailedError (PostgreSQL)
  ├─▶ handleDatabaseError()
  ├─▶ 400/409/500 (depends on PG error code)
  ├─▶ DATABASE_CONFLICT_ERROR / DATABASE_VALIDATION_ERROR / DATABASE_ERROR
  └─▶ { status, code, message, details: { column, constraint } }

HttpException
  ├─▶ handleHttpException()
  ├─▶ exception.getStatus()
  ├─▶ UNAUTHORIZED / FORBIDDEN / NOT_FOUND / etc.
  └─▶ { status, code, message }

Unknown Error
  ├─▶ handleGenericError()
  ├─▶ 500 Internal Server Error
  ├─▶ INTERNAL_SERVER_ERROR
  └─▶ { status, code, message: "Internal server error" }
```

### Error Response Format

All errors return a consistent structure:

```typescript
{
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "timestamp": "2024-01-05T12:00:00.000Z",
  "path": "/api/users",
  "requestId": "uuid-v7",
  "validation": [
    {
      "field": "email",
      "message": "Invalid email format",
      "rule": "email"
    }
  ]
}
```

### Sensitive Data Redaction

```typescript
// Redaction paths (fast-redact)
const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.body.password',
  'req.body.token',
  'req.body.secret',
  'res.headers["set-cookie"]',
];

// Result: [REDACTED]
```

### Sentry Integration

```text
Error Severity → Action

status >= 500
  ├─▶ Log as ERROR
  ├─▶ Send to Sentry with context
  │   ├─▶ Request data (sanitized)
  │   ├─▶ User info (if authenticated)
  │   ├─▶ Tags (path, method)
  │   └─▶ Stack trace
  └─▶ Return generic error to client

status 400-499
  ├─▶ Log as WARN
  ├─▶ Skip Sentry (client error)
  └─▶ Return detailed error to client
```

## Database Architecture

### TypeORM Setup

```typescript
// src/data-source.ts
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/app/db/migrations/*.js'],
  synchronize: false,           // Never use in production
  logging: ['error', 'warn'],   // Production logging
});
```

### Migration Strategy

**Development:**
1. Modify Entity → 2. `pnpm migration:generate src/app/db/migrations/Name` → 3. Review SQL → 4. `pnpm migration:run`

**Production:**
- Migrations run automatically on app startup (`app.module.ts`)
- App fails to start if migrations fail (fail-fast principle)

### Key Conventions

- Use `@UuidV7PrimaryKey()` for all primary keys (time-sortable, better index locality)
- Use TypeORM decorators: `@Entity()`, `@Column()`, `@ManyToOne()`, etc.
- See `src/auth/entities/` for entity examples

## Testing Architecture

**Test Pyramid:**
- **E2E (Playwright)** - Required for all API endpoints
- **Unit (Jest)** - Recommended for complex business logic
- **Integration** - Optional for data access

**Key Features:**
- Hook-based fixtures: `useApi()`, `useAuthenticatedApi()`, `useDb()`
- Type-safe API client (generated from OpenAPI via Orval)
- Automatic server lifecycle management
- Separate test database (`.env.test`)

**Workflow for E2E Tests:**
1. Make API changes (add/modify endpoints)
2. **Generate API client**: `pnpm test:e2e:generate-api`
3. Write E2E tests using generated client
4. Run tests: `pnpm test:e2e`

**Example:**
```typescript
test('should create product', async ({ useAuthenticatedApi }) => {
  const { api, user } = await useAuthenticatedApi();
  const response = await api.createProduct({ name: 'Test', price: 99 });
  expect(response.status).toBe(201);
});
```

**Important:** Always regenerate API client after modifying controllers/DTOs to get updated TypeScript types.

For detailed testing guide, see **[docs/e2e-tests.md](docs/e2e-tests.md)**.

## Monitoring & Observability

**Three Pillars:**
1. **Logs (Pino)** - Structured JSON, sensitive data redaction, correlation IDs
2. **Metrics (Prometheus)** - HTTP metrics, Node.js process metrics (`/metrics`)
3. **Health Checks** - Database, memory, disk (`/health`)
4. **Error Tracking (Sentry)** - Optional, 5xx errors only

**Key Endpoints:**
- `GET /health` - Health status with database check
- `GET /metrics` - Prometheus metrics

For detailed monitoring guide, see **[docs/monitoring.md](docs/monitoring.md)**.

## Security Architecture

**Defense in Depth (5 Layers):**
1. **Network** - HTTPS, rate limiting, CORS
2. **Request** - Helmet (CSP, XSS), Zod validation
3. **Application** - Better Auth, session management, bcrypt
4. **Data** - Sensitive data redaction, SQL injection protection (TypeORM)
5. **Infrastructure** - TLS, secrets management, Docker best practices

**Key Security Features:**
- HTTP-only cookies for sessions
- Sensitive data redaction (fast-redact)
- Global exception filter with security context
- Helmet with strict CSP policies
- Automatic migrations (fail-fast on errors)

**Secrets:** Use `.env` (dev) or environment variables (prod). Never commit secrets.

## Design Patterns

### 1. Dependency Injection
NestJS IoC container manages all dependencies. Use constructor injection for all services.

### 2. Repository Pattern
TypeORM repositories abstract database access. Use `@InjectRepository(Entity)` for data access.

### 3. DTO Pattern
Zod schemas for request validation, Swagger decorators for response documentation.

### 4. Module Pattern
Feature modules encapsulate related functionality (controllers, services, repositories).

### 5. Global Exception Filter Pattern
Centralized error handling for consistent error responses across the application.

**See code examples in:** `src/products/`, `src/auth/`, `src/app/filters/`

## Key Design Decisions

### Technology Choices

| Decision | Why | Trade-off |
|----------|-----|-----------|
| **Zod** over class-validator | Type inference, better DX, composable | Different from NestJS default |
| **Better Auth** over Passport | Modern, simpler API, TypeScript-first | Smaller ecosystem |
| **Playwright** over Supertest | Better DX, fixture system, parallel tests | More setup |
| **Pino** over Winston | 5-10x faster, structured logging | Less flexible |
| **Modular Monolith** over Microservices | Simpler deployment, can extract later | Single deployable unit |
| **Auto migrations** on startup | Always up-to-date, fail-fast | Slightly slower startup |
| **No default caching** | YAGNI principle, add when needed | Must add manually |

### Architectural Choices

**Feature-based modules** - Organized by business domain, not technical role  
**Session-based auth** - Better security than JWT, simpler implementation  
**Fail-fast approach** - Validate early, fail loudly (env validation, migrations)  
**Type-safe everything** - Zod for runtime, TypeScript for compile-time  
**Observability-first** - Logging, metrics, health checks built-in  
**`#/` path aliases** - Hash symbol avoids conflicts with npm scoped packages (`@org/pkg`) and aligns with OpenAPI internal refs (`#/components/schemas`)

## Next Steps

### For New Developers
1. Read **[SETUP.md](SETUP.md)** for local setup
2. Review **[AGENTS.md](AGENTS.md)** for development patterns
3. Study the example **Products module** (then delete it)
4. Read module-specific docs in **docs/**

### For AI Agents
1. Follow patterns in **[AGENTS.md](AGENTS.md)**
2. Reference this document for architectural questions
3. Study existing code examples (see Reference Files in AGENTS.md)
4. Maintain consistency with established patterns

### Architecture Evolution
- Add caching when performance metrics indicate need
- Extract to microservices if specific modules need independent scaling
- Add message queue for async processing if needed
- Implement CQRS/Event Sourcing if domain complexity grows

---

**Last Updated:** January 2026  
**Architecture Status:** Stable, production-ready
