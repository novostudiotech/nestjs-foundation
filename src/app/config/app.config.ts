import { z } from 'zod';

const logLevelSchema = z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']);

export const appConfigSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().int().positive().default(3000),
  logLevel: logLevelSchema.optional(),
  corsOrigin: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return true; // Allow all origins by default
      if (val === 'true') return true;
      if (val === 'false') return false;
      // Support comma-separated origins
      return val.split(',').map((origin) => origin.trim());
    }),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export const appConfig = appConfigSchema.parse({
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT,
  logLevel: process.env.LOG_LEVEL,
  corsOrigin: process.env.CORS_ORIGIN,
});
