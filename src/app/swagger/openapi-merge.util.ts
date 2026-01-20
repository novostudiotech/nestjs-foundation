import type { OpenAPIObject } from '@nestjs/swagger';

/**
 * Utility functions for merging OpenAPI documents
 */

/**
 * Merges components from source into target
 */
function mergeComponents(
  target: OpenAPIObject['components'],
  source: OpenAPIObject['components']
): OpenAPIObject['components'] {
  if (!source) {
    return target;
  }

  if (!target) {
    return source;
  }

  const merged: OpenAPIObject['components'] = { ...target };

  // Merge each component type
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = {
        ...(merged[key] as Record<string, unknown>),
        ...(value as Record<string, unknown>),
      };
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

/**
 * Merges tags from source into target, avoiding duplicates
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: OpenAPI merging requires complex logic
function mergeTags(
  target: OpenAPIObject['tags'],
  source: OpenAPIObject['tags']
): OpenAPIObject['tags'] {
  if (!source || !Array.isArray(source)) {
    return target;
  }

  if (!target || !Array.isArray(target)) {
    return source;
  }

  const tagMap = new Map<string, { name: string; [key: string]: unknown }>();

  // Add existing tags
  for (const tag of target) {
    if (tag && typeof tag === 'object' && 'name' in tag) {
      tagMap.set(tag.name, tag as { name: string; [key: string]: unknown });
    }
  }

  // Add or merge new tags
  for (const tag of source) {
    if (tag && typeof tag === 'object' && 'name' in tag) {
      const existingTag = tagMap.get(tag.name);
      if (existingTag) {
        // Merge tag properties, keeping existing description if new one is missing
        tagMap.set(tag.name, {
          ...existingTag,
          ...(tag as { name: string; [key: string]: unknown }),
          description: (tag as { description?: string }).description ?? existingTag.description,
        });
      } else {
        tagMap.set(tag.name, tag as { name: string; [key: string]: unknown });
      }
    }
  }

  return Array.from(tagMap.values());
}

/**
 * Merges servers arrays from source into target
 */
function mergeServers(
  target: OpenAPIObject['servers'],
  source: OpenAPIObject['servers']
): OpenAPIObject['servers'] {
  if (!source || !Array.isArray(source)) {
    return target;
  }

  if (!target || !Array.isArray(target)) {
    return source;
  }

  // Combine servers, avoiding duplicates based on URL
  type ServerObject = NonNullable<OpenAPIObject['servers']>[number];
  const serverMap = new Map<string, ServerObject>();

  // Add existing servers
  for (const server of target) {
    if (server && typeof server === 'object' && 'url' in server) {
      serverMap.set(server.url, server);
    }
  }

  // Add new servers (source servers take precedence if URL matches)
  for (const server of source) {
    if (server && typeof server === 'object' && 'url' in server) {
      serverMap.set(server.url, server);
    }
  }

  return Array.from(serverMap.values());
}

/**
 * Merges security requirements from source into target
 * Note: Top-level OpenAPI security arrays use OR semantics (any alternative is valid).
 * In practice, global security is rarely used as @ApiSecurity decorator adds
 * security requirements at the operation level (in paths), which take precedence.
 */
function mergeSecurity(
  target: OpenAPIObject['security'],
  source: OpenAPIObject['security']
): OpenAPIObject['security'] {
  if (!source || !Array.isArray(source)) {
    return target;
  }

  if (!target || !Array.isArray(target)) {
    return source;
  }

  // Combine security requirements (OR semantics - expands list of valid alternatives)
  return [...target, ...source];
}

/**
 * Merges paths from source into target, combining operations for matching paths
 * When the same path exists in both documents, operations are merged rather than replaced
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: OpenAPI path merging requires complex logic
function mergePaths(
  target: OpenAPIObject['paths'],
  source: OpenAPIObject['paths']
): OpenAPIObject['paths'] {
  if (!source) {
    return target;
  }

  if (!target) {
    return source;
  }

  const merged: OpenAPIObject['paths'] = { ...target };

  // Merge each path from source
  for (const [path, sourcePathItem] of Object.entries(source)) {
    if (!sourcePathItem) {
      continue;
    }

    const targetPathItem = merged[path];

    if (!targetPathItem) {
      // Path doesn't exist in target, add it from source
      merged[path] = sourcePathItem;
    } else {
      // Path exists in both, merge operations and other properties
      const mergedPathItem = { ...targetPathItem };

      // Merge HTTP method operations (get, post, put, delete, etc.)
      // Source operations override target operations if they conflict
      const httpMethods = [
        'get',
        'put',
        'post',
        'delete',
        'options',
        'head',
        'patch',
        'trace',
      ] as const;
      for (const method of httpMethods) {
        if (sourcePathItem[method]) {
          mergedPathItem[method] = sourcePathItem[method];
        }
      }

      // Merge parameters arrays (avoid duplicates based on name + in combination)
      if (sourcePathItem.parameters || targetPathItem.parameters) {
        type ParameterItem = NonNullable<typeof targetPathItem.parameters>[number];
        const paramMap = new Map<string, ParameterItem>();

        // Helper to add parameters to map
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Parameter deduplication requires complex logic
        const addParameters = (params: typeof targetPathItem.parameters) => {
          if (!params) return;
          for (const param of params) {
            if (param && typeof param === 'object') {
              // For reference objects, use $ref as key
              if ('$ref' in param && param.$ref) {
                paramMap.set(param.$ref, param);
              } else if ('name' in param && 'in' in param) {
                // For parameter objects, use name + in as key
                paramMap.set(`${param.name}:${param.in}`, param);
              }
            }
          }
        };

        // Add target parameters first, then source (source overrides)
        addParameters(targetPathItem.parameters);
        addParameters(sourcePathItem.parameters);

        mergedPathItem.parameters = Array.from(paramMap.values());
      }

      // Merge servers arrays (reuse mergeServers function)
      mergedPathItem.servers = mergeServers(targetPathItem.servers, sourcePathItem.servers);

      // Source summary/description/$ref override target if present
      if (sourcePathItem.summary !== undefined) mergedPathItem.summary = sourcePathItem.summary;
      if (sourcePathItem.description !== undefined)
        mergedPathItem.description = sourcePathItem.description;
      if (sourcePathItem.$ref !== undefined) mergedPathItem.$ref = sourcePathItem.$ref;

      // Merge extension properties (x-*)
      Object.entries(sourcePathItem).forEach(([key, value]) => {
        if (key.startsWith('x-')) {
          (mergedPathItem as Record<string, unknown>)[key] = value;
        }
      });

      merged[path] = mergedPathItem;
    }
  }

  return merged;
}

/**
 * Merges a source OpenAPI document into a target document
 * Only properties that exist in at least one of the documents will be in the result
 * @param target - Target document (will be modified)
 * @param source - Source document to merge into target
 * @returns The merged document (same reference as target)
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: OpenAPI document merging requires complex logic
export function mergeOpenAPIDocuments(target: OpenAPIObject, source: OpenAPIObject): OpenAPIObject {
  // Merge paths (combining operations for matching paths)
  // Only merge if source has paths
  if (source.paths) {
    const merged = mergePaths(target.paths, source.paths);
    // paths is required in OpenAPIObject, so always set it (even if empty)
    target.paths = merged || {};
  }

  // Merge components (only if source has components)
  // Result will only have components if at least one document had it
  if (source.components) {
    const merged = mergeComponents(target.components, source.components);
    // Only set if merged result is not empty
    if (merged && Object.keys(merged).length > 0) {
      target.components = merged;
    } else if (target.components) {
      // If target had components but merge resulted in empty, remove it
      target.components = undefined;
    }
  }
  // If source doesn't have components, keep target's components as is (or undefined if it didn't have it)

  // Merge tags (avoid duplicates, only if source has tags)
  // Result will only have tags if at least one document had it
  if (source.tags) {
    const merged = mergeTags(target.tags, source.tags);
    // Only set if merged result is not empty
    if (merged && merged.length > 0) {
      target.tags = merged;
    } else if (target.tags) {
      // If target had tags but merge resulted in empty, remove it
      target.tags = undefined;
    }
  }

  // Merge servers (avoid duplicates based on URL, only if source has servers)
  // Result will only have servers if at least one document had it
  if (source.servers) {
    const merged = mergeServers(target.servers, source.servers);
    // Only set if merged result is not empty
    if (merged && merged.length > 0) {
      target.servers = merged;
    } else if (target.servers) {
      // If target had servers but merge resulted in empty, remove it
      target.servers = undefined;
    }
  }

  // Merge security requirements (OR semantics - combines alternatives, only if source has security)
  // Result will only have security if at least one document had it
  // Note: Global security is rarely used in practice as operation-level security takes precedence
  if (source.security) {
    const merged = mergeSecurity(target.security, source.security);
    // Only set if merged result is not empty
    if (merged && merged.length > 0) {
      target.security = merged;
    } else if (target.security) {
      // If target had security but merge resulted in empty, remove it
      target.security = undefined;
    }
  }

  // Merge externalDocs (source takes precedence if both exist, only if source has externalDocs)
  // Result will only have externalDocs if at least one document had it
  if (source.externalDocs) {
    target.externalDocs = source.externalDocs;
  }

  // Note: 'openapi' and 'info' are intentionally not merged
  // as they should come from the main (target) document

  return target;
}
