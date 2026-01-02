import { DataSourceOptions } from 'typeorm';

// databaseConfig is validated via ConfigModule.forRoot validate function

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
