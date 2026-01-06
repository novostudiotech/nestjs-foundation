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
 * This module:
 * 1. Configures NestJS ConfigModule with validation
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
      envFilePath: ['.env.local', '.env'],
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
