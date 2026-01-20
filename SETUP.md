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
- `APP_ENV`: Where code is deployed (deployment environment: local/test/dev/stage/prod) - determines runtime behavior
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

## GitHub Repository Setup

After pushing your repository to GitHub, enable these settings for full CI/CD functionality:

### Required Settings

1. **Code Security and Analysis** (https://github.com/YOUR_ORG/YOUR_REPO/settings/security_analysis)
   - Enable **Dependency graph**
   - Enable **Dependabot alerts**
   - Enable **Dependabot security updates**
   - Enable **Secret scanning**

2. **Actions Permissions** (https://github.com/YOUR_ORG/YOUR_REPO/settings/actions)
   - Set **Workflow permissions** to "Read and write permissions"
   - Enable **Allow GitHub Actions to create and approve pull requests**

### Why These Are Needed

- **Security scanning**: Trivy in CI uploads vulnerability reports to GitHub Security
- **Secret scanning**: Prevents accidental commit of credentials (via TruffleHog)
- **Workflow permissions**: Allows CI/CD to push Docker images and create releases

### CodeQL (Public Repositories Only)

**Note**: The CodeQL workflow is included in the boilerplate but will be automatically removed when you run the init script (since most projects are private).

If your repository is **public**, you can keep and use CodeQL for advanced code analysis:

1. Skip running the init script, or restore `.github/workflows/codeql.yml` after init
2. Go to **Code Security and Analysis** settings
3. Enable **Code scanning** (CodeQL)
4. CodeQL is free for public repositories but requires a paid plan for private repos

### Troubleshooting

If you see `security-events: write` permission errors:
- Check that Code Security is enabled (step 1 above)
- Verify workflow has `security-events: write` in permissions section
- Ensure repository is not a fork (security features limited on forks)

If Trivy security scanning fails:
- This is expected for private repositories without GitHub Advanced Security
- You can still view Trivy results in the Actions logs
- Consider upgrading to GitHub Advanced Security for private repos if needed

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
