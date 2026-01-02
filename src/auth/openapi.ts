import type { betterAuth } from 'better-auth';

/**
 * Type for Better Auth instance
 */
type BetterAuthInstance = ReturnType<typeof betterAuth> & {
  options?: {
    basePath?: string;
    [key: string]: unknown;
  };
};

/**
 * Type for OpenAPI Document (simplified, compatible with Swagger)
 */
type OpenAPIDocument = {
  paths?: Record<
    string,
    {
      get?: Record<string, unknown>;
      post?: Record<string, unknown>;
      put?: Record<string, unknown>;
      delete?: Record<string, unknown>;
      patch?: Record<string, unknown>;
      head?: Record<string, unknown>;
      options?: Record<string, unknown>;
    }
  >;
  components?: Record<string, unknown>;
  tags?: Array<unknown>;
  [key: string]: unknown;
};

/**
 * Type guard to check if auth instance has api with generateOpenAPISchema
 */
function hasOpenAPISchema(auth: BetterAuthInstance): auth is BetterAuthInstance & {
  api: { generateOpenAPISchema: () => Promise<OpenAPIDocument> };
} {
  return (
    auth !== null &&
    typeof auth === 'object' &&
    'api' in auth &&
    auth.api !== null &&
    typeof auth.api === 'object' &&
    'generateOpenAPISchema' in auth.api &&
    typeof auth.api.generateOpenAPISchema === 'function'
  );
}

/**
 * Gets basePath from auth instance options
 */
function getBasePath(authInstance: BetterAuthInstance): string {
  return authInstance.options?.basePath ?? '/api/auth';
}

/**
 * Applies basePath prefix to a path
 */
function prefixPath(path: string, basePath: string): string {
  if (path.startsWith(basePath)) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}

/**
 * Adds Auth tag to all operations in a path item
 */
function addAuthTag(pathItem: Record<string, unknown>): Record<string, unknown> {
  const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
  const updated = { ...pathItem };

  for (const method of httpMethods) {
    const operation = updated[method];
    if (operation && typeof operation === 'object') {
      updated[method] = {
        ...operation,
        tags: ['Auth'],
      };
    }
  }

  return updated;
}

/**
 * Generates Better Auth OpenAPI schema with basePath prefix applied to all paths
 * @param authInstance - Better Auth instance
 * @returns OpenAPI schema with prefixed paths and Auth tags, or null if generation fails
 */
export async function generateBetterAuthOpenAPISchema(
  authInstance: BetterAuthInstance
): Promise<OpenAPIDocument | null> {
  try {
    if (!hasOpenAPISchema(authInstance)) {
      return null;
    }

    const betterAuthSchema = await authInstance.api.generateOpenAPISchema();

    if (!betterAuthSchema || !betterAuthSchema.paths) {
      return betterAuthSchema || null;
    }

    const basePath = getBasePath(authInstance);

    // Apply basePath prefix to all paths
    const authPaths: Record<string, Record<string, unknown>> = {};
    for (const [path, pathItem] of Object.entries(betterAuthSchema.paths)) {
      if (pathItem) {
        const prefixedPath = prefixPath(path, basePath);
        const updatedPathItem = addAuthTag(pathItem);
        authPaths[prefixedPath] = updatedPathItem;
      }
    }

    // Return updated schema with prefixed paths
    return {
      ...betterAuthSchema,
      paths: authPaths,
    };
  } catch (error) {
    console.warn('Failed to generate Better Auth OpenAPI schema:', error);
    return null;
  }
}
