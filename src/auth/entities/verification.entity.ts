import { Column, Entity, Index } from 'typeorm';
import { PrimaryUuidV7AutoColumn } from '../../db/decorators/primary-uuid-v7-auto-column.decorator';
import { AuditableEntity } from '../../db/entities/auditable.entity';

/**
 * Verification entity for Better Auth
 * Stores verification requests (e.g., email verification, password reset)
 * @see https://www.better-auth.com/docs/concepts/database#core-schema
 */
@Entity('verification')
@Index(['identifier'])
@Index(['expiresAt'])
export class VerificationEntity extends AuditableEntity {
  @PrimaryUuidV7AutoColumn()
  id: string;
  /**
   * The identifier for the verification request (e.g., email address)
   */
  @Column({ type: 'varchar', length: 255 })
  identifier: string;

  /**
   * The value to be verified (e.g., verification code or token)
   */
  @Column({ type: 'varchar', length: 255 })
  value: string;

  /**
   * Expiration time for the verification request
   */
  @Column({ type: 'timestamptz' })
  expiresAt: Date;
}
