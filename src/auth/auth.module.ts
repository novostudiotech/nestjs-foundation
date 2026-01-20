import { Module } from '@nestjs/common';
import {
  AdminAccountsController,
  AdminSessionsController,
  AdminUsersController,
  AdminVerificationsController,
} from './auth.admin-controller';

/**
 * Auth module
 * Provides admin controllers for auth entities
 *
 * Admin controllers are auto-registered via @AdminController decorator:
 * - Entities are automatically added to AdminModule.adminRegistry
 * - AdminModule.forRoot() registers all entities with TypeORM globally
 * - Repositories are available via @InjectRepository without importing TypeOrmModule
 * - AdminDiscoveryService can introspect all admin controllers at runtime
 *
 * No TypeOrmModule.forFeature needed!
 * AdminModule is @Global() and provides repositories for all registered entities.
 */
@Module({
  controllers: [
    AdminUsersController,
    AdminAccountsController,
    AdminSessionsController,
    AdminVerificationsController,
  ],
})
export class AuthControllersModule {}
