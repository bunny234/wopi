import { Entity, Column, PrimaryGeneratedColumn, VersionColumn } from 'typeorm';

@Entity()
export class File {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @VersionColumn()
  version: number;

  @Column('bigint')
  size: number;

  @Column()
  ownerId: string;

  @Column()
  s3Key: string;
}
