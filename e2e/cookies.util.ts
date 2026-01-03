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
 * Helper function to extract cookies from response headers.
 * Extracts name=value pairs from Set-Cookie headers and returns them as a Cookie header string.
 */
export function extractCookies(headers: Record<string, unknown>): string {
  const setCookie = headers['set-cookie'];
  if (!Array.isArray(setCookie)) {
    return '';
  }

  const cookies = setCookie.reduce<Record<string, string>>((acc, cookie) => {
    // Extract name=value from Set-Cookie header (ignore attributes like Path, HttpOnly, etc.)
    const nameValue = cookie.split(';')[0]?.trim();
    if (nameValue) {
      // Use cookie.parse() to properly handle values containing '=' (e.g., base64-encoded JWT tokens)
      Object.assign(acc, parse(nameValue));
    }
    return acc;
  }, {});

  return formatCookies(cookies);
}

/**
 * Helper function to merge cookies from two Cookie header strings.
 * New cookies override existing ones with the same name.
 */
export function mergeCookies(existing: string, newCookies: string): string {
  const cookies = {
    ...(existing ? parse(existing) : {}),
    ...(newCookies ? parse(newCookies) : {}),
  };
  // Filter out undefined values and format
  return formatCookies(
    Object.fromEntries(
      Object.entries(cookies).filter(([, value]) => value !== undefined)
    ) as Record<string, string>
  );
}
