import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseModel } from '../../database/models/base.model';
import { UserEntity } from './user.entity';

// https://www.better-auth.com/docs/plugins/passkey#schema
@Entity('passkey')
export class PassKeyEntity extends BaseModel {
  @Column({ nullable: true })
  name: string;

  @Column()
  userId: string;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column()
  publicKey: string;

  @Column()
  credentialID: string;

  @Column()
  counter: number;

  @Column()
  deviceType: string;

  @Column({ type: 'boolean' })
  backedUp: string;

  @Column()
  transports: string;
}
