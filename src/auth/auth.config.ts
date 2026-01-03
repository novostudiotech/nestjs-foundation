import { betterAuth } from 'better-auth';
import { openAPI } from 'better-auth/plugins';
import { Pool } from 'pg';
import { uuidv7 } from 'uuidv7';

/**
 * Better Auth configuration options
 */
export interface BetterAuthConfigOptions {
  databaseUrl: string;
  secret: string;
}

/**
 * Creates and returns a Better Auth instance
 * @param options - Configuration options containing databaseUrl and secret
 * @returns Better Auth instance
 */
export function getBetterAuthConfig({ databaseUrl, secret }: BetterAuthConfigOptions) {
  return betterAuth({
    database: new Pool({
      connectionString: databaseUrl,
    }),
    secret,
    basePath: '/auth',
    hooks: {}, // minimum required to use hook decorators
    emailAndPassword: {
      enabled: true,
    },
    plugins: [openAPI()],
    user: {
      modelName: 'user',
    },
    session: {
      modelName: 'session',
    },
    account: {
      modelName: 'account',
    },
    verification: {
      modelName: 'verification',
    },
    advanced: {
      database: {
        generateId: () => uuidv7(),
      },
    },
  });
}
