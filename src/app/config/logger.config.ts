import type { Params } from 'nestjs-pino';
import type { ConfigService } from './config.service';

/**
 * Creates Pino logger configuration
 *
 * Uses NODE_ENV (how code runs) for: Pretty logs vs JSON
 * Uses APP_ENV (where code is deployed) for: Log levels
 */
export function getLoggerConfig(configService: ConfigService): Params {
  const appEnv = configService.get('APP_ENV');
  const nodeEnv = configService.get('NODE_ENV');

  // Log level based on where code is deployed (APP_ENV)
  const logLevel =
    configService.get('LOG_LEVEL') ||
    (appEnv === 'prod' ? 'warn' : appEnv === 'stage' ? 'info' : 'debug');

  return {
    pinoHttp: {
      level: logLevel,
      // Pretty logs based on how code runs (NODE_ENV)
      // development mode (pnpm dev) = pretty, production mode (pnpm start:prod) = JSON
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
      // Custom serializers for request/response
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
      // Redact sensitive fields from logs
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
      // Add custom properties to all logs
      customProps: () => ({
        environment: appEnv,
      }),
    },
  };
}
