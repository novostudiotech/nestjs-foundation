import type { Params } from 'nestjs-pino';
import type { ConfigService } from './config.service';

/**
 * Creates Pino logger configuration based on environment
 * Provides structured logging with security features (redaction, sanitization)
 *
 * Uses APP_ENV for business logic (log levels, formatting)
 * Uses NODE_ENV for build mode (pretty print vs JSON)
 */
export function getLoggerConfig(configService: ConfigService): Params {
  const nodeEnv = configService.get('NODE_ENV');
  const appEnv = configService.get('APP_ENV');

  // Determine log level based on APP_ENV (where deployed)
  const logLevel =
    configService.get('LOG_LEVEL') ||
    (appEnv === 'production' ? 'warn' : appEnv === 'stage' ? 'info' : 'debug');

  return {
    pinoHttp: {
      level: logLevel,
      // Pretty print in development, JSON in production
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
        environment: nodeEnv,
      }),
    },
  };
}
