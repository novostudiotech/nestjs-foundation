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

```
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

```
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

#### Step 1: Define the API Contract (DTOs)

Start with the API interface - what data comes in, what goes out:

```typescript
// 1. Define input validation
const createProductSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().positive(),
  categoryId: z.string().uuid(),
});

export class CreateProductDto extends createZodDto(createProductSchema) {}

// 2. Define output structure
export class ProductResponseDto {
  @ApiProperty()
  id: string;
  
  @ApiProperty()
  name: string;
  
  @ApiProperty()
  price: number;
}
```

#### Step 2: Design the Controller (HTTP Layer)

Controller should be thin - just handle HTTP concerns:

```typescript
@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create product' })
  @ApiResponse({ status: 201, type: ProductResponseDto })
  async create(@Body() dto: CreateProductDto): Promise<ProductResponseDto> {
    return this.productsService.create(dto);
  }
}
```

#### Step 3: Implement Business Logic (Service Layer)

Service contains the actual logic:

```typescript
@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    // Validate business rules
    const category = await this.categoriesService.findOne(dto.categoryId);
    if (!category) {
      throw new BadRequestException({
        code: ErrorCode.NOT_FOUND,
        message: 'Category not found',
      });
    }

    // Create entity
    const product = this.productRepo.create({
      name: dto.name,
      price: dto.price,
      category,
    });

    // Persist
    return this.productRepo.save(product);
  }
}
```

#### Step 4: Define Data Model (Entity)

Entity represents database structure and relationships:

```typescript
@Entity('products')
export class Product {
  @UuidV7PrimaryKey()
  id: string;

  @Column()
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @ManyToOne(() => Category)
  category: Category;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
```

**Note:** TypeORM Repository is injected in Service via `@InjectRepository(Product)` - no need to create custom repository classes unless you need custom query methods.

#### Step 5: Write Tests

Always write E2E tests for new endpoints:

```typescript
test('should create product', async ({ useAuthenticatedApi }) => {
  const { api } = await useAuthenticatedApi();
  
  const response = await api.createProduct({
    name: 'New Product',
    price: 99.99,
    categoryId: 'uuid',
  });
  
  expect(response.status).toBe(201);
  expect(response.data.name).toBe('New Product');
});
```

### Pattern Selection Guidelines

#### When to Use Each Pattern

**Repository Pattern** - Use for:
- ✅ Database access abstraction
- ✅ Complex queries that should be reusable
- ✅ When you need to mock data access in tests

```typescript
// TypeORM repositories are used by default
@InjectRepository(User)
private readonly userRepo: Repository<User>;
```

**Service Pattern** - Use for:
- ✅ Business logic
- ✅ Orchestrating multiple repositories
- ✅ Operations that span multiple entities

```typescript
@Injectable()
export class OrdersService {
  async createOrder(userId: string, items: OrderItem[]) {
    // Orchestrate: validate user, check inventory, create order, send email
  }
}
```

**Factory Pattern** - Use for:
- ✅ Complex object creation
- ✅ When creation logic varies based on input

```typescript
export class PaymentProviderFactory {
  create(type: 'stripe' | 'paypal'): PaymentProvider {
    switch (type) {
      case 'stripe': return new StripeProvider();
      case 'paypal': return new PayPalProvider();
    }
  }
}
```

**Strategy Pattern** - Use for:
- ✅ Interchangeable algorithms
- ✅ Behavior that varies at runtime

```typescript
interface PricingStrategy {
  calculate(base: number): number;
}

class RegularPricing implements PricingStrategy { /* ... */ }
class PremiumPricing implements PricingStrategy { /* ... */ }
```

**Decorator Pattern** - Use for:
- ✅ Adding behavior without modifying classes
- ✅ NestJS guards, interceptors, pipes

```typescript
@UseGuards(AuthGuard)
@UseInterceptors(LoggingInterceptor)
@Controller('admin')
export class AdminController { /* ... */ }
```

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

```
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

**Use TypeScript to its fullest:**

```typescript
// ✅ Explicit types
async function getUser(id: string): Promise<User> { /* ... */ }

// ✅ Inferred from Zod schemas
const schema = z.object({ email: z.string().email() });
type UserInput = z.infer<typeof schema>; // Automatic type

// ✅ Generic types for reusability
class PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
}

