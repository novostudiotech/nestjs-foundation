import { Controller, Get } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorFunction,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { HealthCheckDto } from './dto/health.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly moduleRef: ModuleRef
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    type: HealthCheckDto,
  })
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
        timestamp: new Date().toISOString(),
      };
    }

    const healthResult = await this.health.check(healthChecks);
    return {
      ...healthResult,
      timestamp: new Date().toISOString(),
    };
  }
}
