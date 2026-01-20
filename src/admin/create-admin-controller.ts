import type { Type } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminController, AdminControllerOptions } from './admin-controller.decorator';
import { BaseAdminController } from './base-admin.controller';

/**
 * Factory function to create admin controllers with minimal boilerplate
 *
 * Use this for CRUD controllers without custom logic.
 * For controllers with custom endpoints, extend BaseAdminController directly.
 *
 * @param entityClass - The Entity class to create admin controller for
 * @param options - Optional configuration for the controller
 *
 * @example Simple usage (entity written ONCE):
 * ```typescript
 * export const AdminUsersController = createAdminController(UserEntity);
 * export const AdminAccountsController = createAdminController(AccountEntity);
 * ```
 *
 * @example With custom resource name:
 * ```typescript
 * export const AdminEventsController = createAdminController(EventEntity, {
 *   resource: 'events' // Route will be /admin/events instead of /admin/event
 * });
 * ```
 *
 * @example For custom controllers, extend BaseAdminController:
 * ```typescript
 * @AdminController(EventEntity)
 * @Injectable()
 * export class AdminEventsController extends BaseAdminController<EventEntity> {
 *   constructor(@InjectRepository(EventEntity) repository: Repository<EventEntity>) {
 *     super(repository);
 *   }
 *
 *   @Post(':id/publish')
 *   async publish(@Param('id') id: string) {
 *     // Custom logic
 *   }
 * }
 * ```
 */
export function createAdminController<T extends { id: string }>(
  entityClass: new () => T,
  options?: AdminControllerOptions
): Type<BaseAdminController<T>> {
  @AdminController(entityClass, options)
  @Injectable()
  class GeneratedAdminController extends BaseAdminController<T> {
    constructor(@InjectRepository(entityClass) repository: Repository<T>) {
      super(repository);
    }
  }

  // Set proper class name for debugging and logging
  Object.defineProperty(GeneratedAdminController, 'name', {
    value: `Admin${entityClass.name}Controller`,
    writable: false,
  });

  // Type assertion: GeneratedAdminController is a concrete implementation of BaseAdminController
  return GeneratedAdminController as Type<BaseAdminController<T>>;
}
