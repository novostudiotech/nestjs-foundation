import { test as base, expect } from '@playwright/test';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * HTTP Client for API testing
 */
export interface HttpClient {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
}

/**
 * HTTP client fixture - wraps axios and returns both status and data
 */
export const test = base.extend<{
  http: HttpClient;
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
