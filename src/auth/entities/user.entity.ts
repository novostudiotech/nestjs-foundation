import { Column, Entity, Index } from 'typeorm';
import { BaseModel } from '../../database/models/base.model';

export enum Role {
  User = 'user',
  Admin = 'admin',
}

// https://www.better-auth.com/docs/concepts/database#core-schema
@Entity('user')
export class UserEntity extends BaseModel {
  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column()
  username: string;

  @Index({ where: '"deletedAt" IS NULL' })
  @Column({ nullable: true })
  displayUsername: string;

  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column()
  email: string;

  @Column({ type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.User,
  })
  role: Role;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ nullable: true })
  image?: string;

  @Column({ nullable: true })
  bio?: string;

  @Column({ type: 'boolean', default: false })
  twoFactorEnabled: boolean;
}
