import { config } from 'dotenv';
import { defineConfig } from 'orval';

config();

const PORT = process.env.PORT || 3000;

export default defineConfig({
  e2eApi: {
    output: {
      mode: 'split',
      target: 'e2e/api-client/generated.ts',
      schemas: 'e2e/api-client/model',
      client: 'axios',
      mock: false,
      biome: true,
      override: {
        mutator: {
          path: 'e2e/api-client/axios.ts',
          name: 'apiClient',
        },
      },
    },
    input: {
      target: `http://localhost:${PORT}/docs-json`,
    },
  },
});
