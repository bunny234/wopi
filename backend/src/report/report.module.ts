import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from '../files/file.entity';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([File])],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
