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
          description: (tag as { description?: string }).description || existingTag.description,
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

  // Combine security requirements (both arrays are applied)
  return [...target, ...source];
}

/**
 * Merges a source OpenAPI document into a target document
 * Only properties that exist in at least one of the documents will be in the result
 * @param target - Target document (will be modified)
 * @param source - Source document to merge into target
 * @returns The merged document (same reference as target)
 */
export function mergeOpenAPIDocuments(target: OpenAPIObject, source: OpenAPIObject): OpenAPIObject {
  // Merge paths (source paths override target paths with same key)
  // Only merge if source has paths
  if (source.paths) {
    target.paths = {
      ...target.paths,
      ...source.paths,
    };
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

  // Merge security requirements (combine both arrays, only if source has security)
  // Result will only have security if at least one document had it
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
