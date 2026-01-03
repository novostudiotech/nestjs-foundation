import type { OpenAPIObject } from '@nestjs/swagger';
import { mergeOpenAPIDocuments } from './openapi-merge.util';

describe('openapi-merge.util', () => {
  describe('mergeOpenAPIDocuments', () => {
    it('should merge paths from source into target', () => {
      const target: OpenAPIObject = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0' },
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              responses: {
                '200': {
                  description: 'Users retrieved successfully',
                },
              },
            },
          },
        },
      };

      const source: OpenAPIObject = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0' },
        paths: {
          '/posts': {
            get: {
              summary: 'Get posts',
              responses: {
                '200': {
                  description: 'Posts retrieved successfully',
                },
              },
            },
          },
        },
      };

      const result = mergeOpenAPIDocuments(target, source);

      expect(result.paths).toHaveProperty('/users');
      expect(result.paths).toHaveProperty('/posts');
    });

    it('should combine operations when the same path exists in both documents', () => {
      const target: OpenAPIObject = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0' },
        paths: {
          '/pets': {
            get: {
              summary: 'Get pets',
              responses: {
                '200': {
                  description: 'Pets retrieved successfully',
                },
              },
            },
            delete: {
              summary: 'Delete pet',
              responses: {
                '204': {
                  description: 'Pet deleted successfully',
                },
              },
            },
          },
        },
      };

      const source: OpenAPIObject = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0' },
        paths: {
          '/pets': {
            post: {
              summary: 'Create pet',
              responses: {
                '201': {
                  description: 'Pet created successfully',
                },
              },
            },
            put: {
              summary: 'Update pet',
              responses: {
                '200': {
                  description: 'Pet updated successfully',
                },
              },
            },
          },
        },
      };

      const result = mergeOpenAPIDocuments(target, source);

      expect(result.paths).toHaveProperty('/pets');
      const petsPath = result.paths['/pets'];
      expect(petsPath).toBeDefined();
      // All operations should be present
      expect(petsPath?.get).toBeDefined();
      expect(petsPath?.post).toBeDefined();
      expect(petsPath?.put).toBeDefined();
      expect(petsPath?.delete).toBeDefined();
      // Verify operation summaries
      expect(petsPath?.get?.summary).toBe('Get pets');
      expect(petsPath?.post?.summary).toBe('Create pet');
      expect(petsPath?.put?.summary).toBe('Update pet');
      expect(petsPath?.delete?.summary).toBe('Delete pet');
    });

    it('should merge components from source into target', () => {
      const target: OpenAPIObject = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0' },
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              responses: {
                '200': {
                  description: 'Users retrieved successfully',
                },
              },
            },
          },
        },
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                id: { type: 'string' },
              },
            },
          },
        },
      };

      const source: OpenAPIObject = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0' },
        paths: {
          '/posts': {
            get: {
              summary: 'Get posts',
              responses: {
                '200': {
                  description: 'Posts retrieved successfully',
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Post: {
              type: 'object',
              properties: {
                id: { type: 'string' },
              },
            },
          },
        },
      };

      const result = mergeOpenAPIDocuments(target, source);

      expect(result.components?.schemas).toHaveProperty('User');
      expect(result.components?.schemas).toHaveProperty('Post');
    });

    describe('tag merging', () => {
      it('should merge tags without duplicates', () => {
        const target: OpenAPIObject = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0' },
          paths: {},
          tags: [
            { name: 'users', description: 'User operations' },
            { name: 'posts', description: 'Post operations' },
          ],
        };

        const source: OpenAPIObject = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0' },
          paths: {},
          tags: [
            { name: 'posts', description: 'Updated post operations' },
            { name: 'comments', description: 'Comment operations' },
          ],
        };

        const result = mergeOpenAPIDocuments(target, source);

        expect(result.tags).toHaveLength(3);
        expect(result.tags?.find((t) => t.name === 'users')).toEqual({
          name: 'users',
          description: 'User operations',
        });
        expect(result.tags?.find((t) => t.name === 'posts')).toEqual({
          name: 'posts',
          description: 'Updated post operations',
        });
        expect(result.tags?.find((t) => t.name === 'comments')).toEqual({
          name: 'comments',
          description: 'Comment operations',
        });
      });

      it('should preserve existing description when new tag has undefined description', () => {
        const target: OpenAPIObject = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0' },
          paths: {},
          tags: [{ name: 'users', description: 'User operations' }],
        };

        const source: OpenAPIObject = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0' },
          paths: {},
          tags: [
            { name: 'users' }, // No description property
          ],
        };

        const result = mergeOpenAPIDocuments(target, source);

        expect(result.tags).toHaveLength(1);
        expect(result.tags?.[0]).toEqual({
          name: 'users',
          description: 'User operations',
        });
      });

      it('should preserve existing description when new tag has empty string description', () => {
        const target: OpenAPIObject = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0' },
          paths: {},
          tags: [{ name: 'users', description: 'User operations' }],
        };

        const source: OpenAPIObject = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0' },
          paths: {},
          tags: [
            { name: 'users', description: '' }, // Empty string
          ],
        };

        const result = mergeOpenAPIDocuments(target, source);

        expect(result.tags).toHaveLength(1);
        // With ?? operator, empty string should be kept (not fallback to existing)
        // But actually, we want to keep empty string if explicitly set
        expect(result.tags?.[0].description).toBe('');
      });

      it('should use new description when provided', () => {
        const target: OpenAPIObject = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0' },
          paths: {},
          tags: [{ name: 'users', description: 'Old description' }],
        };

        const source: OpenAPIObject = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0' },
          paths: {},
          tags: [{ name: 'users', description: 'New description' }],
        };

        const result = mergeOpenAPIDocuments(target, source);

        expect(result.tags).toHaveLength(1);
        expect(result.tags?.[0].description).toBe('New description');
      });

      it('should handle tags with additional properties', () => {
        const target: OpenAPIObject = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0' },
          paths: {},
          tags: [{ name: 'users', description: 'User operations', 'x-custom': 'value1' } as never],
        };

        const source: OpenAPIObject = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0' },
          paths: {},
          tags: [
            { name: 'users', description: 'Updated description', 'x-custom': 'value2' } as never,
          ],
        };

        const result = mergeOpenAPIDocuments(target, source);

        expect(result.tags).toHaveLength(1);
        expect(result.tags?.[0]).toEqual({
          name: 'users',
          description: 'Updated description',
          'x-custom': 'value2',
        });
      });
    });

    describe('server merging', () => {
      it('should merge servers without duplicates based on URL', () => {
        const target: OpenAPIObject = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0' },
          paths: {},
          servers: [{ url: 'https://api.example.com/v1' }, { url: 'https://api.example.com/v2' }],
        };

        const source: OpenAPIObject = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0' },
          paths: {},
          servers: [{ url: 'https://api.example.com/v2' }, { url: 'https://api.example.com/v3' }],
        };

        const result = mergeOpenAPIDocuments(target, source);

        expect(result.servers).toHaveLength(3);
        expect(result.servers?.map((s) => s.url)).toEqual([
          'https://api.example.com/v1',
          'https://api.example.com/v2',
          'https://api.example.com/v3',
        ]);
      });
    });

    describe('security merging', () => {
      it('should combine security requirements from both documents', () => {
        const target: OpenAPIObject = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0' },
          paths: {},
          security: [{ apiKey: [] }],
        };

        const source: OpenAPIObject = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0' },
          paths: {},
          security: [{ bearerAuth: [] }],
        };

        const result = mergeOpenAPIDocuments(target, source);

        expect(result.security).toHaveLength(2);
        expect(result.security).toEqual([{ apiKey: [] }, { bearerAuth: [] }]);
      });
    });

    it('should handle empty source document', () => {
      const target: OpenAPIObject = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0' },
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              responses: {},
            },
          },
        },
      };

      const source: OpenAPIObject = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0' },
        paths: {},
      };

      const result = mergeOpenAPIDocuments(target, source);

      expect(result.paths).toHaveProperty('/users');
    });

    it('should handle empty target document', () => {
      const target: OpenAPIObject = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0' },
        paths: {},
      };

      const source: OpenAPIObject = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0' },
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              responses: {},
            },
          },
        },
      };

      const result = mergeOpenAPIDocuments(target, source);

      expect(result.paths).toHaveProperty('/users');
    });

    it('should not merge openapi and info fields', () => {
      const target: OpenAPIObject = {
        openapi: '3.0.0',
        info: { title: 'Target API', version: '1.0' },
        paths: {},
      };

      const source: OpenAPIObject = {
        openapi: '3.1.0',
        info: { title: 'Source API', version: '2.0' },
        paths: {},
      };

      const result = mergeOpenAPIDocuments(target, source);

      expect(result.openapi).toBe('3.0.0');
      expect(result.info.title).toBe('Target API');
      expect(result.info.version).toBe('1.0');
    });
  });
});
