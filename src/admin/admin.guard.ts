import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { Logger } from 'nestjs-pino';

/**
 * Guard for admin routes
 * Extends AuthGuard with admin-specific logging and future RBAC support
 *
 * @example Usage with @AdminController decorator (automatic)
 * ```typescript
 * @AdminController(UserEntity) // AdminGuard applied automatically
 * export class AdminUsersController extends BaseAdminController<UserEntity> {}
 * ```
 *
 * @example Manual usage
 * ```typescript
 * @UseGuards(AdminGuard)
 * @Controller('admin/custom')
 * export class CustomAdminController {}
 * ```
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private authGuard: AuthGuard | null = null;

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly logger: Logger
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Lazy load AuthGuard to avoid circular dependency issues
    let guard = this.authGuard;
    if (!guard) {
      const loadedGuard = this.moduleRef.get(AuthGuard, { strict: false });
      if (!loadedGuard) {
        this.logger.error('AuthGuard not found in module context');
        return false;
      }
      this.authGuard = loadedGuard;
      guard = loadedGuard;
    }

    // 1. Check authentication using Better Auth
    const isAuthorized = await guard.canActivate(context);

    if (!isAuthorized) {
      return false;
    }

    // 2. Log successful admin route access
    const request = context.switchToHttp().getRequest();
    this.logger.log({
      msg: 'Admin route access',
      userId: request.user?.id,
      path: request.path,
      method: request.method,
    });

    // 3. Future extension point: Check admin role
    // const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    // if (requiredRoles && !requiredRoles.includes(request.user.role)) {
    //   return false;
    // }

    return true;
  }
}
