import { createAdminController } from '#/admin';
import { AccountEntity } from './entities/account.entity';
import { SessionEntity } from './entities/session.entity';
import { UserEntity } from './entities/user.entity';
import { VerificationEntity } from './entities/verification.entity';

/**
 * Admin controllers for Auth entities
 * Compatible with Refine and React Admin
 *
 * Using createAdminController() factory for simple CRUD operations.
 * Each entity is written only ONCE - minimal boilerplate!
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

export const AdminUsersController = createAdminController(UserEntity);
export const AdminAccountsController = createAdminController(AccountEntity);
export const AdminSessionsController = createAdminController(SessionEntity);
export const AdminVerificationsController = createAdminController(VerificationEntity);
