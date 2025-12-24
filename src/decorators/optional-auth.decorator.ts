import { SetMetadata } from '@nestjs/common';
import { IS_OPTIONAL_AUTH } from '../constants/auth.constant';

/**
 * Marks a route as having optional authentication.
 * When applied to a controller method, the AuthGuard will allow the request to proceed
 * even if no session is present.
 */
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH, true);
