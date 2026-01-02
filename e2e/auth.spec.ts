import { expect, test } from './fixtures';

/**
 * Helper function to extract cookies from response headers
 */
function extractCookies(headers: Record<string, unknown>): string {
  const setCookie = headers['set-cookie'];
  if (Array.isArray(setCookie)) {
    // Extract cookie name and value from Set-Cookie header
    // Format: "cookieName=value; Path=/; HttpOnly; SameSite=Lax"
    return setCookie
      .map((cookie) => {
        const parts = cookie.split(';');
        return parts[0]?.trim();
      })
      .filter(Boolean)
      .join('; ');
  }
  return '';
}

/**
 * Helper function to merge cookies
 */
function mergeCookies(existing: string, newCookies: string): string {
  const existingMap = new Map<string, string>();
  existing.split(';').forEach((cookie) => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      existingMap.set(name, value);
    }
  });

  newCookies.split(';').forEach((cookie) => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      existingMap.set(name, value);
    }
  });

  return Array.from(existingMap.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

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
    const profileResponse = await http.get('/me', {
      headers: cookies ? { Cookie: cookies } : undefined,
    });

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.data).toBeDefined();
    expect(profileResponse.data.user).toBeDefined();
    expect(profileResponse.data.user.email).toBe(testUser.email);
    expect(profileResponse.data.user.name).toBe(testUser.name);
    expect(profileResponse.data.session).toBeDefined();
    expect(profileResponse.data.session.id).toBeDefined();
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

  test('should fail to access protected route without authentication', async ({ http }) => {
    const profileResponse = await http.get('/me');

    expect(profileResponse.status).toBe(401);
  });
});
