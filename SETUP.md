# Setup Guide

This guide will help you set up and run the NestJS Foundation project locally.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Running Tests](#running-tests)
- [Docker Setup](#docker-setup)
- [Common Issues](#common-issues)
- [Additional Documentation](#additional-documentation)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 24.x (use `.nvmrc` for automatic version management)
  - Install via [nvm](https://github.com/nvm-sh/nvm): `nvm install` (reads from `.nvmrc`)
  - Or download from [nodejs.org](https://nodejs.org/)
- **pnpm**: Version 9.x or later
  - Install via corepack: `corepack enable && corepack prepare pnpm@latest --activate`
  - Or install globally: `npm install -g pnpm`
- **PostgreSQL**: Version 16.x or later
  - Install via [Homebrew](https://brew.sh/) (macOS): `brew install postgresql@16`
  - Or use Docker (see [Docker Setup](#docker-setup))
- **Docker** (optional): For containerized development
  - Install [Docker Desktop](https://www.docker.com/products/docker-desktop)

## Initial Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd nestjs-foundation
```

2. **Install Node.js version**

If using nvm:

```bash
nvm install
nvm use
```

3. **Install dependencies**

```bash
pnpm install
```

This will install all dependencies and apply any necessary patches.

## Environment Configuration

1. **Create environment file**

Copy the example environment file:

```bash
cp .env.example .env
```

2. **Configure environment variables**

Edit `.env` and set the following required variables:

```bash
# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nestjs_foundation

# Test Database (for E2E tests)
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nestjs_foundation_test

# Authentication
AUTH_SECRET=<generate-a-secure-secret-here>

# CORS (optional)
# CORS_ORIGIN=https://example.com,https://app.example.com
```

**Generate a secure AUTH_SECRET:**

```bash
openssl rand -base64 32
```

## Database Setup

### Option 1: Local PostgreSQL

1. **Start PostgreSQL service**

```bash
# macOS (Homebrew)
brew services start postgresql@16

# Linux (systemd)
sudo systemctl start postgresql
```

2. **Create databases**

```bash
# Connect to PostgreSQL
psql postgres

# Create databases
CREATE DATABASE nestjs_foundation;
CREATE DATABASE nestjs_foundation_test;

# Exit
\q
```

3. **Run migrations**

```bash
pnpm migration:run
```

### Option 2: Docker PostgreSQL

See [Docker Setup](#docker-setup) section below.

## Running the Application

### Development Mode

Start the application with hot-reload:

```bash
pnpm dev
```

The application will be available at:
- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/health
- **Metrics**: http://localhost:3000/metrics

### Production Mode

Build and run the production version:

```bash
# Build the application
pnpm build

# Start production server
pnpm start:prod
```

### Debug Mode

Run with Node.js debugger attached:

```bash
pnpm debug
```

Then attach your IDE's debugger to the Node.js process.

## Running Tests

### Unit Tests

Run Jest unit tests:

```bash
# Run all unit tests
pnpm test:unit

# Run with watch mode
pnpm test:unit:watch

# Run with coverage
pnpm test:unit:coverage
```

### End-to-End (E2E) Tests

E2E tests use Playwright and require a test database.

1. **Ensure test database is configured**

Make sure `TEST_DATABASE_URL` is set in your `.env` or `.env.test` file.

2. **Run E2E tests**

```bash
# Run all E2E tests
pnpm test:e2e

# Run with debug mode
pnpm test:e2e:debug

# View test report
pnpm test:e2e:report
```

3. **Generate API client** (if API changes)

```bash
pnpm test:e2e:generate-api
```

For more details, see:
- [E2E Testing Guide](docs/e2e-tests.md)
- [E2E Fixtures Guide](docs/e2e-fixtures.md)

## Docker Setup

### Using Docker Compose

The project includes a `docker-compose.yml` file for easy containerized setup.

1. **Start all services**

```bash
docker compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- PostgreSQL test database (port 5433)
- NestJS application (port 3000)

2. **View logs**

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
```

3. **Stop services**

```bash
docker compose down
```

4. **Stop and remove volumes**

```bash
docker compose down -v
```

### Building Docker Image

Build the production Docker image:

```bash
docker build -t nestjs-foundation:latest .
```

Run the container:

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e AUTH_SECRET=your-secret \
  nestjs-foundation:latest
```

## Database Migrations

### Create a new migration

```bash
pnpm migration:create src/migrations/MigrationName
```

### Generate migration from entity changes

```bash
pnpm migration:generate src/migrations/MigrationName
```

### Run pending migrations

```bash
pnpm migration:run
```

### Revert last migration

```bash
pnpm migration:revert
```

### Show migration status

```bash
pnpm migration:show
```

## Common Issues

### Port Already in Use

If port 3000 is already in use:

1. Change the `PORT` in your `.env` file
2. Or kill the process using the port:

```bash
# Find process
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)
```

### Database Connection Issues

**Error: `ECONNREFUSED` or `Connection refused`**

- Ensure PostgreSQL is running: `brew services list` (macOS) or `systemctl status postgresql` (Linux)
- Check your `DATABASE_URL` in `.env`
- Verify PostgreSQL is listening on the correct port: `psql -h localhost -p 5432 -U postgres`

**Error: `database "nestjs_foundation" does not exist`**

- Create the database: `createdb nestjs_foundation`
- Or use psql: `psql postgres -c "CREATE DATABASE nestjs_foundation;"`

### Migration Issues

**Error: `No migrations pending`**

- Migrations are already applied. Check status: `pnpm migration:show`

**Error: `Migration failed`**

- Revert the migration: `pnpm migration:revert`
- Fix the migration file
- Run again: `pnpm migration:run`

### pnpm Installation Issues

**Error: `Cannot find module` after install**

- Clear pnpm cache: `pnpm store prune`
- Remove node_modules: `rm -rf node_modules`
- Reinstall: `pnpm install`

### Patch Package Issues

If patches fail to apply:

```bash
# Reinstall with patches
pnpm install

# Or manually apply patches
pnpm patch-package
```

## Additional Documentation

- [Conventional Commits Guide](docs/conventional-commits.md)
- [E2E Testing Guide](docs/e2e-tests.md)
- [E2E Fixtures Guide](docs/e2e-fixtures.md)
- [Monitoring Guide](docs/monitoring.md)
- [Swagger Documentation](docs/swagger.md)
- [Zod Validation Guide](docs/zod-validation.md)
- [Working with Patches](docs/working-with-patches.md)

## Development Workflow

1. **Create a feature branch**

```bash
git checkout -b feature/my-feature
```

2. **Make changes and commit**

Follow [Conventional Commits](docs/conventional-commits.md):

```bash
git add .
git commit -m "feat: add new feature"
```

3. **Run linter**

```bash
pnpm lint
```

4. **Run tests**

```bash
pnpm test:unit
pnpm test:e2e
```

5. **Push and create PR**

```bash
git push origin feature/my-feature
```

## Getting Help

If you encounter issues not covered in this guide:

1. Check the [Common Issues](#common-issues) section
2. Review the [Additional Documentation](#additional-documentation)
3. Search existing GitHub issues
4. Create a new issue with detailed information

## Next Steps

- Read the [API Documentation](http://localhost:3000/docs) (after starting the app)
- Explore the [E2E Testing Guide](docs/e2e-tests.md)
- Review the [Monitoring Guide](docs/monitoring.md)
- Check out the [Swagger Documentation](docs/swagger.md)
