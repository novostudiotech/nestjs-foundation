import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { PrimaryUuidV7AutoColumn } from '../../db/decorators/primary-uuid-v7-auto-column.decorator';
import { AuditableEntity } from '../../db/entities/auditable.entity';
import { UserEntity } from './user.entity';

/**
 * Account entity for Better Auth
 * Represents OAuth accounts or credential accounts linked to a user
 * @see https://www.better-auth.com/docs/concepts/database#core-schema
 */
@Entity('account')
@Index(['userId'])
@Index(['providerId'])
@Index(['userId', 'providerId', 'accountId'], { unique: true })
export class AccountEntity extends AuditableEntity {
  @PrimaryUuidV7AutoColumn()
  id: string;
  /**
   * Foreign key to user table (UUID)
   */
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  /**
   * The ID of the account as provided by the SSO or equal to userId for credential accounts
   */
  @Column({ type: 'varchar', length: 255 })
  accountId: string;

  /**
   * The ID of the provider (e.g., 'google', 'github', 'credentials')
   */
  @Column({ type: 'varchar', length: 50 })
  providerId: string;

  /**
   * Access token returned by the OAuth provider
   * Can be a JWT token (max 2048 characters)
   */
  @Column({ type: 'varchar', nullable: true, length: 2048 })
  accessToken: string | null;

  /**
   * Refresh token returned by the OAuth provider
   * Can be a JWT token (max 2048 characters)
   */
  @Column({ type: 'varchar', nullable: true, length: 2048 })
  refreshToken: string | null;

  /**
   * Expiration time for the access token
   */
  @Column({ type: 'timestamptz', nullable: true })
  accessTokenExpiresAt: Date | null;

  /**
   * Expiration time for the refresh token
   */
  @Column({ type: 'timestamptz', nullable: true })
  refreshTokenExpiresAt: Date | null;

  /**
   * OAuth scope returned by the provider
   */
  @Column({ type: 'varchar', nullable: true, length: 500 })
  scope: string | null;

  /**
   * ID token returned from the OAuth provider (JWT, max 2048 characters)
   */
  @Column({ type: 'varchar', nullable: true, length: 2048 })
  idToken: string | null;

  /**
   * Hashed password for credential-based authentication
   * Should always be stored as a hash, never as plain text
   */
  @Column({ type: 'varchar', nullable: true, length: 255 })
  password: string | null;
}
