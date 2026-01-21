import { config } from 'dotenv';
import { defineConfig } from 'orval';

config();

const PORT = process.env.PORT || 3000;

export default defineConfig({
  e2eApi: {
    output: {
      mode: 'split',
      target: 'e2e/api/generated.ts',
      schemas: 'e2e/api/model',
      client: 'axios-functions',
      mock: false,
      biome: true,
      override: {
        mutator: {
          path: 'e2e/api/mutator.ts',
          name: 'request',
        },
      },
    },
    input: {
      target: `http://localhost:${PORT}/docs-json`,
      // Orval 8 requires OpenAPI 3.1.0
      // The OpenAPI version is set to 3.1.0 in main.ts
    },
  },
});
