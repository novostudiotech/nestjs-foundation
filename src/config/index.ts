import { z } from 'zod';

export * from './app.config';
export * from './database.config';

/**
 * Unified environment validation schema
 * Validates all required environment variables at application startup
 */
const envValidationSchema = z.object({
  // App config
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().optional(),
  CORS_ORIGIN: z.string().url().optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),

  // Database config
  DATABASE_URL: z.string().url(),

  // Test database (optional, only required for E2E tests)
  TEST_DATABASE_URL: z.string().url().optional(),
});

export type EnvConfig = z.infer<typeof envValidationSchema>;

/**
 * Validates environment variables using Zod schema
 * Throws an error if validation fails, preventing application startup
 */
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  try {
    return envValidationSchema.parse(config);
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
