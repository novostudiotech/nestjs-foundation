import { Column, Entity } from 'typeorm';
import { BaseModel } from '../../database/models/base.model';

// https://www.better-auth.com/docs/concepts/database#core-schema
@Entity('verification')
export class VerificationEntity extends BaseModel {
  @Column()
  identifier: string;

  @Column()
  value: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;
}
