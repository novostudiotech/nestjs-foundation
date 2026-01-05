# Docker Setup

This guide covers Docker and Docker Compose setup for NestJS Foundation.

## Docker Compose (Recommended)

The project includes a `docker-compose.yml` file for easy containerized setup.

### Start All Services

```bash
docker compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- PostgreSQL test database (port 5433)
- NestJS application (port 3000)

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
```

### Stop Services

```bash
docker compose down
```

### Stop and Remove Volumes

```bash
docker compose down -v
```

## Building Docker Image

### Build Production Image

```bash
docker build -t nestjs-foundation:latest .
```

### Run Container

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e AUTH_SECRET=your-secret \
  nestjs-foundation:latest
```

### Multi-stage Build

The Dockerfile uses multi-stage builds for optimal image size:
1. **Builder stage**: Installs dependencies and builds the application
2. **Production stage**: Only includes runtime dependencies and built code

## Docker Compose Configuration

### Services

#### PostgreSQL (Main Database)
- Port: 5432
- Database: `nestjs_foundation`
- User: `postgres`
- Password: `postgres`

#### PostgreSQL (Test Database)
- Port: 5433
- Database: `nestjs_foundation_test`
- User: `postgres`
- Password: `postgres`

#### Application
- Port: 3000
- Depends on: PostgreSQL
- Auto-restarts on failure

### Environment Variables

Override environment variables in `docker-compose.yml` or create a `.env.docker` file:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/nestjs_foundation
AUTH_SECRET=your-secret-key
```

## Health Checks

Docker Compose includes health checks for all services:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 40s
```

## Production Deployment

### Best Practices

1. **Use specific versions**: Pin Node.js and dependency versions
2. **Multi-stage builds**: Keep production images small
3. **Non-root user**: Run application as non-root user
4. **Health checks**: Always include health checks
5. **Secrets management**: Use Docker secrets or environment variables
6. **Resource limits**: Set memory and CPU limits

### Example Production Compose

```yaml
services:
  app:
    image: nestjs-foundation:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      AUTH_SECRET: ${AUTH_SECRET}
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

## Kubernetes Deployment

For Kubernetes deployment examples, see [monitoring.md](monitoring.md).

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process using port
lsof -ti:3000 | xargs kill -9

# Or change port in docker-compose.yml
ports:
  - "3001:3000"
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker compose ps

# View PostgreSQL logs
docker compose logs postgres

# Restart PostgreSQL
docker compose restart postgres
```

### Container Won't Start

```bash
# View container logs
docker compose logs app

# Check container status
docker compose ps

# Rebuild and restart
docker compose up -d --build
```

## References

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Best Practices for Node.js Docker Images](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
