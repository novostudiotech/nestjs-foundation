import { test as base, expect } from '@playwright/test';
import axios, { AxiosInstance } from 'axios';

/**
 * HTTP client fixture - wraps axios and returns both status and data
 */
export const test = base.extend<{
  http: AxiosInstance;
}>({
  http: async ({ baseURL }, use) => {
    const client = axios.create({
      baseURL,
      validateStatus: () => true, // Don't throw on any status code
    });

    await use(client);
  },
});

export { expect };
