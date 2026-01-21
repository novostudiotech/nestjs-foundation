import { expect, test } from './fixtures';

test.describe('Admin User CRUD', () => {
  test('should list users with pagination', async ({ useAuthenticatedApi, useDb }) => {
    const { api } = await useAuthenticatedApi();
    const db = useDb();

    // Create additional test users
    const user2Email = `test-list-${Date.now()}-1@example.com`;
    const user3Email = `test-list-${Date.now()}-2@example.com`;

    await db.userRepo.save([
      db.userRepo.create({ email: user2Email, name: 'User 2', emailVerified: false }),
      db.userRepo.create({ email: user3Email, name: 'User 3', emailVerified: true }),
    ]);

    // Test listing users with pagination
    const response = await api.adminUsersControllerFindAll({ page: 1, perPage: 10 });

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.data).toBeInstanceOf(Array);
    expect(response.data.total).toBeGreaterThanOrEqual(3); // At least 3 users
    expect(response.data.data.length).toBeLessThanOrEqual(10);
  });

  test('should get user by id', async ({ useAuthenticatedApi, useDb }) => {
    const { api, user: testUser } = await useAuthenticatedApi();
    const db = useDb();

    // Get the user from database
    const dbUser = await db.userRepo.findOne({ where: { email: testUser.email } });
    expect(dbUser).toBeDefined();

    if (!dbUser) return;

    // Test getting user by ID
    const response = await api.adminUsersControllerFindOne(dbUser.id);

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.id).toBe(dbUser.id);
    expect(response.data.email).toBe(testUser.email);
    expect(response.data.name).toBe(testUser.name);
  });

  test('should return 404 for non-existent user', async ({ useAuthenticatedApi }) => {
    const { api } = await useAuthenticatedApi();

    const nonExistentId = '01234567-89ab-7def-0123-456789abcdef';
    const response = await api.adminUsersControllerFindOne(nonExistentId);

    expect(response.status).toBe(404);
  });

  test('should create a new user', async ({ useAuthenticatedApi, useDb }) => {
    const { api } = await useAuthenticatedApi();
    const db = useDb();

    const newUserData = {
      email: `test-create-${Date.now()}@example.com`,
      name: 'Created User',
      emailVerified: false,
    };

    // Create user via admin API
    const response = await api.adminUsersControllerCreate(newUserData);

    expect(response.status).toBe(201);
    expect(response.data).toBeDefined();
    expect(response.data.email).toBe(newUserData.email);
    expect(response.data.name).toBe(newUserData.name);
    expect(response.data.emailVerified).toBe(false);
    expect(response.data.id).toBeDefined();

    // Verify user was created in database
    const dbUser = await db.userRepo.findOne({ where: { email: newUserData.email } });
    expect(dbUser).toBeDefined();
    expect(dbUser?.email).toBe(newUserData.email);
    expect(dbUser?.name).toBe(newUserData.name);
  });

  test('should update an existing user', async ({ useAuthenticatedApi, useDb }) => {
    const { api } = await useAuthenticatedApi();
    const db = useDb();

    // Create a user to update
    const userEmail = `test-update-${Date.now()}@example.com`;
    const user = await db.userRepo.save(
      db.userRepo.create({
        email: userEmail,
        name: 'Original Name',
        emailVerified: false,
      })
    );

    const userId = user.id;

    // Update user via admin API
    const updateData = {
      name: 'Updated Name',
      emailVerified: true,
    };

    const response = await api.adminUsersControllerUpdate(userId, updateData);

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.id).toBe(userId);
    expect(response.data.name).toBe(updateData.name);
    expect(response.data.emailVerified).toBe(true);

    // Verify user was updated in database
    const dbUser = await db.userRepo.findOne({ where: { id: userId } });
    expect(dbUser).toBeDefined();
    expect(dbUser?.name).toBe(updateData.name);
    expect(dbUser?.emailVerified).toBe(true);
  });

  test('should partially update user (put with partial data)', async ({
    useAuthenticatedApi,
    useDb,
  }) => {
    const { api } = await useAuthenticatedApi();
    const db = useDb();

    // Create a user to update partially
    const userEmail = `test-partial-${Date.now()}@example.com`;
    const user = await db.userRepo.save(
      db.userRepo.create({
        email: userEmail,
        name: 'Original Name',
        emailVerified: false,
      })
    );

    const userId = user.id;

    // Update user via admin API (only update name, using PUT)
    const updateData = {
      name: 'Partially Updated Name',
    };

    const response = await api.adminUsersControllerUpdate(userId, updateData);

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.id).toBe(userId);
    expect(response.data.name).toBe(updateData.name);
    expect(response.data.email).toBe(userEmail); // Email should remain unchanged
  });

  test('should delete a user (soft delete)', async ({ useAuthenticatedApi, useDb }) => {
    const { api } = await useAuthenticatedApi();
    const db = useDb();

    // Create a user to delete
    const userEmail = `test-delete-${Date.now()}@example.com`;
    const user = await db.userRepo.save(
      db.userRepo.create({
        email: userEmail,
        name: 'To Be Deleted',
        emailVerified: false,
      })
    );

    const userId = user.id;

    // Delete user via admin API
    const response = await api.adminUsersControllerRemove(userId);

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.id).toBe(userId);

    // Verify user is soft-deleted in database
    const dbUser = await db.userRepo.findOne({ where: { id: userId }, withDeleted: true });
    expect(dbUser).toBeDefined();
    expect(dbUser?.deletedAt).toBeDefined();
    expect(dbUser?.deletedAt).not.toBeNull();

    // Verify user cannot be found without withDeleted flag
    const activeUser = await db.userRepo.findOne({ where: { id: userId } });
    expect(activeUser).toBeNull();
  });

  test('should filter users by filter parameter', async ({ useAuthenticatedApi, useDb }) => {
    const { api } = await useAuthenticatedApi();
    const db = useDb();

    // Create users with distinct emailVerified status
    const timestamp = Date.now();
    await db.userRepo.save([
      db.userRepo.create({
        email: `filter-${timestamp}-verified@example.com`,
        name: 'Verified User',
        emailVerified: true,
      }),
      db.userRepo.create({
        email: `filter-${timestamp}-unverified1@example.com`,
        name: 'Unverified User 1',
        emailVerified: false,
      }),
      db.userRepo.create({
        email: `filter-${timestamp}-unverified2@example.com`,
        name: 'Unverified User 2',
        emailVerified: false,
      }),
    ]);

    // Filter for verified users only
    const filterJson = JSON.stringify({ emailVerified: true });
    const response = await api.adminUsersControllerFindAll({
      page: 1,
      perPage: 10,
      filter: filterJson,
    });

    expect(response.status).toBe(200);
    expect(response.data.data).toBeInstanceOf(Array);

    // All returned users should be verified
    const allVerified = response.data.data.every((u: any) => u.emailVerified === true);
    expect(allVerified).toBe(true);
  });

  test('should handle pagination correctly', async ({ useAuthenticatedApi, useDb }) => {
    const { api } = await useAuthenticatedApi();
    const db = useDb();

    // Create 5 test users
    const timestamp = Date.now();
    const users = Array.from({ length: 5 }, (_, i) =>
      db.userRepo.create({
        email: `pagination-${timestamp}-${i}@example.com`,
        name: `User ${i}`,
        emailVerified: false,
      })
    );

    await db.userRepo.save(users);

    // Test first page with 2 items per page
    const page1Response = await api.adminUsersControllerFindAll({
      page: 1,
      perPage: 2,
    });
    expect(page1Response.status).toBe(200);
    expect(page1Response.data.data.length).toBe(2);
    expect(page1Response.data.total).toBeGreaterThanOrEqual(5);

    // Test second page
    const page2Response = await api.adminUsersControllerFindAll({
      page: 2,
      perPage: 2,
    });
    expect(page2Response.status).toBe(200);
    expect(page2Response.data.data.length).toBe(2);

    // First page and second page should have different users
    const page1Ids = page1Response.data.data.map((u: any) => u.id);
    const page2Ids = page2Response.data.data.map((u: any) => u.id);
    const intersection = page1Ids.filter((id: string) => page2Ids.includes(id));
    expect(intersection.length).toBe(0);
  });

  test('should not allow unauthenticated access to admin endpoints', async ({ useApi }) => {
    const api = await useApi();

    // Try to list users without authentication
    const response = await api.adminUsersControllerFindAll({ page: 1, perPage: 10 });

    expect(response.status).toBe(401);
  });

  test('should handle invalid user data gracefully', async ({ useAuthenticatedApi }) => {
    const { api } = await useAuthenticatedApi();

    // Try to create user with invalid email
    const invalidUserData = {
      email: 'not-an-email',
      name: 'Invalid User',
      emailVerified: false,
    };

    const response = await api.adminUsersControllerCreate(invalidUserData);

    expect(response.status).toBe(400);
  });
});
