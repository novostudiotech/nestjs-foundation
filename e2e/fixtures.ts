import { test as base, expect } from '@playwright/test';
import axios, { AxiosInstance } from 'axios';
import { getNestJSFoundationAPI } from './api-client';

/**
 * HTTP client fixture - wraps axios and returns both status and data
 */
export const test = base.extend<{
  http: AxiosInstance;
  api: ReturnType<typeof getNestJSFoundationAPI>;
}>({
  http: async ({ baseURL }, use) => {
    const client = axios.create({
      baseURL,
      validateStatus: () => true, // Don't throw on any status code
    });

    await use(client);
  },
  api: async ({ baseURL }, use) => {
    if (baseURL) {
      process.env.E2E_API_BASE_URL = baseURL;
    }
    await use(getNestJSFoundationAPI());
  },
});

export { expect };
