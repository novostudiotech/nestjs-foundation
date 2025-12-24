import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';
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

        type PinoHttpRequest = IncomingMessage & {
          id?: string;
          route?: { path?: string };
          url: string;
          method: string;
          headers: Record<string, string | string[] | undefined>;
          _startAt?: bigint;
        };

        type PinoHttpResponse = ServerResponse<PinoHttpRequest> & {
          req?: PinoHttpRequest;
          _startAt?: bigint;
        };

        const resolveContentLength = (value?: number | string | string[]) => {
          if (Array.isArray(value)) {
            return Number.parseInt(value[0] ?? '', 10) || undefined;
          }

          if (typeof value === 'string') {
            return Number.parseInt(value, 10) || undefined;
          }

          return typeof value === 'number' ? value : undefined;
        };

        const assignCorrelationId = (req: PinoHttpRequest, res: PinoHttpResponse) => {
          const headerId = req.headers['x-request-id'] ?? req.headers['x-correlation-id'];
          const correlationId = (Array.isArray(headerId) ? headerId[0] : headerId) || randomUUID();

          const startAt = process.hrtime.bigint();
          req._startAt = startAt;
          res._startAt = startAt;
          res.setHeader('x-request-id', correlationId);
          res.setHeader('x-correlation-id', correlationId);

          return correlationId;
        };

        return {
          pinoHttp: {
            level: logLevel,
            genReqId: (req, res) => assignCorrelationId(req, res),
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
                correlationId: req.id,
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
                correlationId: (() => {
                  const correlationHeader =
                    res.getHeader?.('x-correlation-id') || res.getHeader?.('x-request-id');
                  return Array.isArray(correlationHeader)
                    ? correlationHeader[0]
                    : correlationHeader || res.req?.id;
                })(),
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
                'req.body',
                'req.raw.body',
                'res.headers["set-cookie"]',
              ],
              remove: true,
            },
            // Limit body size to prevent logging large payloads
            customProps: (req: PinoHttpRequest, res: PinoHttpResponse) => {
              const startAt = req._startAt;
              const responseTime =
                typeof startAt === 'bigint'
                  ? Number(process.hrtime.bigint() - startAt) / 1_000_000
                  : undefined;

              const getHeader = (
                res as { getHeader?: (name: string) => number | string | string[] | undefined }
              ).getHeader;
              const contentLength = resolveContentLength(getHeader?.('content-length'));

              return {
                environment: nodeEnv,
                method: req.method,
                route: req.route?.path || req.url,
                responseTime,
                contentLength,
                correlationId: req.id,
              };
            },
            customSuccessMessage: (req, res) =>
              `request completed ${req.method} ${req.url} ${res.statusCode}`,
            customErrorMessage: (req, res, error) =>
              `request errored ${req.method} ${req.url} ${res?.statusCode ?? ''} ${error?.message}`,
            hooks: {
              onResponse: (req: PinoHttpRequest, res: PinoHttpResponse, next) => {
                if (!res.getHeader?.('x-correlation-id') && req.id) {
                  res.setHeader('x-correlation-id', req.id);
                  res.setHeader('x-request-id', req.id);
                }
                next();
              },
            },
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
