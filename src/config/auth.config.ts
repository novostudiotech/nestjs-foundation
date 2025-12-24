import { ConfigService } from '@nestjs/config';
import { APIError } from 'better-auth/api';
import { openAPI } from 'better-auth/plugins';
import { BetterAuthOptions, BetterAuthPlugin } from 'better-auth/types';
import { Pool } from 'pg';
import { v4 as uuid } from 'uuid';
import { AuthService } from '../auth/auth.service';
import { appConfig } from './app.config';
import { parseDatabaseUrl } from './database.config';
import { EnvConfig } from './index';

/**
 * Better Auth Configuration
 * Visit https://www.better-auth.com/docs/reference/options to see full options
 */
export function getBetterAuthConfig({
  configService,
  authService,
}: {
  configService: ConfigService<EnvConfig>;
  authService: AuthService;
}): BetterAuthOptions {
  const databaseUrl = configService.getOrThrow('DATABASE_URL');
  const authSecret = configService.getOrThrow('AUTH_SECRET');
  const authBaseUrl = configService.getOrThrow('AUTH_BASE_URL');
  const authBasePath = configService.get('AUTH_BASE_PATH', { infer: true }) || '/api/auth';
  const nodeEnv = configService.get('NODE_ENV') || 'development';

  const dbConfig = parseDatabaseUrl(databaseUrl);
  const corsOrigin = appConfig.corsOrigin;

  // Core plugins - start with minimal set
  const plugins: BetterAuthPlugin[] = [];

  // Plugins for development only
  if (nodeEnv !== 'production') {
    plugins.push(openAPI());
  }

  return {
    appName: 'NestJS Foundation',
    secret: authSecret,
    baseURL: authBaseUrl,
    basePath: authBasePath,
    plugins,
    database: new Pool({
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      host: dbConfig.host,
      port: dbConfig.port,
      ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      requireEmailVerification: true,
      sendResetPassword: async ({ url, user }) => {
        try {
          await authService.resetPassword({ url, userId: user.id });
        } catch (error: any) {
          throw new APIError(error.status || 500, {
            status: error.status || 500,
            message: error.message,
          });
        }
      },
    },
    session: {
      freshAge: 0,
      modelName: 'session',
    },
    user: {
      modelName: 'user',
      fields: {
        name: 'firstName',
        emailVerified: 'isEmailVerified',
      },
    },
    account: {
      modelName: 'account',
    },
    verification: {
      modelName: 'verification',
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        try {
          await authService.verifyEmail({ url, userId: user.id });
        } catch (error: any) {
          throw new APIError(error.status || 500, {
            status: error.status || 500,
            message: error.message,
          });
        }
      },
    },
    trustedOrigins: corsOrigin ? [corsOrigin] : undefined,
    advanced: {
      database: {
        generateId() {
          return uuid();
        },
      },
    },
    // No secondaryStorage - using database only
  };
}
