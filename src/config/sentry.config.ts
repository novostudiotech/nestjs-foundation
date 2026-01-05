import { z } from 'zod';

export const sentryConfigSchema = z.object({
  dsn: z.string().url().optional(),
  environment: z.string().default('development'),
  enabled: z.boolean().default(false),
});

export type SentryConfig = z.infer<typeof sentryConfigSchema>;

export const sentryConfig = sentryConfigSchema.parse({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  enabled: Boolean(process.env.SENTRY_DSN),
});
