import { DataSource, Repository } from 'typeorm';
import { getDatabaseConfig } from '../src/config/db.config';

/**
 * Database fixture interface for E2E tests
 */
export interface DatabaseFixture {
  // Typed repositories for all entities
  userRepo: Repository<any>;
  sessionRepo: Repository<any>;
  accountRepo: Repository<any>;
  verificationRepo: Repository<any>;

  dataSource: DataSource;
}

/**
 * Singleton DataSource instance for tests
 */
let testDataSource: DataSource | null = null;

/**
 * Get or create test database connection
 */
export async function getTestDataSource(): Promise<DataSource> {
  if (testDataSource && testDataSource.isInitialized) {
    return testDataSource;
  }

  const databaseUrl = process.env.TEST_DATABASE_URL || '';

  if (!databaseUrl) {
    throw new Error('TEST_DATABASE_URL must be set for E2E tests');
  }

  // Use the same config as the application, but with test database URL
  const config = getDatabaseConfig(databaseUrl);

  testDataSource = new DataSource(config);
  await testDataSource.initialize();

  return testDataSource;
}

/**
 * Create database fixture with repositories and utilities
 */
export async function createDatabaseFixture(): Promise<DatabaseFixture> {
  const dataSource = await getTestDataSource();

  return {
    // Typed repositories using TypeORM's getRepository with table names
    // We use table names instead of entity classes to avoid decorator issues in Playwright
    userRepo: dataSource.getRepository('user'),
    sessionRepo: dataSource.getRepository('session'),
    accountRepo: dataSource.getRepository('account'),
    verificationRepo: dataSource.getRepository('verification'),

    dataSource,
  };
}

/**
 * Close test database connection
 * Should be called after all tests are done
 */
export async function closeTestDataSource(): Promise<void> {
  if (testDataSource && testDataSource.isInitialized) {
    await testDataSource.destroy();
    testDataSource = null;
  }
}
