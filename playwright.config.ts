import { defineConfig } from '@playwright/test';
import { config } from 'dotenv';

// Load test environment variables from .env.test
config({ path: '.env.test' });

const PORT = process.env.PORT || 13000;
const baseURL = `http://localhost:${PORT}`;

// TODO: validate by env schema
// We use TEST_DATABASE_URL here to make sure we don't accidentally run tests against production or local database defined in .env file. So we set TEST_DATABASE_URL explicitly.
const DATABASE_URL = process.env.TEST_DATABASE_URL;
const AUTH_SECRET = process.env.AUTH_SECRET;

if (!DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is not set');
}

if (!AUTH_SECRET) {
  throw new Error('AUTH_SECRET is not set');
}

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30000,
  outputDir: './e2e-results',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'API Tests',
      testMatch: '**/*.spec.ts',
    },
  ],
  webServer: {
    // Use production build for E2E tests to test against production-like environment
    // In CI, build step runs before E2E tests, so dist/ will exist
    // For local development, run `pnpm build` first
    command: process.env.CI ? `NODE_ENV=test pnpm start:prod` : `NODE_ENV=test pnpm run dev`,
    stdout: process.env.DEBUG ? 'pipe' : 'ignore',
    stderr: process.env.DEBUG ? 'pipe' : 'ignore',
    url: `${baseURL}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    env: {
      NODE_ENV: 'test',
      PORT: PORT.toString(),
      DATABASE_URL,
      AUTH_SECRET,
    },
  },
});
