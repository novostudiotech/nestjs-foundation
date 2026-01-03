import type { OpenAPIObject } from '@nestjs/swagger';
import type { betterAuth } from 'better-auth';
import type { generator, Path } from 'better-auth/plugins';

// Extract types from OpenAPIObject
type PathItemObject = NonNullable<OpenAPIObject['paths']>[string];
type OperationObject = NonNullable<PathItemObject['get']>;

/**
 * Type for Better Auth instance
 * The options property is already part of the Auth type returned by betterAuth
 */
type BetterAuthInstance = ReturnType<typeof betterAuth>;

/**
 * Extract response type from generateOpenAPISchema endpoint
 * Uses the generator function return type from the openAPI plugin
 * This avoids importing the actual auth instance
 */
type BetterAuthOpenAPIDocument = Awaited<ReturnType<typeof generator>>;

/**
 * Type guard to check if auth instance has api with generateOpenAPISchema
 */
function hasOpenAPISchema(auth: Pick<BetterAuthInstance, 'api'>): auth is Pick<
  BetterAuthInstance,
  'api'
> & {
  api: { generateOpenAPISchema: () => Promise<BetterAuthOpenAPIDocument> };
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
function getBasePath(authInstance: Pick<BetterAuthInstance, 'options'>): string {
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
 * Ensures responses property exists and has required description
 * If responses is missing, adds default 200 response
 * If responses exists but lacks description, adds default description
 */
function ensureResponses(
  operation: Path['get'] | Path['post'] | undefined
): Path['get'] | Path['post'] | undefined {
  if (!operation) {
    return undefined;
  }

  // If responses is missing, add default
  if (!operation.responses) {
    return {
      ...operation,
      responses: {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
      },
    } as typeof operation;
  }

  // Ensure each response has description
  const responses = operation.responses as Record<
    string,
    { description?: string; [key: string]: unknown }
  >;

  const transformedResponses: Record<string, unknown> = {};
  for (const [statusCode, response] of Object.entries(responses)) {
    if (response && typeof response === 'object') {
      transformedResponses[statusCode] = {
        ...response,
        description: response.description ?? 'Response',
      };
    } else {
      transformedResponses[statusCode] = { description: 'Response' };
    }
  }

  return {
    ...operation,
    responses: transformedResponses,
  } as typeof operation;
}

/**
 * Adds Auth tag and ensures responses exist for all operations in a path item
 */
function addAuthTag(pathItem: Path): Path {
  const updated: Path = {};

  if (pathItem.get) {
    updated.get = ensureResponses({
      ...pathItem.get,
      tags: pathItem.get.tags ?? ['Auth'],
    });
  }

  if (pathItem.post) {
    updated.post = ensureResponses({
      ...pathItem.post,
      tags: pathItem.post.tags ?? ['Auth'],
    });
  }

  return updated;
}

/**
 * Converts Better Auth Path to NestJS Swagger PathItemObject
 * Ensures all operations have required responses property
 */
function convertPathToPathItemObject(pathItem: Path): PathItemObject {
  const converted: PathItemObject = {};

  // Convert get operation
  if (pathItem.get) {
    const operation = ensureResponses(pathItem.get);
    if (operation?.responses) {
      converted.get = {
        ...operation,
        responses: operation.responses as OperationObject['responses'],
      } as OperationObject;
    }
  }

  // Convert post operation
  if (pathItem.post) {
    const operation = ensureResponses(pathItem.post);
    if (operation?.responses) {
      converted.post = {
        ...operation,
        responses: operation.responses as OperationObject['responses'],
      } as OperationObject;
    }
  }

  // Copy other path item properties if they exist
  // Note: Better Auth Path type may not have all properties, so we check at runtime
  const pathItemAny = pathItem as Record<string, unknown>;
  if (pathItemAny.summary) converted.summary = pathItemAny.summary as string;
  if (pathItemAny.description) converted.description = pathItemAny.description as string;
  if (pathItemAny.parameters)
    converted.parameters = pathItemAny.parameters as PathItemObject['parameters'];
  if (pathItemAny.servers) converted.servers = pathItemAny.servers as PathItemObject['servers'];

  return converted;
}

/**
 * Converts Better Auth OpenAPI document to NestJS Swagger OpenAPIObject
 * This ensures type compatibility by converting Path types to PathItemObject
 */
function convertToNestJSOpenAPI(betterAuthSchema: BetterAuthOpenAPIDocument): OpenAPIObject {
  const convertedPaths: OpenAPIObject['paths'] = {};

  // Convert all paths
  if (betterAuthSchema.paths) {
    for (const [path, pathItem] of Object.entries(betterAuthSchema.paths)) {
      if (pathItem) {
        convertedPaths[path] = convertPathToPathItemObject(pathItem);
      }
    }
  }

  const result: OpenAPIObject = {
    openapi: betterAuthSchema.openapi,
    info: betterAuthSchema.info,
    paths: convertedPaths,
  };

  // Add optional properties if they exist
  if (betterAuthSchema.components) {
    result.components = betterAuthSchema.components as OpenAPIObject['components'];
  }
  if (betterAuthSchema.security) {
    result.security = betterAuthSchema.security as OpenAPIObject['security'];
  }
  if (betterAuthSchema.servers) {
    result.servers = betterAuthSchema.servers as OpenAPIObject['servers'];
  }
  if (betterAuthSchema.tags) {
    result.tags = betterAuthSchema.tags as OpenAPIObject['tags'];
  }
  const betterAuthSchemaAny = betterAuthSchema as Record<string, unknown>;
  if (betterAuthSchemaAny.externalDocs) {
    result.externalDocs = betterAuthSchemaAny.externalDocs as OpenAPIObject['externalDocs'];
  }

  return result;
}

/**
 * Generates Better Auth OpenAPI schema with basePath prefix applied to all paths
 * Ensures responses exist in all operations (required by NestJS Swagger)
 * Returns a type-compatible OpenAPIObject for NestJS Swagger
 * @param authInstance - Better Auth instance
 * @returns OpenAPI schema compatible with NestJS Swagger, or null if generation fails
 */
export async function generateBetterAuthOpenAPISchema(
  authInstance: Pick<BetterAuthInstance, 'api' | 'options'>
): Promise<OpenAPIObject | null> {
  try {
    if (!hasOpenAPISchema(authInstance)) {
      return null;
    }

    const betterAuthSchema = await authInstance.api.generateOpenAPISchema();

    if (!betterAuthSchema || !betterAuthSchema.paths) {
      // If no paths, return null instead of original schema to avoid type issues
      return null;
    }

    const basePath = getBasePath(authInstance);

    // Apply basePath prefix to all paths, add Auth tags, and ensure responses exist
    const authPaths: Record<string, Path> = {};
    for (const [path, pathItem] of Object.entries(betterAuthSchema.paths)) {
      if (pathItem) {
        const prefixedPath = prefixPath(path, basePath);
        authPaths[prefixedPath] = addAuthTag(pathItem);
      }
    }

    // Convert to NestJS Swagger compatible format
    return convertToNestJSOpenAPI({
      ...betterAuthSchema,
      paths: authPaths,
    });
  } catch (error) {
    console.warn('Failed to generate Better Auth OpenAPI schema:', error);
    return null;
  }
}
