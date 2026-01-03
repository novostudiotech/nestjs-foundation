import { Controller, Get } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorFunction,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@ApiTags('Health')
@Controller('health')
@AllowAnonymous()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly moduleRef: ModuleRef
  ) {}

  @Get()
  @HealthCheck({ swaggerDocumentation: true })
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 503,
    description: 'Application is unhealthy',
  })
  async check() {
    const healthChecks: HealthIndicatorFunction[] = [];

    // Only add database check if TypeORM is configured
    try {
      const connection = this.moduleRef.get('Connection', { strict: false });
      if (connection) {
        healthChecks.push(() => this.db.pingCheck('database', { timeout: 5000 }));
      }
    } catch {
      // TypeORM not configured, skip database check
    }

    // If no health checks available, return basic status
    if (healthChecks.length === 0) {
      return {
        status: 'ok',
        info: { service: { status: 'up' } },
        error: {},
        details: { service: { status: 'up' } },
      };
    }

    const healthResult = await this.health.check(healthChecks);
    return {
      ...healthResult,
      timestamp: new Date().toISOString(),
    };
  }
}
