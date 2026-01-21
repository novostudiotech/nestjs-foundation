import { Body, Get, Injectable, Param, Post, Put, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminController, BaseAdminController, createAdminController } from '#/admin';
import { AdminListQuery } from '#/admin/base-admin.controller';
import { ErrorResponseDto } from '#/app/dto/error-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AccountEntity } from './entities/account.entity';
import { SessionEntity } from './entities/session.entity';
import { UserEntity } from './entities/user.entity';
import { VerificationEntity } from './entities/verification.entity';

/**
 * Admin controllers for Auth entities
 * Compatible with Refine and React Admin
 *
 * AdminUsersController uses custom DTOs with Zod validation for proper email validation.
 * Other controllers use createAdminController() factory for simple CRUD operations.
 *
 * For controllers with custom endpoints, extend BaseAdminController:
 * @example
 * ```typescript
 * @AdminController(UserEntity)
 * @Injectable()
 * export class AdminUsersController extends BaseAdminController<UserEntity> {
 *   constructor(@InjectRepository(UserEntity) repository: Repository<UserEntity>) {
 *     super(repository);
 *   }
 *
 *   @Post(':id/activate')
 *   async activate(@Param('id') id: string) {
 *     // Custom logic
 *   }
 * }
 * ```
 */

/**
 * Admin controller for UserEntity with Zod validation
 * Uses CreateUserDto and UpdateUserDto for proper email validation
 */
@AdminController(UserEntity)
@ApiExtraModels(UserEntity)
@Injectable()
export class AdminUsersController extends BaseAdminController<
  UserEntity,
  CreateUserDto,
  UpdateUserDto
> {
  constructor(@InjectRepository(UserEntity) repository: Repository<UserEntity>) {
    super(repository);
  }

  /**
   * Override findAll method to specify response type for Swagger/OpenAPI
   */
  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({
    status: 200,
    description: 'List of users with pagination',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(UserEntity) },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        perPage: { type: 'number' },
      },
      required: ['data', 'total', 'page', 'perPage'],
    },
  })
  async findAll(@Query() query: AdminListQuery) {
    return super.findAll(query);
  }

  /**
   * Override findOne method to specify response type for Swagger/OpenAPI
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'User details', type: UserEntity })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async findOne(@Param('id') id: string): Promise<UserEntity> {
    return super.findOne(id);
  }

  /**
   * Override create method with explicit DTO type for runtime validation.
   *
   * Why override? TypeScript generics (TCreateDto) are erased at runtime, so NestJS's
   * metadata system sees `Object` instead of CreateUserDto. This prevents ZodValidationPipe
   * from validating request bodies. By overriding with an explicit type, NestJS can see
   * the actual DTO class at runtime and apply validation correctly.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserDto, description: 'User data' })
  @ApiCreatedResponse({ description: 'User created successfully', type: UserEntity })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  async create(@Body() createDto: CreateUserDto): Promise<UserEntity> {
    return super.create(createDto);
  }

  /**
   * Override update method with explicit DTO type for runtime validation.
   *
   * Why override? TypeScript generics (TUpdateDto) are erased at runtime, so NestJS's
   * metadata system sees `Object` instead of UpdateUserDto. This prevents ZodValidationPipe
   * from validating request bodies. By overriding with an explicit type, NestJS can see
   * the actual DTO class at runtime and apply validation correctly.
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateUserDto, description: 'User data' })
  @ApiOkResponse({ description: 'User updated successfully', type: UserEntity })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  async update(@Param('id') id: string, @Body() updateDto: UpdateUserDto): Promise<UserEntity> {
    return super.update(id, updateDto);
  }
}

export const AdminAccountsController = createAdminController(AccountEntity);
export const AdminSessionsController = createAdminController(SessionEntity);
export const AdminVerificationsController = createAdminController(VerificationEntity);
