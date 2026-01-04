import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Extended options that require an axios instance.
 */
export interface ApiClientOptions extends AxiosRequestConfig {
  axiosInstance?: AxiosInstance;
}

/**
 * Shared API client that requires explicit axiosInstance.
 */
export const request = <TData = unknown>(
  config: AxiosRequestConfig,
  { axiosInstance: instance, ...options }: ApiClientOptions = {}
): Promise<AxiosResponse<TData>> => {
  if (!instance) {
    throw new Error(
      'apiClient requires an axiosInstance. Use createApiClient() or pass { axiosInstance }.'
    );
  }

  return instance.request<TData>({
    validateStatus: () => true,
    ...config,
    ...options,
  });
};
