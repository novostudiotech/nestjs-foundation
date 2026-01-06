import { DataSource } from 'typeorm';
import { getDatabaseConfig } from './app/config/db.config';

// DATABASE_URL is loaded via NODE_OPTIONS='-r dotenv/config' in package.json scripts
const databaseUrl = process.env.DATABASE_URL || '';

export default new DataSource(getDatabaseConfig(databaseUrl));
