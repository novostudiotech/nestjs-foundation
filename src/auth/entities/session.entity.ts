import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseModel } from '../../database/models/base.model';
import { UserEntity } from './user.entity';

// Although, we'll use Redis for storing sessions, we can fallback to this if you want to store sessions in database
// https://www.better-auth.com/docs/concepts/database#core-schema
@Entity('session')
export class SessionEntity extends BaseModel {
  @Column()
  userId: string;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column()
  token: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;
}
