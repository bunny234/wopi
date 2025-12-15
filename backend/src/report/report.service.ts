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
  ) { }

  async getReportsForUser(userId: number) {
    return this.reportRepository.find({ where: { doctorId: userId } });
  }


  async getEditSession(fileId: string, userId: number) {
    const report = await this.reportRepository.findOne({
      where: { id: parseInt(fileId, 10) },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const userCanWrite = report.doctorId === userId;

    const accessToken = await this.authService.generateWopiToken(
      userId.toString(),
      fileId,
      userCanWrite,
    );

    const appUrl = this.configService.get<string>('APP_URL');
    const wopiSrc = `${appUrl}/wopi/files/${fileId}`;

    // Office Online edit URL with proper parameters
    const editorUrl =
      `https://word-edit.officeapps.live.com/we/wordeditorframe.aspx?` +
      `WOPISrc=${encodeURIComponent(wopiSrc)}` +
      `&access_token=${encodeURIComponent(accessToken)}` +
      `&ui=en-US` +
      `&rs=en-US` +
      `&dchat=1` +
      `&hid=0` +
      `&IsLicensedUser=1` +
      `&actnavid=0`;

    return { editorUrl };
  }



}
