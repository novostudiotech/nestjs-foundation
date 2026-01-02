import { betterAuth } from 'better-auth';
import { openAPI } from 'better-auth/plugins';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { appConfig } from '../config';

const baseURL =
  process.env.NODE_ENV === 'production'
    ? undefined // Will be inferred from request in production
    : process.env.NODE_ENV === 'test'
      ? undefined // Will be inferred from request in test environment
      : `http://localhost:${appConfig.port}`;

console.log('baseURL', baseURL);

/**
 * Better Auth configuration
 * Uses PostgreSQL database connection and AUTH_SECRET from environment variables
 */
export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  secret: process.env.AUTH_SECRET,
  basePath: '/auth',
  // baseURL: `http://localhost:${appConfig.port}/api/auth`,
  hooks: {}, // // minimum required to use hook decorators
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
      generateId: () => randomUUID(),
    },
  },
});
