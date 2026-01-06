import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { PrimaryUuidV7AutoColumn } from '../../app/db/decorators/primary-uuid-v7-auto-column.decorator';
import { AuditableEntity } from '../../app/db/entities/auditable.entity';
import { UserEntity } from './user.entity';

/**
 * Session entity for Better Auth
 * @see https://www.better-auth.com/docs/concepts/database#core-schema
 */
@Entity('session')
@Index(['userId'])
@Index(['expiresAt'])
export class SessionEntity extends AuditableEntity {
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
   * Unique session token
   * Must be unique across all sessions
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 512 })
  token: string;

  /**
   * Session expiration timestamp
   */
  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  /**
   * IP address of the device (supports IPv6, max 45 characters)
   */
  @Column({ type: 'varchar', nullable: true, length: 45 })
  ipAddress: string | null;

  /**
   * User agent information of the device
   */
  @Column({ type: 'varchar', nullable: true, length: 500 })
  userAgent: string | null;
}
