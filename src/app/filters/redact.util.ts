import fastRedact from 'fast-redact';

/**
 * Configuration options for the redact utility
 */
export interface RedactOptions {
  /**
   * Array of keys to redact (e.g., ['password', 'token', 'secret'])
   */
  keys: string[];

  /**
   * Maximum nesting depth for wildcard patterns (default: 3)
   * For example, with depth=3 and key='password':
   * - 'password' (top level)
   * - '*.password' (1 level deep)
   * - '*.*.password' (2 levels deep)
   * - '*.*.*.password' (3 levels deep)
   */
  depth?: number;

  /**
   * Plain paths to redact without wildcard generation (e.g., ['["x-api-key"]', '["x-auth-token"]'])
   * Use this for:
   * - Paths with special characters requiring bracket notation (hyphens, dots, etc.)
   * - Exact paths you want to redact without wildcard expansion
   * These paths are added as-is to the redaction list
   */
  plainKeys?: string[];

  /**
   * Value to replace redacted fields with (default: '[REDACTED]')
   */
  censor?: string;

  /**
   * Whether to serialize the result with JSON.stringify (default: false)
   */
  serialize?: boolean;

  /**
   * Whether to throw on primitives (default: false)
   */
  strict?: boolean;
}

/**
 * Creates a redactor function that redacts specified keys at multiple nesting levels
 *
 * @example
 * ```typescript
 * const redact = createRedactor({
 *   keys: ['password', 'token', 'secret'],
 *   depth: 3,
 *   censor: '[REDACTED]'
 * });
 *
 * const obj = {
 *   user: {
 *     data: {
 *       credentials: {
 *         password: 'secret123'
 *       }
 *     }
 *   }
 * };
 *
 * redact(obj); // password will be redacted at any depth up to 3 levels
 * ```
 *
 * @example
 * ```typescript
 * // With plain keys (e.g., for headers with hyphens)
 * const redact = createRedactor({
 *   keys: ['authorization', 'cookie'],
 *   plainKeys: ['["x-api-key"]', '["x-auth-token"]'],
 *   depth: 0
 * });
 * ```
 */
export function createRedactor(options: RedactOptions): ReturnType<typeof fastRedact> {
  const {
    keys,
    depth = 3,
    plainKeys = [],
    censor = '[REDACTED]',
    serialize = false,
    strict = false,
  } = options;

  if (!keys || keys.length === 0) {
    throw new Error('redact.util - keys array must not be empty');
  }

  if (depth < 0) {
    throw new Error('redact.util - depth must be a non-negative number');
  }

  // Generate paths for all keys at all nesting levels
  const paths: string[] = [];

  for (const key of keys) {
    // Add top-level key (e.g., 'password')
    paths.push(key);

    // Add wildcard patterns for each nesting level
    // Level 1: '*.password'
    // Level 2: '*.*.password'
    // Level 3: '*.*.*.password'
    for (let level = 1; level <= depth; level++) {
      const wildcards = '*.'.repeat(level);
      paths.push(`${wildcards}${key}`);
    }
  }

  // Add plain keys without wildcard expansion (e.g., bracket notation paths)
  if (plainKeys.length > 0) {
    paths.push(...plainKeys);
  }

  return fastRedact({
    paths,
    censor,
    serialize,
    strict,
  });
}
