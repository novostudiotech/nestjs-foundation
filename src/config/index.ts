import { z } from 'zod';

export * from './app.config';
export * from './db.config';

/**
 * Unified environment validation schema
 * Validates all required environment variables at application startup
 */
const envSchema = z.object({
  // App config
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),
  CORS_ORIGIN: z.string().optional(),

  // Database config
  DATABASE_URL: z.url(),

  // Auth config
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters long'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates environment variables using Zod schema
 * Throws an error if validation fails, preventing application startup
 */
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  try {
    return envSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');
      throw new Error(
        `Environment validation failed:\n${missingVars}\n\nPlease check your .env file and ensure all required variables are set.`
      );
    }
    throw error;
  }
}
