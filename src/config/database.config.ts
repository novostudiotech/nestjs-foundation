import { DataSourceOptions } from 'typeorm';

// databaseConfig is validated via ConfigModule.forRoot validate function

/**
 * Parse database URL to extract connection parameters
 */
export function parseDatabaseUrl(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl);
    return {
      database: url.pathname.slice(1) || url.pathname, // Remove leading '/' or use pathname as is
      user: url.username,
      password: url.password,
      host: url.hostname,
      port: parseInt(url.port || '5432', 10),
      ssl: url.searchParams.get('sslmode') === 'require' || url.searchParams.get('ssl') === 'true',
    };
  } catch (error) {
    throw new Error(`Invalid database URL: ${error}`);
  }
}

export function getDatabaseConfig(databaseUrl: string): DataSourceOptions {
  const requiresSsl = databaseUrl.includes('sslmode=require');

  // WORKAROUND for Error: self signed certificate
  if (requiresSsl) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  // NestJS compiles TypeScript to dist/ in both development and production modes,
  // so we always use compiled .js files for entities and migrations
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: ['dist/**/*.entity.js'],
    migrations: ['dist/migrations/*.js'],
    ssl: requiresSsl ? { rejectUnauthorized: true } : false,
  };
}
