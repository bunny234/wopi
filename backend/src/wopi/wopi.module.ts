import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WopiService } from './wopi.service';
import { WopiController } from './wopi.controller';
import { Report } from '../reports/report.entity';
import { WopiStrategy } from './wopi.strategy';
import { ConfigModule } from '@nestjs/config'; 

@Module({
  imports: [TypeOrmModule.forFeature([Report]), ConfigModule],
  providers: [WopiService, WopiStrategy],
  controllers: [WopiController],
})
export class WopiModule {}
