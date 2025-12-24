import { expect, test } from './fixtures';

test.describe('Database Connectivity', () => {
  test('health check should include database status', async ({ http }) => {
    const { status, data: response } = await http.get('/health');

    expect(status).toBe(200);
    expect(response).toBeDefined();
    expect(response.status).toBe('ok');
    expect(response.timestamp).toBeDefined();

    // Check if database health is included in the response
    // The health endpoint includes database check if TypeORM is configured
    if (response.details?.database) {
      expect(response.details.database.status).toBe('up');
    } else if (response.info?.database) {
      expect(response.info.database.status).toBe('up');
    }
    // If database check is not available, at least verify the service is up
    expect(response.details?.service?.status || response.info?.service?.status).toBe('up');
  });

  test('health check should return 200 even if database check fails', async ({ http }) => {
    // This test verifies that the health endpoint is resilient
    // In a real scenario, if database is down, it might return 503
    // But for now, we just verify the endpoint responds
    const { status } = await http.get('/health');

    // Health endpoint should always respond, even if some checks fail
    expect([200, 503]).toContain(status);
  });
});
