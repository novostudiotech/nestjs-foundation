import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminController, BaseAdminController, createAdminController } from '#/admin';
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
@Injectable()
export class AdminUsersController extends BaseAdminController<
  UserEntity,
  CreateUserDto,
  UpdateUserDto
> {
  constructor(@InjectRepository(UserEntity) repository: Repository<UserEntity>) {
    super(repository);
  }
}

export const AdminAccountsController = createAdminController(AccountEntity);
export const AdminSessionsController = createAdminController(SessionEntity);
export const AdminVerificationsController = createAdminController(VerificationEntity);
