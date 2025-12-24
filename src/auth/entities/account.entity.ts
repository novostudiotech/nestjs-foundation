import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseModel } from '../../database/models/base.model';
import { UserEntity } from './user.entity';

// https://www.better-auth.com/docs/concepts/database#core-schema
@Entity('account')
export class AccountEntity extends BaseModel {
  @Column()
  userId: string;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column()
  accountId: string;

  @Column({ type: 'varchar' })
  providerId: 'credential';

  @Column({ nullable: true })
  accessToken: string;

  @Column({ nullable: true })
  refreshToken: string;

  @Column({ type: 'timestamp', nullable: true })
  accessTokenExpiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  refreshTokenExpiresAt: Date;

  @Column({ nullable: true })
  scope: string;

  @Column({ nullable: true })
  idToken: string;

  @Column({ nullable: true })
  password: string;
}