// ❌ Avoid 'any'
function process(data: any) { /* ... */ } // Bad
```

### Testing Philosophy

**Test Pyramid:**

```
        /\
       /  \      E2E Tests (Few, Slow, High Confidence)
      /────\     ↳ Playwright - Full API flows
     /      \
    /────────\   Integration Tests (Some, Medium Speed)
   /          \  ↳ Test service + repository + database
  /────────────\ 
 /              \ Unit Tests (Many, Fast, Low Confidence)
/________________\↳ Jest - Pure functions, isolated logic
```

**Testing Strategy:**
- ✅ **E2E for all API endpoints** (required)
- ✅ **Unit tests for complex business logic** (recommended)
- ✅ **Integration tests for data access** (optional)
- ✅ **Mock external services** in tests
- ❌ **Don't test framework code** (NestJS internals)

### Error Handling Philosophy

**Errors are part of the API contract:**

```typescript
// ✅ Use semantic HTTP status codes
throw new BadRequestException({ code: ErrorCode.VALIDATION_ERROR });
throw new NotFoundException({ code: ErrorCode.NOT_FOUND });

// ✅ Use error codes for i18n
{
  "code": "VALIDATION_ERROR",  // Client can translate
  "message": "Invalid input"    // Fallback English
}

// ❌ Don't expose internals
throw new Error('SQL error at line 42'); // Bad
```

**Principle:** Fail fast, fail clearly, never fail silently.

### Code Organization Philosophy

**Feature-based, not technical role-based:**

```
// ✅ Good - Organized by feature
src/
├── users/
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── users.entity.ts
│   └── dto/
└── products/
    ├── products.controller.ts
    ├── products.service.ts
    └── products.entity.ts

// ❌ Bad - Organized by technical role
src/
├── controllers/
│   ├── users.controller.ts
│   └── products.controller.ts
├── services/
│   ├── users.service.ts
│   └── products.service.ts
└── entities/
    ├── user.entity.ts
    └── product.entity.ts
```

**Benefits:**
- Related code stays together
- Easy to find everything about a feature
- Easy to extract to microservice later
- Clear module boundaries

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

```
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

### Runtime & Framework
- **Node.js 24+** - LTS runtime (see `.nvmrc`)
- **NestJS 11** - Progressive Node.js framework
- **TypeScript 5.7** - Strict mode, full type safety

### Data Layer
- **PostgreSQL 16+** - Primary database
- **TypeORM 0.3** - ORM with migration support
- **Zod 4.2** - Runtime validation and type inference

### Authentication & Security
- **Better Auth 1.4** - Modern authentication library
- **Helmet** - Security headers (CSP, XSS protection)
- **CORS** - Configurable cross-origin resource sharing

### Testing
- **Playwright** - E2E API testing (primary)
- **Jest** - Unit testing framework
- **Orval** - TypeScript API client generation from OpenAPI

### Observability
- **Pino** - Structured JSON logging
- **Prometheus** - Metrics collection
- **@nestjs/terminus** - Health checks
- **Sentry** - Error tracking (optional)

### Development
- **Biome** - Fast linting and formatting
- **Husky** - Git hooks
- **Commitlint** - Conventional commits
- **pnpm** - Fast, efficient package manager

## Project Structure

```
nestjs-foundation/
├── src/
│   ├── app/                      # Core application
│   │   ├── dto/                  # Shared DTOs (ErrorResponseDto)
│   │   └── filters/              # Global exception filter, redaction
│   │
│   ├── auth/                     # Authentication module
│   │   ├── entities/             # Better Auth entities
│   │   ├── auth.config.ts        # Better Auth configuration
│   │   └── openapi.ts            # OpenAPI schema generation
│   │
│   ├── config/                   # Environment configuration
│   │   ├── index.ts              # Zod validation, unified config
│   │   ├── app.config.ts         # App-level config
│   │   ├── db.config.ts          # Database config
│   │   └── sentry.config.ts      # Sentry config
│   │
│   ├── db/                       # Database utilities
│   │   ├── decorators/           # Custom decorators (UuidV7PrimaryKey)
│   │   └── entities/             # Base entities
│   │
│   ├── health/                   # Health check module
│   │   ├── health.controller.ts  # /health endpoint
│   │   └── health.module.ts      # Health indicators
│   │
│   ├── metrics/                  # Prometheus metrics
│   │   └── metrics.controller.ts # /metrics endpoint
│   │
│   ├── products/                 # ⚠️ EXAMPLE module (delete before use)
│   │   ├── dto/                  # Zod-based DTOs
│   │   ├── products.controller.ts
│   │   ├── products.service.ts
│   │   └── products.module.ts
│   │
│   ├── swagger/                  # OpenAPI utilities
│   │   └── openapi-merge.util.ts # Merge multiple OpenAPI schemas
│   │
│   ├── migrations/               # TypeORM migrations
│   │   └── *.ts                  # Database migrations
│   │
│   ├── main.ts                   # Application bootstrap
│   └── data-source.ts            # TypeORM data source
│
├── e2e/                          # End-to-end tests
│   ├── api/                      # Generated API client (Orval)
│   ├── fixtures.ts               # Test fixtures (useApi, useDb)
│   ├── db.ts                     # Database test utilities
│   └── *.spec.ts                 # Test files
│
├── docs/                         # Documentation
│   ├── error-handling.md
│   ├── e2e-tests.md
│   ├── zod-validation.md
│   └── ...
│
├── .github/                      # CI/CD workflows
│   └── workflows/
│       ├── ci.yml                # Continuous integration
│       └── cd.yml                # Continuous deployment
│
├── AGENTS.md                     # AI agent instructions
├── ARCHITECTURE.md               # This file
├── README.md                     # Project overview
└── SETUP.md                      # Setup guide
```

