import { Global, Module } from '@nestjs/common';
import {
  ConfigModule as NestConfigModule,
  ConfigService as NestConfigService,
} from '@nestjs/config';
import { ConfigService } from './config.service';
import { validateEnv } from './env';

/**
 * Global configuration module
 * Provides typed ConfigService throughout the application
 *
 * Environment variables are loaded by dotenv/config (see package.json scripts).
 * This module only validates them using Zod schema.
 *
 * This module:
 * 1. Validates environment variables loaded by dotenv
 * 2. Aliases our typed ConfigService to NestJS ConfigService
 * 3. Exports typed ConfigService for use throughout the app
 *
 * This allows seamless integration with NestJS DI while maintaining type safety.
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      // No envFilePath - dotenv/config handles loading via NODE_OPTIONS in package.json
      // This prevents confusion about which mechanism loads .env files
      ignoreEnvFile: true,
      validate: validateEnv,
    }),
  ],
  providers: [
    {
      provide: ConfigService,
      useExisting: NestConfigService,
    },
  ],
  exports: [ConfigService],
})
export class AppConfigModule {}
