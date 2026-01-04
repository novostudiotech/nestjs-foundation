import { test as base, expect } from '@playwright/test';
import { AxiosInstance } from 'axios';
import { type ApiClient, createApiClient } from './api';
import { createAxiosInstance } from './api/factory';
import { createDatabaseFixture, type DatabaseFixture } from './db';

/**
 * Test user information
 */
export interface TestUser {
  email: string;
  name: string;
  password: string;
}

/**
 * Hook-style test fixtures inspired by React hooks
 */
export const test = base.extend<{
  /**
   * HTTP client hook - provides direct axios instance access
   *
   * @example
   * ```typescript
   * test('http test', async ({ useHttp }) => {
   *   const http = useHttp();
   *   const response = await http.get('/health');
   *   expect(response.status).toBe(200);
   * });
   * ```
   */
  useHttp: () => AxiosInstance;

  /**
   * API client hook - provides typed API client access (unauthenticated)
   *
   * @example
   * ```typescript
   * test('api test', async ({ useApi }) => {
   *   const api = await useApi();
   *   const response = await api.getSession();
   *   expect(response).toBeDefined();
   * });
   * ```
   */
  useApi: () => Promise<ApiClient>;

  /**
   * Authenticated API client hook - provides typed API client with user authentication
   *
   * @example
   * ```typescript
   * test('authenticated api test', async ({ useAuthenticatedApi }) => {
   *   const { api, user } = await useAuthenticatedApi();
   *   const response = await api.getSession();
   *   expect(response.data?.user.email).toBe(user.email);
   * });
   *
   * test('custom user test', async ({ useAuthenticatedApi }) => {
   *   const { api, user } = await useAuthenticatedApi({ name: 'Custom User' });
   *   const response = await api.getSession();
   *   expect(user.name).toBe('Custom User');
   * });
   *
   * test('multi-user test', async ({ useAuthenticatedApi }) => {
   *   const { api: api1, user: user1 } = await useAuthenticatedApi({ name: 'User 1' });
   *   const { api: api2, user: user2 } = await useAuthenticatedApi({ name: 'User 2' });
   *   // api1 and api2 are authenticated as different users
   * });
   * ```
   */
  useAuthenticatedApi: (userData?: Partial<TestUser>) => Promise<{
    api: ApiClient;
    user: TestUser;
  }>;

  /**
   * Database hook - provides access to TypeORM repositories and database utilities
   *
   * @example
   * ```typescript
   * test('database test', async ({ useDb }) => {
   *   const db = useDb();
   *
   *   // Access typed repositories
   *   const user = await db.userRepo.findOne({ where: { email: 'test@example.com' } });
   *   expect(user).toBeDefined();
   *
   *   // Manual cleanup when needed
   *   await db.cleanup();
   *
   *   // Raw queries via DataSource
   *   const result = await db.dataSource.query('SELECT COUNT(*) FROM "user"');
   * });
   * ```
   */
  useDb: () => DatabaseFixture;
}>({
  useHttp: async ({ baseURL }, use) => {
    const hook = () => createAxiosInstance({ baseURL });
    await use(hook);
  },

  useApi: async ({ baseURL }, use) => {
    const hook = async (): Promise<ApiClient> => {
      return createApiClient({ baseURL });
    };
    await use(hook);
  },

  useAuthenticatedApi: async ({ baseURL }, use) => {
    const hook = async (
      userData?: Partial<TestUser>
    ): Promise<{
      api: ApiClient;
      user: TestUser;
    }> => {
      const api = createApiClient({ baseURL });

      const user: TestUser = {
        email:
          userData?.email ||
          `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
        name: userData?.name || 'Test User',
        password: userData?.password || 'TestPassword123!',
      };

      // Register and sign in
      await api.signUpWithEmailAndPassword({
        email: user.email,
        name: user.name,
        password: user.password,
      });

      await api.signInEmail({
        email: user.email,
        password: user.password,
      });

      return { api, user };
    };

    await use(hook);
  },

  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires object destructuring even if empty
  useDb: async ({}, use) => {
    const dbFixture = await createDatabaseFixture();

    await use(() => dbFixture);
  },
});

export { expect };
