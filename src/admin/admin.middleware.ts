import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { Logger } from 'nestjs-pino';

/**
 * Middleware for admin routes
 * Logs all operations and measures request duration
 */
@Injectable()
export class AdminMiddleware implements NestMiddleware {
  constructor(private readonly logger: Logger) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    // Log after response is finished
    res.on('finish', () => {
      const duration = Date.now() - start;

      // biome-ignore lint/suspicious/noExplicitAny: Request user property added by auth middleware
      const user = (req as any).user;
      this.logger.log({
        msg: 'Admin operation',
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userId: user?.id,
      });
    });

    next();
  }
}
