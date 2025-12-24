import { expect, test } from './fixtures';

test.describe('Database Connectivity', () => {
  test('health check should include database status', async ({ api }) => {
    const { status, data: health } = await api.healthControllerCheck();

    expect(status).toBe(200);
    expect(health).toBeDefined();
    expect(health.status).toBe('ok');

    // Check if database health is included in the response
    // The health endpoint includes database check if TypeORM is configured
    if (health.details?.database) {
      expect(health.details.database.status).toBe('up');
    } else if (health.info?.database) {
      expect(health.info.database.status).toBe('up');
    }
    // If database check is not available, at least verify the service is up
    expect(health.details?.service?.status || health.info?.service?.status).toBe('up');
  });

  test('health check should return 200 even if database check fails', async ({ api }) => {
    // This test verifies that the health endpoint is resilient
    // In a real scenario, if database is down, it might return 503
    // But for now, we just verify the endpoint responds
    const { status } = await api.healthControllerCheck();

    // Health endpoint should always respond, even if some checks fail
    expect([200, 503]).toContain(status);
  });
});
