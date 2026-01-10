import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * Converts a wildcard pattern to a RegExp for CORS origin matching
 * Supports Better Auth-style wildcards: http://localhost:*, https://*.example.com
 *
 * @param pattern - Wildcard pattern (e.g., "http://localhost:*", "https://*.example.com")
 * @returns RegExp that matches the pattern
 */
function wildcardToRegex(pattern: string): RegExp {
  // Escape special regex characters except *
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*'); // Replace * with .*

  return new RegExp(`^${escaped}$`);
}

/**
 * Checks if an origin matches a wildcard pattern
 *
 * @param origin - Origin to check (e.g., "http://localhost:3000")
 * @param pattern - Wildcard pattern (e.g., "http://localhost:*")
 * @returns true if origin matches pattern
 */
function matchesWildcard(origin: string, pattern: string): boolean {
  // Exact match (no wildcard)
  if (!pattern.includes('*')) {
    return origin === pattern;
  }

  const regex = wildcardToRegex(pattern);
  return regex.test(origin);
}

/**
 * Parses CORS_ORIGINS environment variable and returns CORS options
 * Supports Better Auth-style wildcard patterns for convenience
 *
 * @param corsOriginsValue - Value from CORS_ORIGINS env var
 * @returns CorsOptions for NestJS
 *
 * @example
 * // Development (default)
 * getCorsOptions() // Allows localhost:* and 127.0.0.1:*
 *
 * @example
 * // Production with specific origins
 * getCorsOptions('https://example.com,https://app.example.com')
 *
 * @example
 * // Production with wildcard subdomains
 * getCorsOptions('https://*.example.com')
 *
 * @example
 * // Allow all origins (not recommended for production)
 * getCorsOptions('true')
 */
export function getCorsOptions(
  corsOriginsValue?: string
): Pick<CorsOptions, 'origin' | 'methods' | 'allowedHeaders' | 'credentials' | 'maxAge'> {
  let origin:
    | string
    | boolean
    | string[]
    | RegExp
    | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void);

  if (!corsOriginsValue) {
    // Development default: allow localhost on any port
    origin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  } else if (corsOriginsValue === 'true') {
    // Allow all origins (not recommended for production)
    origin = true;
  } else if (corsOriginsValue === 'false') {
    // Disable CORS
    origin = false;
  } else {
    // Parse comma-separated origins
    const patterns = corsOriginsValue.split(',').map((o) => o.trim());

    // Check if any pattern contains wildcard
    const hasWildcard = patterns.some((p) => p.includes('*'));

    if (hasWildcard) {
      // Use callback function for wildcard matching
      origin = (requestOrigin: string, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (e.g., mobile apps, curl, Postman)
        if (!requestOrigin) {
          callback(null, true);
          return;
        }

        // Check if origin matches any pattern
        const allowed = patterns.some((pattern) => matchesWildcard(requestOrigin, pattern));
        callback(null, allowed);
      };
    } else {
      // No wildcards, use simple array
      origin = patterns;
    }
  }

  return {
    origin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 600, // 10 minutes - cache preflight requests
  };
}

/**
 * Parses CORS_ORIGINS environment variable for Better Auth trusted origins
 * Converts to Better Auth format (supports wildcards natively)
 *
 * @param corsOriginsValue - Value from CORS_ORIGINS env var
 * @returns Array of trusted origins for Better Auth
 *
 * @example
 * // Development (default)
 * getTrustedOrigins() // ['http://localhost:*', 'http://127.0.0.1:*']
 *
 * @example
 * // Allow all origins (matches getCorsOptions('true') behavior)
 * getTrustedOrigins('true') // ['*']
 *
 * @example
 * // Production with specific origins
 * getTrustedOrigins('https://example.com,https://app.example.com')
 * // ['http://localhost:*', 'http://127.0.0.1:*', 'https://example.com', 'https://app.example.com']
 */
export function getTrustedOrigins(corsOriginsValue?: string): string[] {
  if (!corsOriginsValue) {
    // Development default: allow localhost on any port
    return ['http://localhost:*', 'http://127.0.0.1:*'];
  }

  if (corsOriginsValue === 'true') {
    // Allow all origins (matches getCorsOptions behavior)
    // Security Warning: Not recommended for production
    return ['*'];
  }

  if (corsOriginsValue === 'false') {
    return [];
  }

  // Parse comma-separated origins and always include localhost for convenience
  const origins = corsOriginsValue.split(',').map((o) => o.trim());
  return ['http://localhost:*', 'http://127.0.0.1:*', ...origins];
}
