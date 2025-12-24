import { Inject, Injectable } from '@nestjs/common';
import type { Auth } from 'better-auth';
import { AUTH_INSTANCE_KEY } from '../constants/auth.constant';

/**
 * NOTE: This service is solely for handling better auth related tasks.
 * You cannot import `auth.service.ts` here since AuthService is used inside `better-auth.config.ts` and will cause a circular loop.
 */
@Injectable()
export class BetterAuthService {
  constructor(
    @Inject(AUTH_INSTANCE_KEY)
    private readonly auth: Auth
  ) {}

  get api() {
    return this.auth.api;
  }
}
