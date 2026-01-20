import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { LoggerModule } from 'nestjs-pino';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AppConfigModule, ConfigService, getDatabaseConfig, getLoggerConfig } from '#/app/config';
import { getTrustedOrigins } from '#/app/cors';
import { HealthModule } from '#/app/health/health.module';
import { MetricsController } from '#/app/metrics/metrics.controller';
import { AppController } from '#/app.controller';
import { AppService } from '#/app.service';
import { type BetterAuthOtpType, getBetterAuthConfig } from '#/auth/auth.config';
import { NotificationsModule, NotificationsService, NotificationType } from '#/notifications';
/* remove_after_init_start */
import { ProductsModule } from '#/products/products.module';
/* remove_after_init_end */

@Module({
  imports: [
    // AppConfigModule is @Global() and includes ConfigModule.forRoot() inside
    // This makes ConfigService available throughout the app without additional imports
    // for other modules. No need for { imports: [ConfigModule] } anywhere else.
    AppConfigModule,
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getLoggerConfig,
    }),
    PrometheusModule.register({
      controller: MetricsController,
    }),
    HealthModule,
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get('DATABASE_URL');
        const appEnv = configService.get('APP_ENV');
        const config = getDatabaseConfig(databaseUrl);

        return {
          ...config,
          // Retry connections based on where code is deployed (APP_ENV)
          // Production-like environments (production, stage) = retries for reliability
          // Development/test environments = fail fast for immediate feedback
          retryAttempts: ['prod', 'stage'].includes(appEnv) ? 3 : 0,
        };
      },
      // dataSource receives the configured DataSourceOptions
      // and returns a Promise<DataSource>.
      dataSourceFactory: async (options: DataSourceOptions) => {
        const logger = new Logger('TypeOrmModule');
        const databaseUrl = 'url' in options ? options.url : '';

        if (databaseUrl) {
          // Mask password in URL for logging
          const maskedUrl = databaseUrl.replace(/:\/\/[^:]+:([^@]+)@/, (match, password) =>
            match.replace(password, '***')
          );
          logger.log(`Connecting to database: ${maskedUrl}`);
        } else {
          logger.warn('DATABASE_URL is not set, database connection may fail');
        }

        const dataSource = await new DataSource(options).initialize();
        return dataSource;
      },
      inject: [ConfigService],
    }),
    NotificationsModule,
    AuthModule.forRootAsync({
      imports: [NotificationsModule],
      useFactory: (configService: ConfigService, notificationsService: NotificationsService) => {
        const databaseUrl = configService.get('DATABASE_URL');
        const secret = configService.get('AUTH_SECRET');
        const corsOriginsString = configService.get('CORS_ORIGINS') || '';
        const appEnv = configService.get('APP_ENV');

        // Map Better Auth OTP types to notification types
        const otpTypeMap: Record<BetterAuthOtpType, NotificationType> = {
          'sign-in': NotificationType.OTP_SIGN_IN,
          'email-verification': NotificationType.OTP_EMAIL_VERIFICATION,
          'forget-password': NotificationType.OTP_PASSWORD_RESET,
        };

        return {
          auth: getBetterAuthConfig({
            databaseUrl,
            secret,
            trustedOrigins: getTrustedOrigins(corsOriginsString),
            isTest: appEnv === 'test',
            isProd: appEnv === 'prod',
            sendOtp: async ({ email, otp, type }) => {
              const notificationType = otpTypeMap[type];
              await notificationsService.send(notificationType, {
                recipient: email,
                otp,
                expiresInMinutes: 5,
              });
            },
          }),
        };
      },
      inject: [ConfigService, NotificationsService],
    }),
    /* remove_after_init_start */
    ProductsModule,
    /* remove_after_init_end */
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      // Check if database is connected
      if (this.dataSource.isInitialized) {
        this.logger.log('Database connection established successfully');
      }

      this.logger.log('Running database migrations...');
      const migrations = await this.dataSource.runMigrations();

      if (migrations.length > 0) {
        this.logger.log(
          `Successfully executed ${migrations.length} migration(s): ${migrations
            .map((m) => m.name)
            .join(', ')}`
        );
      } else {
        this.logger.log('No pending migrations to execute.');
      }
    } catch (error) {
      this.logger.error(`Failed to run migrations: ${error}`);
      this.logger.error('Application will not start due to migration failure.');
      process.exit(1); // Exit the application if migrations fail
    }
  }
}
