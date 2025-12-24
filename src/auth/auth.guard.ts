import type { CanActivate, ContextType, ExecutionContext } from '@nestjs/common';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Auth } from 'better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { AUTH_INSTANCE_KEY, IS_OPTIONAL_AUTH, IS_PUBLIC_AUTH } from '../constants/auth.constant';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(AUTH_INSTANCE_KEY)
    private readonly auth: Auth
  ) {}

  /**
   * Validates if the current request is authenticated for REST endpoints
   * Attaches session and user information to the request object
   * @param context - The execution context of the current request
   * @returns True if the request is authorized to proceed, throws an error otherwise
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAuthPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_AUTH, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isAuthPublic) return true;

    const contextType: ContextType = context.getType();

    if (contextType === 'http') {
      const request = context.switchToHttp().getRequest<Request>();

      const session = await this.auth.api.getSession({
        headers: fromNodeHeaders(request?.headers),
      });

      request['session'] = session;
      request['user'] = session?.user ?? null;

      const isAuthOptional = this.reflector.getAllAndOverride<boolean>(IS_OPTIONAL_AUTH, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (isAuthOptional && !session) return true;

      if (!session) {
        throw new UnauthorizedException({
          code: 'UNAUTHORIZED',
        });
      }

      return true;
    }

    // For other context types (ws, graphql), return false for now
    return false;
  }
}
