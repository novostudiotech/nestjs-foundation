import { expect, test } from './fixtures';

test.describe('Swagger Documentation', () => {
  test('should serve Swagger UI at /docs', async ({ http }) => {
    const { status } = await http.get('/docs');

    expect(status).toBe(200);
  });

  test('should serve Swagger JSON at /docs-json', async ({ http }) => {
    const { status, data } = await http.get('/docs-json');

    expect(status).toBe(200);
    expect(data).toBeDefined();
    expect(data.info).toBeDefined();
    expect(data.info.title).toBe('NestJS Foundation API');
    expect(data.paths).toBeDefined();
  });
});
