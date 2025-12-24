import { expect, test } from './fixtures';

test.describe('Health Check', () => {
  test('should return 200 OK for health endpoint', async ({ http }) => {
    const { status, data: response } = await http.get('/health');

    expect(status).toBe(200);
    expect(response).toBeDefined();
    expect(response.status).toBe('ok');
    expect(response.timestamp).toBeDefined();
  });
});
