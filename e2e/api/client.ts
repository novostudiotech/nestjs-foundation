import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { createAxiosInstance } from './factory';
import * as generatedApi from './generated';

/**
 * Type helper to extract function types from the generated API
 */
type GeneratedApiFunctions = {
  [K in keyof typeof generatedApi]: (typeof generatedApi)[K] extends (...args: never[]) => unknown
    ? (typeof generatedApi)[K]
    : never;
};

/**
 * API Client instance with all generated API methods bound to a specific axios instance.
 */
export type ApiClient = GeneratedApiFunctions;

/**
 * Create an API client instance with its own axios instance and cookie jar.
 * Each instance maintains separate sessions, allowing you to test multiple users simultaneously.
 *
 * @param config - Optional axios configuration
 * @returns API client instance with all generated methods
 *
 * @example
 * ```typescript
 * const api1 = createApiClient();
 * const api2 = createApiClient();
 *
 * await api1.signInEmail({ email: 'user1@test.com', password: 'pass1' });
 * await api2.signInEmail({ email: 'user2@test.com', password: 'pass2' });
 *
 * const session1 = await api1.getSession(); // user1's session
 * const session2 = await api2.getSession(); // user2's session
 * ```
 */
export const createApiClient = (config?: AxiosRequestConfig): ApiClient => {
  const axiosInstance: AxiosInstance = createAxiosInstance(config);

  // biome-ignore lint/suspicious/noExplicitAny: Proxy requires any for dynamic property access
  return new Proxy(generatedApi as any, {
    get(target, prop: string | symbol) {
      const value = target[prop];

      // Only wrap functions
      if (typeof value === 'function') {
        // biome-ignore lint/suspicious/noExplicitAny: Dynamic function wrapping requires any
        return (...args: any[]) => {
          // Generated functions have signature: (body?, params?, options?)
          // The last parameter is always options (SecondParameter<typeof apiClient>)
          // We need to inject axiosInstance into the options parameter

          const paramCount = value.length;

          // Fill missing parameters with undefined up to paramCount - 1
          while (args.length < paramCount - 1) {
            args.push(undefined);
          }

          // Now handle the last parameter (options)
          if (args.length === paramCount) {
            // All parameters provided, merge axiosInstance into last one
            const lastArgIndex = args.length - 1;
            const lastArg = args[lastArgIndex];

            if (lastArg !== undefined && lastArg !== null && typeof lastArg === 'object') {
              args[lastArgIndex] = { ...lastArg, axiosInstance };
            } else {
              // Last arg is not an options object, replace it
              args[lastArgIndex] = { axiosInstance };
            }
          } else {
            // Options parameter not provided, add it
            args.push({ axiosInstance });
          }

          return value(...args);
        };
      }

      return value;
    },
  }) as ApiClient;
};
