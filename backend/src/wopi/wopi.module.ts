import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WopiService } from './wopi.service';
import { WopiController } from './wopi.controller';
import { File } from '../files/file.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([File]), AuthModule],
  providers: [WopiService],
  controllers: [WopiController],
})
export class WopiModule {}
