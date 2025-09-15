import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ name: 'file_path' })
  filePath: string;

  @Column({ name: 'doctor_id' })
  doctorId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'doctor_id' })
  doctor: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @Column({ default: 1 })
  version: number;

  @Column({ type: 'bigint', default: 0 })
  size: number;

  @Column({ name: 'lock_id', nullable: true ,default: null })
  lockId?: string;

  @Column({ name: 'locked_by', nullable: true,default: null })
  lockedBy: string;

  @Column({ name: 'locked_at', type: 'timestamp', nullable: true })
  lockedAt: Date;
}