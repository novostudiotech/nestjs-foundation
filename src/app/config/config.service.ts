import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import type { EnvConfig } from './env';

/**
 * Typed wrapper around NestJS ConfigService
 * Provides type-safe access to environment variables
 *
 * Usage:
 * ```ts
 * constructor(private readonly config: ConfigService) {}
 *
 * const port = this.config.get('PORT'); // Type: number | undefined
 * const dbUrl = this.config.get('DATABASE_URL'); // Type: string
 * ```
 */
@Injectable()
export class ConfigService extends NestConfigService<EnvConfig> {}
