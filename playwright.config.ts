import { defineConfig } from '@playwright/test';
import { config } from 'dotenv';

// Load test environment variables from .env.test
config({ path: '.env.test' });

const PORT = process.env.PORT || 13000;
const baseURL = `http://localhost:${PORT}`;

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
    command: 'NODE_ENV=test pnpm run dev',
    stdout: process.env.DEBUG ? 'pipe' : 'ignore',
    stderr: process.env.DEBUG ? 'pipe' : 'ignore',
    url: `${baseURL}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    env: {
      NODE_ENV: 'test',
      PORT: PORT.toString(),
    },
  },
});
