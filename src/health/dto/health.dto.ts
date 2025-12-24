import { ApiProperty } from '@nestjs/swagger';

class HealthIndicatorResult {
  @ApiProperty({
    description: 'Status of the health indicator',
    example: 'up',
  })
  status: string;
}

export class HealthCheckDto {
  @ApiProperty({
    description: 'Overall health status',
    example: 'ok',
    enum: ['error', 'ok', 'shutting_down'],
  })
  status: string;

  @ApiProperty({
    description: 'Details of healthy indicators',
    required: false,
  })
  info?: Record<string, HealthIndicatorResult>;

  @ApiProperty({
    description: 'Details of unhealthy indicators',
    required: false,
  })
  error?: Record<string, HealthIndicatorResult>;

  @ApiProperty({
    description: 'Combined details of all indicators',
  })
  details: Record<string, HealthIndicatorResult>;

  @ApiProperty({
    description: 'Timestamp of the health check',
    example: '2024-01-01T00:00:00.000Z',
  })
  timestamp: string;
}
