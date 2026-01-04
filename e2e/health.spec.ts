import { expect, test } from './fixtures';

test.describe('Health Check', () => {
  test('should return 200 OK for health endpoint', async ({ useApi }) => {
    const api = await useApi();
    const { status, data: health } = await api.healthControllerCheck();

    expect(status).toBe(200);
    expect(health).toBeDefined();
    expect(health.status).toBe('ok');
  });
});
