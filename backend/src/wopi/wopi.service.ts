import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../reports/report.entity';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import * as crypto from 'crypto';
import { Readable } from 'stream';

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
      region: this.configService.get<string>('AWS_S3_REGION'),
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
    });
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME') as string;
  }

  async getFileMetaData (id:string){
    return  this.reportRepository.findOne({
      where: { id: parseInt(id, 10) },
    });
  }
  async checkFileInfo(fileId: string, userId: string) {
    const report = await this.reportRepository.findOne({
      where: { id: parseInt(fileId, 10) },
    });
    if (!report) throw new NotFoundException('Report not found');

    const userCanWrite = report.doctorId.toString() === userId;

    // Get metadata from S3
    const head = await this.s3
      .headObject({
        Bucket: this.bucketName,
        Key: report.filePath,
      })
      .promise();

    // Compute SHA256 hash
    const fileStream = await this.getFile(fileId);
    const hash = crypto.createHash('sha256');
    for await (const chunk of fileStream) {
      hash.update(chunk);
    }
    const sha256 = hash.digest('base64');

    // Determine file extension
    const fileExtension = report.filePath.match(/\.([a-z0-9]+)$/i)?.[1] || 'docx';
    const baseFileName = report.title.match(/\.[a-z0-9]+$/i)
      ? report.title
      : `${report.title}.${fileExtension}`;

    return {
      BaseFileName: baseFileName,
      OwnerId: report.doctorId.toString(),
      UserId: userId,
      Size: head.ContentLength || 0,
      Version: report.version.toString(),
      SHA256: sha256,
      FileExtension: `.${fileExtension}`,
      LastModifiedTime: head.LastModified?.toISOString() || new Date().toISOString(),
      UserCanWrite: userCanWrite,
      SupportsLocks: true,
      SupportsUpdate: userCanWrite,
      UserCanNotWriteRelative: true,
      DisablePrint: true,
      DisableExport: true,
      DisableCopy: true,
      UserFriendlyName: `User ${userId}`, // Optional: customize based on user data
    };
  }

  async getFile(fileId: string): Promise<Readable> {
    const report = await this.reportRepository.findOne({
      where: { id: parseInt(fileId, 10) },
    });
    if (!report) throw new NotFoundException('Report not found');

    const params = {
      Bucket: this.bucketName,
      Key: report.filePath,
    };

    return this.s3.getObject(params).createReadStream();
  }

  async lockFile(fileId: string, lockId: string, userId: string) {
    const report = await this.reportRepository.findOne({
      where: { id: parseInt(fileId, 10) },
    });
    if (!report) throw new NotFoundException('Report not found');

    if (report.lockId && report.lockId !== lockId) {
      throw new ForbiddenException('File is locked', {
        cause: { lockId: report.lockId },
      });
    }

    report.lockId = lockId;
    report.lockedBy = userId;
    report.lockedAt = new Date();
    await this.reportRepository.save(report);

    return { success: true };
  }

  async unlockFile(fileId: string, lockId: string) {
    const report = await this.reportRepository.findOne({
      where: { id: parseInt(fileId, 10) },
    });
    if (!report) throw new NotFoundException('Report not found');

    if (report.lockId !== lockId) {
      throw new ForbiddenException('Invalid lock ID');
    }

    report.lockId = '';
    report.lockedBy = '';
    report.lockedAt = new Date();
    await this.reportRepository.save(report);

    return { success: true };
  }

  async refreshLock(fileId: string, lockId: string) {
    const report = await this.reportRepository.findOne({
      where: { id: parseInt(fileId, 10) },
    });
    if (!report) throw new NotFoundException('Report not found');

    if (report.lockId !== lockId) {
      throw new ForbiddenException('Invalid lock ID');
    }

    report.lockedAt = new Date();
    await this.reportRepository.save(report);

    return { success: true };
  }

  async updateFile(fileId: string, fileContent: Buffer, lockId: string): Promise<number> {
    const report = await this.reportRepository.findOne({
      where: { id: parseInt(fileId, 10) },
    });
    if (!report) throw new NotFoundException('Report not found');

    if (report.lockId !== lockId) {
      throw new ForbiddenException('Invalid or missing lock ID');
    }

    await this.s3
      .upload({
        Bucket: this.bucketName,
        Key: report.filePath,
        Body: fileContent,
        ContentType: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`,
      })
      .promise();

    report.size = fileContent.length;
    report.version += 1;
    await this.reportRepository.save(report);

    return report.version;
  }

  async listDocuments(): Promise<string[]> {
    const response = await this.s3
      .listObjectsV2({
        Bucket: this.bucketName,
      })
      .promise();

    return (
      response.Contents?.filter((obj) => obj.Key?.match(/\.(pdf|docx?|xlsx|pptx)$/i))
        .map((obj) => obj.Key!) || []
    );
  }
}