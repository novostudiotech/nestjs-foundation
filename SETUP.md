# Setup Guide

Quick start guide to get NestJS Foundation running locally.

## Prerequisites

- **Node.js** 24.x ([nvm](https://github.com/nvm-sh/nvm) recommended)
- **pnpm** 9.x or later (`corepack enable`)
- **PostgreSQL** 16.x or later (or use [Docker](docs/docker.md))

## Quick Start

### 1. Install Dependencies

```bash
# Use correct Node version
nvm install && nvm use

# Install dependencies
pnpm install
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Generate AUTH_SECRET
openssl rand -base64 32
```

Edit `.env` and set required variables:

```bash
NODE_ENV=development
APP_ENV=local
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nestjs_foundation?sslmode=disable
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nestjs_foundation_test?sslmode=disable
AUTH_SECRET=<paste-generated-secret-here>
APP_NAME="NestJS Foundation"
```

> **⚠️ Security Warning**: `sslmode=disable` is intended for **local development only** and is insecure for production environments.

**Environment Variables Explained:**
- `NODE_ENV`: How code runs (build mode: development/production) - affects build optimizations, developer experience (pretty logs vs JSON)
- `APP_ENV`: Where code is deployed (deployment environment: local/test/dev/stage/production) - determines runtime behavior
- Use `APP_ENV` for: Business logic (feature flags, log levels, API endpoints, retries, error details)
- Use `NODE_ENV` for: Build mode (minification, source maps, pretty logs)

### 3. Setup Database

```bash
# Create databases
createdb nestjs_foundation
createdb nestjs_foundation_test

# Run migrations
pnpm migration:run
```

### 4. Start Application

```bash
pnpm dev
```

Application available at:
- **API**: http://localhost:3000
- **Swagger**: http://localhost:3000/docs
- **Health**: http://localhost:3000/health

## Optional: Error Tracking

Enable [Sentry](docs/error-handling.md#error-tracking-with-sentry) for production error monitoring:

```bash
# Add to .env
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=development
```

See [Error Handling Guide](docs/error-handling.md) for details.

## Optional: Docker

Use Docker for easy setup without local PostgreSQL:

```bash
docker compose up -d
```

See [Docker Guide](docs/docker.md) for details.

## Running Tests

```bash
# Unit tests
pnpm test:unit

# E2E tests
pnpm test:e2e

# Lint
pnpm lint
```

## Database Migrations

```bash
# Create migration
pnpm migration:create src/app/db/migrations/MigrationName

# Generate from entity changes
pnpm migration:generate src/app/db/migrations/MigrationName

# Run migrations
pnpm migration:run

# Revert last migration
pnpm migration:revert
```

## Common Issues

### Port Already in Use

```bash
# Change PORT in .env or kill process
kill -9 $(lsof -ti:3000)
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
brew services list  # macOS
systemctl status postgresql  # Linux

# Verify connection
psql -h localhost -p 5432 -U postgres
```

### Database Does Not Exist

```bash
createdb nestjs_foundation
createdb nestjs_foundation_test
```

## Documentation

- [Conventional Commits](docs/conventional-commits.md) - Git commit guidelines
- [Docker Setup](docs/docker.md) - Docker and Docker Compose
- [E2E Testing](docs/e2e-tests.md) - End-to-end testing guide
- [E2E Fixtures](docs/e2e-fixtures.md) - Test data management
- [Error Handling](docs/error-handling.md) - Error codes, i18n, and Sentry tracking
- [Monitoring](docs/monitoring.md) - Health checks and metrics
- [Swagger](docs/swagger.md) - API documentation
- [Zod Validation](docs/zod-validation.md) - Request validation
- [Working with Patches](docs/working-with-patches.md) - Package patches

## Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes and commit (use conventional commits)
git add .
git commit -m "feat: add new feature"

# 3. Run tests and lint
pnpm lint
pnpm test:unit
pnpm test:e2e

# 4. Push and create PR
git push origin feature/my-feature
```

## Getting Help

1. Check [Common Issues](#common-issues)
2. Review [Documentation](#documentation)
3. Search GitHub issues
4. Create new issue with details

## Next Steps

- Explore [API Documentation](http://localhost:3000/docs)
- Read [E2E Testing Guide](docs/e2e-tests.md)
- Setup [Error Handling](docs/error-handling.md) for production
- Configure [Monitoring](docs/monitoring.md) for your deployment
