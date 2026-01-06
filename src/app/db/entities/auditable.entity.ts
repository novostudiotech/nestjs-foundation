import { BaseEntity, CreateDateColumn, DeleteDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Base entity with audit timestamps (createdAt, updatedAt, deletedAt)
 * Provides soft delete functionality and automatic timestamp tracking
 */
export abstract class AuditableEntity extends BaseEntity {
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  /**
   * Note: In PostgreSQL, `onUpdate` is not enforced at the DB level (unlike MySQL).
   * TypeORM's @UpdateDateColumn handles updates at the ORM level, but direct SQL
   * updates will not automatically update this field. Omitting `onUpdate: 'CURRENT_TIMESTAMP'` is intentional
   * to avoid false expectations about DB-level enforcement.
   *
   * If rows are modified outside TypeORM (raw SQL, other services),
   * updatedAt won’t change unless you add a DB trigger.
   */
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
