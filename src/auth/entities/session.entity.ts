import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseModel } from './base.model';
import { UserEntity } from './user.entity';

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
