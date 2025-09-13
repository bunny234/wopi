import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../reports/report.entity';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';

@Injectable()
export class WopiService {
  private readonly s3: S3;
  private readonly bucketName: string;

  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private readonly configService: ConfigService,
  ) {
    this.s3 = new S3({
      region: this.configService.get<string>('AWS_REGION'),
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
    });
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME');
  }

  async checkFileInfo(fileId: string, userId: string) {
    const report = await this.reportRepository.findOne({ where: { id: parseInt(fileId, 10) } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const userCanWrite = report.doctorId.toString() === userId;

    return {
      BaseFileName: report.title,
      OwnerId: report.doctorId.toString(),
      UserId: userId,
      Size: report.size,
      Version: report.version.toString(),
      UserCanWrite: userCanWrite,
      DisablePrint: true,
      DisableExport: true,
      DisableCopy: true,
    };
  }

  async getFile(fileId: string): Promise<any> {
    const report = await this.reportRepository.findOne({ where: { id: parseInt(fileId, 10) } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const params = {
      Bucket: this.bucketName,
      Key: report.filePath,
    };

    return this.s3.getObject(params).createReadStream();
  }

  async updateFile(fileId: string, fileContent: Buffer): Promise<any> {
    const report = await this.reportRepository.findOne({ where: { id: parseInt(fileId, 10) } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const params = {
      Bucket: this.bucketName,
      Key: report.filePath,
      Body: fileContent,
    };

    await this.s3.upload(params).promise();

    report.size = fileContent.length;
    report.version += 1;
    await this.reportRepository.save(report);

    return { success: true };
  }
}
