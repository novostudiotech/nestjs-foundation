import { ContextType, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UserSession as UserSessionType } from '../auth/auth.type';

export type CurrentUserSession = UserSessionType & {
  headers: Request['headers'];
};

export const CurrentUserSession = createParamDecorator(
  (
    data: keyof UserSessionType | 'headers',
    ctx: ExecutionContext
  ): CurrentUserSession | undefined => {
    const contextType: ContextType = ctx.getType();

    let request: Request & { session?: UserSessionType };

    if (contextType === 'http') {
      request = ctx.switchToHttp().getRequest();
    } else {
      // For other context types (ws, graphql), we might need to handle differently
      return undefined;
    }

    return data == null
      ? ({
          ...request?.session,
          headers: request?.headers,
        } as CurrentUserSession)
      : (request.session?.[data] as CurrentUserSession);
  }
);
