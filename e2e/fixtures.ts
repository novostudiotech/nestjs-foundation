import { test as base, expect } from '@playwright/test';
import axios, { AxiosInstance } from 'axios';
import { getNestJSFoundationAPI } from './api';
import { extractCookies } from './cookies.util';

/**
 * HTTP client fixture - wraps axios and returns both status and data
 */
export const test = base.extend<{
  http: AxiosInstance;
  api: ReturnType<typeof getNestJSFoundationAPI>;
  authenticatedUser: {
    cookies: string;
    testUser: {
      email: string;
      name: string;
      password: string;
    };
  };
}>({
  http: async ({ baseURL }, use) => {
    const client = axios.create({
      baseURL,
      validateStatus: () => true, // Don't throw on any status code
      withCredentials: true, // Enable cookies
    });

    await use(client);
  },
  api: async ({ baseURL }, use) => {
    if (baseURL) {
      process.env.E2E_API_BASE_URL = baseURL;
    }
    await use(getNestJSFoundationAPI());
  },
  authenticatedUser: async ({ http }, use) => {
    const testUser = {
      email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
      name: 'Test User',
      password: 'TestPassword123!',
    };

    // Register and sign in
    await http.post('/auth/sign-up/email', {
      email: testUser.email,
      name: testUser.name,
      password: testUser.password,
    });

    const signInResponse = await http.post('/auth/sign-in/email', {
      email: testUser.email,
      password: testUser.password,
    });

    const cookies = extractCookies(signInResponse.headers);

    await use({ cookies: cookies || '', testUser });
  },
});

export { expect };
