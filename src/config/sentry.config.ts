import { z } from 'zod';

export const sentryConfigSchema = z.object({
  dsn: z.string().url().optional(),
  environment: z.string().default('development'),
  enabled: z.boolean().default(false),
});

export type SentryConfig = z.infer<typeof sentryConfigSchema>;

// Normalize empty string to undefined for "leave empty to disable" workflow
const dsn = process.env.SENTRY_DSN?.trim() || undefined;

export const sentryConfig = sentryConfigSchema.parse({
  dsn,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  enabled: Boolean(dsn),
});
