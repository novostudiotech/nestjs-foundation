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
- [x] **Biome** for fast, consistent linting and formatting
- [x] **Git hooks** via Husky for automated quality checks
- [x] **Commitlint** for conventional commit messages
- [x] **Lint-staged** for efficient pre-commit validation
- [x] **EditorConfig** for consistent coding style across editors
- [x] **pnpm** for fast, disk-efficient package management

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

### Environment Setup

Create a [`.env`](.env.example) file in the root directory:

```bash
# Application
NODE_ENV=development
PORT=3000

# Database (if using TypeORM)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=nestjs_foundation

# Logging
LOG_LEVEL=info
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

## Development

### Code Quality

```bash
# Lint and format code (applies fixes automatically)
pnpm lint
```

### Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e
```

### API Documentation

Once running, visit [`http://localhost:3000/docs`](http://localhost:3000/docs) to explore the auto-generated Swagger/OpenAPI documentation.

---

## Documentation

- **[Zod Validation Guide](docs/zod-validation.md)** - Complete guide to type-safe validation with Zod
- **[Conventional Commits](docs/conventional-commits.md)** - Commit message format and standards
- **[Monitoring & Health Checks](docs/monitoring.md)** - Health checks and Prometheus metrics setup

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

## Project Structure

```
src/
├── config/          # Configuration modules (app, database, etc.)
├── health/          # Health check module
├── schemas/         # Zod schemas for validation
└── main.ts          # Application entry point

docs/                # Documentation files
test/                # E2E tests
```

---

## License

[MIT licensed](LICENSE).