### Module Organization

Each feature module follows this structure:

```
feature-module/
├── dto/                          # Data Transfer Objects
│   ├── create-feature.dto.ts    # Zod schema + DTO
│   ├── update-feature.dto.ts
│   └── feature-response.dto.ts
├── feature.controller.ts         # HTTP endpoints + Swagger
├── feature.service.ts            # Business logic
├── feature.module.ts             # NestJS module definition
└── feature.entity.ts             # TypeORM entity (if needed)
```

## Core Components

### 1. Application Bootstrap (`main.ts`)

Entry point that configures:
- **Security middleware** (Helmet with CSP policies)
- **Compression** (responses >1KB)
- **CORS** (configurable via env)
- **Global exception filter**
- **Swagger documentation**
- **Graceful shutdown** (SIGTERM/SIGINT handlers)

```typescript
// Key initialization
const app = await NestFactory.create(AppModule, {
  bufferLogs: true,           // Wait for Pino logger
  bodyParser: false,          // Better Auth handles this
});

app.useLogger(app.get(Logger));
app.enableShutdownHooks();
app.use(helmet(...));
app.use(compression(...));
app.enableCors(...);
app.useGlobalFilters(new GlobalExceptionFilter(logger));
```

### 2. Configuration System (`src/config/`)

**Zod-based type-safe configuration** with runtime validation at startup.

**Benefits:** Type inference, fail-fast validation, single source of truth.

See `src/config/index.ts` for implementation.

### 3. Global Exception Filter (`src/app/filters/`)

Comprehensive error handling:
- Zod validation errors → 400 with field details
- Database errors → Mapped to HTTP status codes
- Sensitive data redaction (fast-redact)
- Sentry integration (5xx only)

**Error Response Structure:** `{ status, code, message, timestamp, path, requestId, validation?, details? }`

See `src/app/filters/global-exception.filter.ts` for implementation.

### 4. Authentication (`src/auth/`)

**Better Auth 1.4** - Session-based authentication with HTTP-only cookies.

**Routes:** `/api/auth/sign-up/email`, `/api/auth/sign-in/email`, `/api/auth/get-session`

See `src/auth/auth.config.ts` for configuration.

### 5. Validation (`nestjs-zod`)

**Zod schemas** for type-safe validation:

```typescript
const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

export class CreateUserDto extends createZodDto(schema) {}
```

**Why Zod?** Better TypeScript integration, composable schemas, better error messages.

See **[docs/zod-validation.md](docs/zod-validation.md)** for detailed guide.

## Request Flow

```
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

- **Routes**: `/api/auth/sign-up/email`, `/api/auth/sign-in/email`, `/api/auth/get-session`, `/api/auth/sign-out`
- **Session Storage**: Database (PostgreSQL) with HTTP-only cookies
- **Password Hashing**: bcrypt
- **Guards**: Use `@Session()` decorator to access current user in protected routes

**Key Entities**: User, Session, Account (see `src/auth/entities/`)

For implementation details, see Better Auth documentation and `src/auth/auth.config.ts`.

## Error Handling Strategy

### Error Classification

```
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

```
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
  migrations: ['dist/migrations/*.js'],
  synchronize: false,           // Never use in production
  logging: ['error', 'warn'],   // Production logging
});
```

### Migration Strategy

**Development:**
1. Modify Entity → 2. `pnpm migration:generate src/migrations/Name` → 3. Review SQL → 4. `pnpm migration:run`

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
