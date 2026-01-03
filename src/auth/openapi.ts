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
 * Valid Swagger/OpenAPI types
 */
const VALID_SWAGGER_TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object'] as const;

/**
 * Recursively normalizes a schema object to fix Swagger validation errors
 * Removes invalid type definitions and recursively processes nested properties
 * Fixes issues where type is an array (e.g., ["string", "null"]) which is not valid in OpenAPI
 */
function normalizeSchemaRecursive(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const schemaObj = schema as Record<string, unknown>;
  const normalized: Record<string, unknown> = { ...schemaObj };

  // Normalize type if it exists
  if (normalized.type) {
    // If type is an array (e.g., ["string", "null"]), convert it to proper OpenAPI format
    if (Array.isArray(normalized.type)) {
      const typeArray = normalized.type as unknown[];
      const nonNullTypes = typeArray.filter((t) => t !== null && t !== 'null');
      const hasNull = typeArray.includes(null) || typeArray.includes('null');

      if (nonNullTypes.length === 0) {
        // Only null, remove type
        delete normalized.type;
      } else if (nonNullTypes.length === 1) {
        // Single type with optional null
        const singleType = nonNullTypes[0];
        if (
          typeof singleType === 'string' &&
          VALID_SWAGGER_TYPES.includes(singleType as (typeof VALID_SWAGGER_TYPES)[number])
        ) {
          normalized.type = singleType;
          if (hasNull) {
            normalized.nullable = true;
          }
        } else {
          // Invalid type, remove it
          delete normalized.type;
        }
      } else {
        // Multiple types - use oneOf (but this is complex, so for now just use the first valid type)
        const firstValidType = nonNullTypes.find(
          (t) =>
            typeof t === 'string' &&
            VALID_SWAGGER_TYPES.includes(t as (typeof VALID_SWAGGER_TYPES)[number])
        );
        if (firstValidType) {
          normalized.type = firstValidType;
          if (hasNull) {
            normalized.nullable = true;
          }
        } else {
          delete normalized.type;
        }
      }
    } else if (typeof normalized.type === 'string') {
      // Type is a string, validate it
      if (!VALID_SWAGGER_TYPES.includes(normalized.type as (typeof VALID_SWAGGER_TYPES)[number])) {
        // Remove invalid type
        delete normalized.type;
      }
    } else {
      // Type is neither string nor array, remove it
      delete normalized.type;
    }
  }

  // Recursively normalize properties
  if (normalized.properties && typeof normalized.properties === 'object') {
    const properties = normalized.properties as Record<string, unknown>;
    const normalizedProperties: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(properties)) {
      normalizedProperties[key] = normalizeSchemaRecursive(value);
    }

    normalized.properties = normalizedProperties;
  }

  // Recursively normalize items (for arrays)
  if (normalized.items && typeof normalized.items === 'object') {
    normalized.items = normalizeSchemaRecursive(normalized.items);
  } else if (normalized.type === 'array' && !normalized.items) {
    // If type is array but items is missing, add default items
    normalized.items = { type: 'string' };
  }

  // Recursively normalize allOf, anyOf, oneOf
  for (const key of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (normalized[key] && Array.isArray(normalized[key])) {
      normalized[key] = (normalized[key] as unknown[]).map((item) =>
        normalizeSchemaRecursive(item)
      );
    }
  }

  return normalized;
}

/**
 * Normalizes requestBody schema to fix Swagger validation errors
 * Fixes issues where properties have incorrect type definitions
 */
function normalizeRequestBodySchema(schema: unknown): unknown {
  return normalizeSchemaRecursive(schema);
}

/**
 * Normalizes requestBody to fix Swagger validation errors
 */
function normalizeRequestBody(requestBody: unknown): unknown {
  if (!requestBody || typeof requestBody !== 'object') {
    return requestBody;
  }

  const body = requestBody as Record<string, unknown>;

  // If requestBody has content, normalize schemas within it
  if (body.content && typeof body.content === 'object') {
    const content = body.content as Record<string, unknown>;
    const normalizedContent: Record<string, unknown> = {};

    for (const [contentType, contentValue] of Object.entries(content)) {
      if (contentValue && typeof contentValue === 'object') {
        const contentObj = contentValue as Record<string, unknown>;
        if (contentObj.schema) {
          normalizedContent[contentType] = {
            ...contentObj,
            schema: normalizeRequestBodySchema(contentObj.schema),
          };
        } else {
          normalizedContent[contentType] = contentValue;
        }
      } else {
        normalizedContent[contentType] = contentValue;
      }
    }

    return {
      ...body,
      content: normalizedContent,
    };
  }

  return requestBody;
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

  // Normalize requestBody if it exists
  const operationAny = operation as Record<string, unknown>;
  const normalizedOperation = { ...operation };
  if ('requestBody' in operationAny && operationAny.requestBody) {
    (normalizedOperation as Record<string, unknown>).requestBody = normalizeRequestBody(
      operationAny.requestBody
    );
  }

  // If responses is missing, add default
  if (!normalizedOperation.responses) {
    return {
      ...normalizedOperation,
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
  const responses = normalizedOperation.responses as Record<
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
    ...normalizedOperation,
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
 * Normalizes parameters to fix Swagger validation errors
 * Recursively normalizes schema in each parameter
 */
function normalizeParameters(parameters: unknown): unknown {
  if (!Array.isArray(parameters)) {
    return parameters;
  }

  return parameters.map((param) => {
    if (!param || typeof param !== 'object') {
      return param;
    }

    const paramObj = param as Record<string, unknown>;
    const normalized: Record<string, unknown> = { ...paramObj };

    // Normalize schema if it exists
    if (normalized.schema) {
      normalized.schema = normalizeSchemaRecursive(normalized.schema);
    }

    return normalized;
  });
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
      const operationAny = operation as Record<string, unknown>;
      const convertedOperation: Record<string, unknown> = {
        ...operation,
        responses: operation.responses as OperationObject['responses'],
      };

      // Normalize parameters if they exist
      if ('parameters' in operationAny && operationAny.parameters) {
        convertedOperation.parameters = normalizeParameters(operationAny.parameters);
      }

      converted.get = convertedOperation as unknown as OperationObject;
    }
  }

  // Convert post operation
  if (pathItem.post) {
    const operation = ensureResponses(pathItem.post);
    if (operation?.responses) {
      const operationAny = operation as Record<string, unknown>;
      const convertedOperation: Record<string, unknown> = {
        ...operation,
        responses: operation.responses as OperationObject['responses'],
      };

      // Normalize parameters if they exist
      if ('parameters' in operationAny && operationAny.parameters) {
        convertedOperation.parameters = normalizeParameters(operationAny.parameters);
      }

      converted.post = convertedOperation as unknown as OperationObject;
    }
  }

  // Copy other path item properties if they exist
  // Note: Better Auth Path type may not have all properties, so we check at runtime
  const pathItemAny = pathItem as Record<string, unknown>;
  if (pathItemAny.summary) converted.summary = pathItemAny.summary as string;
  if (pathItemAny.description) converted.description = pathItemAny.description as string;
  if (pathItemAny.parameters) {
    converted.parameters = normalizeParameters(
      pathItemAny.parameters
    ) as PathItemObject['parameters'];
  }
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
