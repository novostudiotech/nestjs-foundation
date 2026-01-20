/**
 * Dotenv configuration
 * Loads environment variables based on APP_ENV
 *
 * Sets defaults:
 * - NODE_ENV: 'development' (how code runs: development/production)
 * - APP_ENV: 'local' (where code is deployed: local/test/dev/stage/production)
 *
 * Priority (first found wins):
 * 1. .env.{APP_ENV} (e.g., .env.test, .env.production)
 * 2. .env (fallback)
 */

const { config } = require('dotenv');
const { existsSync } = require('node:fs');
const { resolve } = require('node:path');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.APP_ENV = process.env.APP_ENV || 'local';

const appEnv = process.env.APP_ENV;

const envFiles = [`.env.${appEnv}`, '.env'];

// Load first existing file
for (const file of envFiles) {
  const path = resolve(process.cwd(), file);
  if (existsSync(path)) {
    console.log(`[dotenv] Loading environment from: ${file}`);
    config({ path });
    break;
  }
}
