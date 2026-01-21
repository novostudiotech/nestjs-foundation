import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
// TODO: Re-enable AdminGuard once AUTH_MODULE_OPTIONS_KEY integration is fixed
// import { AdminGuard } from './admin.guard';
import { adminRegistry } from './admin-registry';

export interface AdminControllerOptions {
  /** Custom guards. Set to false to disable guards. Default: [] (no guards - TODO: AdminGuard disabled) */
  // biome-ignore lint/suspicious/noExplicitAny: Guards can be any NestJS guard class
  guards?: any[] | false;
  /** Custom API tag (default: 'Admin - {Resource}') */
  tag?: string;
  /** Custom resource name (default: extracted from Entity.name) */
  resource?: string;
}

/**
 * Decorator for admin controllers
 * Automatically configures routing, guards, Swagger, and registers entity
 *
 * @param entity - Entity class for automatic TypeORM registration
 * @param options - Options for configuring guards, tags, and resource name
 *
 * @example Basic usage
 * ```typescript
 * @AdminController(UserEntity)
 * @Injectable()
 * export class AdminUsersController extends BaseAdminController<UserEntity> {
 *   constructor(@InjectRepository(UserEntity) repository: Repository<UserEntity>) {
 *     super(repository);
 *   }
 * }
 * ```
 *
 * @example With custom resource name
 * ```typescript
 * @AdminController(EventEntity, { resource: 'events' })
 * @Injectable()
 * export class AdminEventsController extends BaseAdminController<EventEntity> {
 *   // Routes will be /admin/events instead of /admin/event
 * }
 * ```
 *
 * @example Without authentication (currently default - AdminGuard is disabled)
 * ```typescript
 * @AdminController(PublicDataEntity, { guards: false })
 * @Injectable()
 * export class AdminPublicDataController extends BaseAdminController<PublicDataEntity> {
 *   // No guards applied (AdminGuard is temporarily disabled)
 * }
 * ```
 *
 * @example With custom guards (when AdminGuard is re-enabled, this will be the default)
 * ```typescript
 * @AdminController(UserEntity, { guards: [AdminGuard, CustomRoleGuard] })
 * @Injectable()
 * export class AdminUsersController extends BaseAdminController<UserEntity> {}
 * ```
 */
export function AdminController(
  // biome-ignore lint/complexity/noBannedTypes: Function type needed for entity class parameter
  entity: Function,
  options: AdminControllerOptions = {}
): ClassDecorator {
  // Automatically register entity in global registry
  // Entity will be available in AdminModule via adminRegistry.getAll()
  adminRegistry.register(entity);

  // Extract resource name from Entity.name (UserEntity -> user)
  // Or use the one provided in options
  const resourceName = options.resource || entity.name.replace(/Entity$/, '').toLowerCase();

  // TODO: Re-enable AdminGuard once AUTH_MODULE_OPTIONS_KEY integration is fixed
  // const guards = options.guards === false ? [] : options.guards || [AdminGuard];
  const guards = options.guards === false ? [] : options.guards || [];
  const tag = options.tag || 'Admin';

  // biome-ignore lint/suspicious/noExplicitAny: Decorator target must be any for flexibility
  return (target: any) => {
    // Apply standard Controller with admin/ prefix
    Controller(`admin/${resourceName}`)(target);

    // Apply Swagger tag
    ApiTags(tag)(target);

    // Apply guards if any
    if (guards.length > 0) {
      UseGuards(...guards)(target);
    }

    // Store metadata for possible extensions
    Reflect.defineMetadata('admin:entity', entity, target);
    Reflect.defineMetadata('admin:resource', resourceName, target);
    Reflect.defineMetadata('admin:options', options, target);
  };
}
