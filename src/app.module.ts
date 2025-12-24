import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EnvConfig, validateEnv } from './config';
import { getDatabaseConfig } from './config/database.config';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnv,
      validationOptions: {
        allowUnknown: false,
        abortEarly: false,
      },
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<EnvConfig>) => {
        const nodeEnv = configService.get('NODE_ENV');
        const logLevel =
          configService.get('LOG_LEVEL') || (nodeEnv === 'production' ? 'info' : 'debug');

        return {
          pinoHttp: {
            level: logLevel,
            transport:
              nodeEnv !== 'production'
                ? {
                    target: 'pino-pretty',
                    options: {
                      colorize: true,
                      singleLine: true,
                      translateTime: 'SYS:standard',
                      ignore: 'pid,hostname',
                    },
                  }
                : undefined,
            serializers: {
              req: (req) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                headers: {
                  // Redact sensitive headers
                  authorization: req.headers.authorization ? '[REDACTED]' : undefined,
                  cookie: req.headers.cookie ? '[REDACTED]' : undefined,
                  'x-api-key': req.headers['x-api-key'] ? '[REDACTED]' : undefined,
                },
              }),
              res: (res) => ({
                statusCode: res.statusCode,
              }),
            },
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.headers["x-api-key"]',
                'req.headers["X-API-Key"]',
                'req.body.password',
                'req.body.token',
                'req.body.secret',
                'res.headers["set-cookie"]',
              ],
              remove: true,
            },
            // Limit body size to prevent logging large payloads
            customProps: () => ({
              environment: nodeEnv,
            }),
          },
        };
      },
      inject: [ConfigService],
    }),
    PrometheusModule.register(),
    HealthModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<EnvConfig>) => {
        const databaseUrl = configService.get('DATABASE_URL');
        const config = getDatabaseConfig(databaseUrl);

        return {
          ...config,
          // In development we want to see error messages right away and not wait for all the retries to fail
          retryAttempts: process.env.NODE_ENV === 'production' ? 3 : 0,
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
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
