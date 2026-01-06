import { expect, test } from './fixtures';

test.describe('Notifications Module', () => {
  test('should handle missing email configuration gracefully', async ({ useApi }) => {
    const api = await useApi();

    // Test that the app starts successfully even without email configuration
    // The email channel should report as not configured but not crash the app
    const healthResponse = await api.getHealth();
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.data.status).toBe('ok');
  });

  test('should register user successfully (notifications module does not block auth)', async ({
    useApi,
  }) => {
    const api = await useApi();
    const testUser = {
      email: `test-notifications-${Date.now()}@example.com`,
      name: 'Test Notifications User',
      password: 'TestPassword123!',
    };

    // Registration should work even if email sending fails
    // (notifications are fire-and-forget, don't block the main flow)
    const signUpResponse = await api.signUpWithEmailAndPassword({
      email: testUser.email,
      name: testUser.name,
      password: testUser.password,
    });

    expect(signUpResponse.status).toBe(200);
    expect(signUpResponse.data).toBeDefined();
  });
});

/**
 * Note: Testing actual email sending requires:
 * 1. Valid RESEND_API_KEY in test environment
 * 2. Verified domain in Resend
 * 3. Test email addresses
 *
 * For integration tests with real email sending, create a separate test file
 * and mark it with @slow tag or skip by default.
 *
 * Example integration test structure:
 *
 * test.describe('Email Integration', () => {
 *   test.skip('should send OTP email via Resend', async () => {
 *     // Requires RESEND_API_KEY and EMAIL_FROM to be set
 *     // Test actual email delivery
 *   });
 * });
 */
