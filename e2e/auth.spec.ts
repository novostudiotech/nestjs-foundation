import { extractCookies, mergeCookies } from './cookies.util';
import { expect, test } from './fixtures';

test.describe('Better Auth', () => {
  test('should register a new user and then sign in', async ({ http }) => {
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      password: 'TestPassword123!',
    };

    // Step 1: Register a new user
    const signUpResponse = await http.post('/auth/sign-up/email', {
      email: testUser.email,
      name: testUser.name,
      password: testUser.password,
    });

    if (signUpResponse.status !== 200) {
      console.log('Sign up response status:', signUpResponse.status);
      console.log('Sign up response data:', signUpResponse.data);
      console.log('Sign up response headers:', signUpResponse.headers);
    }

    expect(signUpResponse.status).toBe(200);
    expect(signUpResponse.data).toBeDefined();

    // Extract cookies from sign-up response
    let cookies = extractCookies(signUpResponse.headers);

    // Step 2: Sign in with the same credentials
    const signInResponse = await http.post(
      '/auth/sign-in/email',
      {
        email: testUser.email,
        password: testUser.password,
      },
      {
        headers: cookies ? { Cookie: cookies } : undefined,
      }
    );

    expect(signInResponse.status).toBe(200);
    expect(signInResponse.data).toBeDefined();

    // Merge cookies from sign-in response
    const newCookies = extractCookies(signInResponse.headers);
    if (newCookies) {
      cookies = mergeCookies(cookies, newCookies);
    }

    // Step 3: Verify we can access protected route with session
    const sessionResponse = await http.get('/auth/get-session', {
      headers: cookies ? { Cookie: cookies } : undefined,
    });

    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.data).toBeDefined();
  });

  test('should fail to sign in with wrong password', async ({ http }) => {
    const testUser = {
      email: `test-wrong-${Date.now()}@example.com`,
      name: 'Test User',
      password: 'CorrectPassword123!',
    };

    // First, register a user
    await http.post('/auth/sign-up/email', {
      email: testUser.email,
      name: testUser.name,
      password: testUser.password,
    });

    // Try to sign in with wrong password
    const signInResponse = await http.post('/auth/sign-in/email', {
      email: testUser.email,
      password: 'WrongPassword123!',
    });

    expect(signInResponse.status).toBe(401);
  });

  test('should return null session when accessing /auth/get-session without authentication', async ({
    http,
  }) => {
    const sessionResponse = await http.get('/auth/get-session');

    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.data).toBeNull();
  });

  test('should get session via /auth/get-session endpoint', async ({ http }) => {
    const testUser = {
      email: `test-session-${Date.now()}@example.com`,
      name: 'Test User',
      password: 'TestPassword123!',
    };

    // Register and sign in
    await http.post('/auth/sign-up/email', {
      email: testUser.email,
      name: testUser.name,
      password: testUser.password,
    });

    const signInResponse = await http.post('/auth/sign-in/email', {
      email: testUser.email,
      password: testUser.password,
    });

    expect(signInResponse.status).toBe(200);

    // Extract cookies
    const cookies = extractCookies(signInResponse.headers);

    // Verify session by accessing /auth/get-session
    const sessionResponse = await http.get('/auth/get-session', {
      headers: cookies ? { Cookie: cookies } : undefined,
    });

    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.data).toBeDefined();
  });
});
