import { Column, Entity, Index } from 'typeorm';
import { BaseModel } from './base.model';

// https://www.better-auth.com/docs/concepts/database#core-schema
@Entity('user')
export class UserEntity extends BaseModel {
  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column()
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ nullable: true })
  image: string;
}
