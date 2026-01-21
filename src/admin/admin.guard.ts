/**
 * TODO: Implement AdminGuard with AuthModule integration
 *
 * Problem: AdminGuard cannot access AUTH_MODULE_OPTIONS_KEY from AuthModule.
 * The provider is not available in AdminModule context even when AuthModule is imported.
 *
 * Options to explore:
 * 1. Import AuthModule in AdminModule.forRoot() - tried, provider not accessible
 * 2. Use ModuleRef.get() with { strict: false } - tried, provider not found in global context
 * 3. Composition instead of inheritance - not tried yet
 * 4. Custom provider wrapper - not tried yet
 *
 * See TASK_ADMIN_GUARD_AUTH_INTEGRATION.md for detailed analysis.
 *
 * @example Future usage
 * ```typescript
 * @AdminController(UserEntity) // AdminGuard applied automatically
 * export class AdminUsersController extends BaseAdminController<UserEntity> {}
 * ```
 */

// Temporarily disabled - see TODO above
// import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { AUTH_MODULE_OPTIONS_KEY, AuthGuard } from '@thallesp/nestjs-better-auth';
// import { Logger } from 'nestjs-pino';
//
// @Injectable()
// export class AdminGuard extends AuthGuard {
//   constructor(
//     reflector: Reflector,
//     @Inject(AUTH_MODULE_OPTIONS_KEY) options: unknown,
//     private readonly logger: Logger
//   ) {
//     super(reflector, options as any);
//   }
//
//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const isAuthorized = await super.canActivate(context);
//     if (!isAuthorized) {
//       return false;
//     }
//
//     const request = context.switchToHttp().getRequest();
//     this.logger.log({
//       msg: 'Admin route access',
//       userId: request.user?.id,
//       path: request.path,
//       method: request.method,
//     });
//
//     return true;
//   }
// }
