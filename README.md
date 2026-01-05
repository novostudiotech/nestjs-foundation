# NestJS Foundation

**Production-ready NestJS boilerplate**

A minimal, opinionated starting point for building NestJS backends intended to run in production.

## Principles

### Production-first
Everything here is designed to run in production environments. No experimental features, no half-baked integrations. Every dependency and configuration choice has been battle-tested.

### Minimal surface area
Only essential setup is included. No bloat, no kitchen sink. You get structured logging, type-safe validation, API documentation, and quality tooling—nothing more, nothing less.

### Explicit over implicit
Configuration and behavior are visible and easy to reason about. No magic, no hidden abstractions. If something happens, you know where and why.

### Long-term maintainability
The project should still make sense after months or years. Clear patterns, consistent conventions, and well-documented decisions ensure the codebase remains approachable.

---

## What's Included

- [x] **[Zod validation](docs/zod-validation.md)** with [`nestjs-zod`](https://github.com/risenforces/nestjs-zod) for type-safe request validation
- [x] **Pino logger** for structured, production-grade logging
- [x] **Swagger/OpenAPI** documentation auto-generated from your code
- [x] **Health checks** with `@nestjs/terminus` for monitoring application status
- [x] **Prometheus metrics** for observability and monitoring
- [x] **TypeORM** setup ready for PostgreSQL integration
- [x] **[Playwright E2E tests](docs/playwright-tests.md)** for API testing with auto-server management
- [x] **Biome** for fast, consistent linting and formatting
- [x] **Git hooks** via Husky for automated quality checks
- [x] **Commitlint** for conventional commit messages
- [x] **Lint-staged** for efficient pre-commit validation
- [x] **EditorConfig** for consistent coding style across editors
- [x] **pnpm** for fast, disk-efficient package management

---

## Example Module

This boilerplate includes a `Products` module (`src/products/`) as a **demonstration example** showing:
- Zod validation with various data types (strings, numbers, booleans, enums, arrays, nested objects)
- Different authorization decorators (`@AllowAnonymous()` for public routes, protected routes requiring authentication)
- Query parameter validation (pagination, filtering, sorting)
- Body parser testing (POST/PUT/PATCH with JSON)
- Error handling patterns (400, 401, 404)
- Complete E2E test coverage

⚠️ **Important:** This module is for demonstration purposes only. **Delete it before starting your actual development** to avoid confusion and keep your codebase clean.

---

## Getting Started

### Prerequisites

- Node.js 24+ 
- pnpm 10+
- PostgreSQL (optional, for database features)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd nestjs-foundation

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Running the Application

```bash
# Development mode with watch
pnpm dev

# Production build and run
pnpm build
pnpm start:prod
```

The application will be available at:
- API: `http://localhost:3000`
- Swagger docs: `http://localhost:3000/docs`
- Health check: `http://localhost:3000/health`
- Metrics: `http://localhost:3000/metrics`

---

## Documentation

### Getting Started
- **[Setup Guide](SETUP.md)** - Quick start and installation
- **[Docker Setup](docs/docker.md)** - Docker and Docker Compose guide

### Development
- **[Zod Validation](docs/zod-validation.md)** - Type-safe request validation
- **[Error Handling](docs/error-handling.md)** - Error codes, i18n, and Sentry tracking
- **[E2E Testing](docs/e2e-tests.md)** - End-to-end API testing
- **[E2E Fixtures](docs/e2e-fixtures.md)** - Test data management
- **[Swagger](docs/swagger.md)** - API documentation
- **[Working with Patches](docs/working-with-patches.md)** - Package patches

### Operations
- **[Monitoring](docs/monitoring.md)** - Health checks and metrics
- **[Conventional Commits](docs/conventional-commits.md)** - Commit standards

---

## Commit Standards

This project enforces [Conventional Commits](https://www.conventionalcommits.org/) for clear, structured commit history:

```bash
# format: <type>(<scope>): <subject>

feat(auth): add JWT token refresh
fix(users): resolve email validation bug
docs(readme): update installation steps
```

Commitlint validates all commit messages automatically via Git hooks.

---

## License

[MIT licensed](LICENSE).
