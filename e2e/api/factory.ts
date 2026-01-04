import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { parse } from 'cookie';

/**
 * Converts a cookie object to Cookie header string format.
 */
function formatCookies(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

/**
 * Extract cookies from response headers.
 */
function extractCookies(headers: Record<string, unknown>): Record<string, string> {
  // Try both 'set-cookie' and 'Set-Cookie' (axios might normalize headers)
  const setCookie = headers['set-cookie'] || headers['Set-Cookie'];
  if (!setCookie) {
    return {};
  }

  // Handle both array and string formats
  const cookieArray = Array.isArray(setCookie) ? setCookie : [setCookie];

  return cookieArray.reduce<Record<string, string>>((acc, cookie) => {
    const nameValue = cookie.split(';')[0]?.trim();
    if (nameValue) {
      Object.assign(acc, parse(nameValue));
    }
    return acc;
  }, {});
}

/**
 * Create an axios instance with automatic cookie management.
 */
export const createAxiosInstance = ({
  baseURL = 'http://localhost:13000',
  ...config
}: AxiosRequestConfig = {}): AxiosInstance => {
  // Cookie storage for this instance
  let cookies: Record<string, string> = {};

  const axiosInstance = axios.create({
    baseURL,
    validateStatus: () => true,
    ...config,
  });

  // Add request interceptor to inject cookies
  axiosInstance.interceptors.request.use((requestConfig) => {
    if (Object.keys(cookies).length > 0) {
      requestConfig.headers.Cookie = formatCookies(cookies);
    }
    return requestConfig;
  });

  // Add response interceptor to extract and store cookies
  axiosInstance.interceptors.response.use((response) => {
    const newCookies = extractCookies(response.headers);
    // Merge new cookies with existing ones
    cookies = { ...cookies, ...newCookies };
    return response;
  });

  return axiosInstance;
};
