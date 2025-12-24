import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Shared axios instance for generated API client with relaxed status handling.
 */
export const apiClient = <TData = unknown>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig
): Promise<AxiosResponse<TData>> => {
  const defaultPort = process.env.PORT ?? '13000';
  const baseURL =
    options?.baseURL ?? process.env.E2E_API_BASE_URL ?? `http://localhost:${defaultPort}`;

  return axios.request<TData>({
    baseURL,
    validateStatus: () => true,
    ...config,
    ...options,
  });
};
