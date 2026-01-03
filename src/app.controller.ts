import { Body, Controller, Get, Patch, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  AllowAnonymous,
  OptionalAuth,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ValidationErrorDto } from './app/dto/validation-error.dto';
import { AppService } from './app.service';

// Simple Zod schema for user creation
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  age: z.number().int().min(18).optional(),
});

// DTO generated from Zod schema with automatic Swagger integration
class CreateUserDto extends createZodDto(CreateUserSchema) {}

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

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile (protected route)' })
  @ApiResponse({ status: 200, description: 'Returns current user information' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@Session() session: UserSession) {
    return {
      user: session.user,
      session: {
        id: session.session.id,
        expiresAt: session.session.expiresAt,
      },
    };
  }

  @Get('optional')
  @OptionalAuth()
  @ApiOperation({
    summary: 'Get optional auth info (authentication is optional)',
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

  @Post('users')
  @AllowAnonymous()
  @ApiOperation({ summary: 'Create a new user (Zod validation example)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    type: ValidationErrorDto,
  })
  createUser(@Body() createUserDto: CreateUserDto) {
    return {
      message: 'User created successfully',
      user: createUserDto,
    };
  }

  @Put('users/:id')
  @AllowAnonymous()
  @ApiOperation({ summary: 'Update a user (PUT with body parser test)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    type: ValidationErrorDto,
  })
  updateUser(@Body() updateUserDto: CreateUserDto) {
    return {
      message: 'User updated successfully',
      user: updateUserDto,
    };
  }

  @Patch('users/:id')
  @AllowAnonymous()
  @ApiOperation({ summary: 'Partially update a user (PATCH with body parser test)' })
  @ApiResponse({ status: 200, description: 'User partially updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    type: ValidationErrorDto,
  })
  patchUser(@Body() patchUserDto: CreateUserDto) {
    return {
      message: 'User partially updated successfully',
      user: patchUserDto,
    };
  }
}
