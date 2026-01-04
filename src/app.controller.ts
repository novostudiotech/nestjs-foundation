import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  AllowAnonymous,
  OptionalAuth,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import { AppService } from './app.service';

/**
 * AppController - Minimal example controller demonstrating authorization patterns
 *
 * For comprehensive examples of validation, body parser, CRUD operations, etc.,
 * see the Products module (src/products/).
 *
 * This controller focuses on demonstrating:
 * - Public routes (@AllowAnonymous)
 * - Protected routes (require authentication)
 * - Optional authentication (@OptionalAuth)
 */
@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @AllowAnonymous()
  @ApiOperation({ summary: 'Get hello message (public route)' })
  @ApiResponse({ status: 200, description: 'Returns a hello message' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('optional')
  @OptionalAuth()
  @ApiOperation({
    summary: 'Get optional auth info (authentication is optional)',
    description:
      'Example of a route with optional authentication. Works both with and without authentication, returning different data based on auth status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns authentication status and user if authenticated',
  })
  getOptional(@Session() session: UserSession | null) {
    return {
      authenticated: !!session,
      user: session?.user ?? null,
    };
  }
}
