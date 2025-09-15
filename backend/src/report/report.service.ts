import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { ConfigService } from '@nestjs/config';
import { Report } from 'src/reports/report.entity';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  async getReportsForUser(userId: number) {
    return this.reportRepository.find({ where: { doctorId: userId } });
  }

  async getEditSession(fileId: string, userId: number) {
    const report = await this.reportRepository.findOne({ where: { id: parseInt(fileId, 10) } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // In a real app, you would have more complex permission logic
    const userCanWrite = report.doctorId === userId;

    const accessToken = await this.authService.generateWopiToken(
      userId.toString(),
      fileId,
      userCanWrite,
    );

    const wopiAppUrl = this.configService.get<string>('APP_URL');
    const wopiSrc = `${wopiAppUrl}/wopi/files/${fileId}`;

    return {
      wopiSrc,
      accessToken,
    };
  }
}
