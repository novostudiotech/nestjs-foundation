# Monitoring and Health Checks

This document describes the health check and metrics monitoring setup for NestJS Foundation.

## Overview

The application provides two key endpoints for monitoring:
- **Health Check Endpoint** (`GET /health`) - Monitor application and database status
- **Metrics Endpoint** (`GET /metrics`) - Prometheus-compatible metrics

## Health Checks

### Endpoint

`GET /health`

### Features

- Database connectivity check (TypeORM ping)
- Timeout protection (5 seconds)
- Swagger documentation included

### Response Format

**Success (200 OK)**:
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    }
  }
}
```

**Failure (503 Service Unavailable)**:
```json
{
  "status": "error",
  "info": {},
  "error": {
    "database": {
      "status": "down"
    }
  },
  "details": {
    "database": {
      "status": "down"
    }
  }
}
```

### Testing

```bash
# Test locally
curl http://localhost:3000/health

# Pretty print response
curl -s http://localhost:3000/health | jq
```

### Usage in Production

#### Kubernetes Liveness Probe
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
```

#### Kubernetes Readiness Probe
```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
```

#### Docker Compose Health Check
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 40s
```

## Metrics

### Endpoint

`GET /metrics`

### Features

Prometheus-compatible metrics including:
- HTTP request count and duration
- Node.js process metrics
- Memory usage
- CPU usage
- Event loop lag
- Active handles/requests

### Response Format

Text-based Prometheus format:
```
# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total 0.123

# HELP process_cpu_system_seconds_total Total system CPU time spent in seconds.
# TYPE process_cpu_system_seconds_total counter
process_cpu_system_seconds_total 0.045

# HELP process_resident_memory_bytes Resident memory size in bytes.
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes 37896192

# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 42
```

### Testing

```bash
# View metrics
curl http://localhost:3000/metrics
```

## References

- [NestJS Terminus Documentation](https://docs.nestjs.com/recipes/terminus)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Ultimate NestJS Boilerplate](../../letsdance/ultimate-nestjs-boilerplate) (reference implementation)
