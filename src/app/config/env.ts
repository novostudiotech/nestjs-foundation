import { z } from 'zod';

/**
 * Unified environment validation schema
 * Validates all required environment variables at application startup
 */
const envSchema = z.object({
  // App
  /**
   * NODE_ENV - How the code is running (build mode, optimizations)
   * - development: Dev mode with hot reload, verbose errors
   * - production: Optimized build, minified assets
   * - test: Test mode for automated testing
   */
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  /**
   * APP_ENV - Where the code is deployed (environment/stage)
   * - local: Developer's local machine
   * - dev: Development server (shared dev environment)
   * - stage: Staging/QA environment (production-like)
   * - production: Production environment (live users)
   *
   * Use APP_ENV for business logic (feature flags, API endpoints, log levels)
   * Use NODE_ENV for build optimizations (minification, source maps)
   */
  APP_ENV: z.enum(['local', 'dev', 'stage', 'production']).default('local'),

  PORT: z.coerce.number().int().positive().optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),
  CORS_ORIGIN: z.string().optional(),
  APP_NAME: z.string().min(1, 'APP_NAME is required'),

  // Database
  DATABASE_URL: z.url(),

  // Auth
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters long'),

  // Email (Resend) - optional, but required for sending emails
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(), // Supports both "email@domain.com" and "Name <email@domain.com>"
  EMAIL_REPLY_TO: z.string().optional(),

  // Sentry (optional)
  SENTRY_DSN: z
    .url()
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val)),
  SENTRY_ENVIRONMENT: z.string().optional(),
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
