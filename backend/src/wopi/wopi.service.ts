import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from '../files/file.entity';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';

@Injectable()
export class WopiService {
  private readonly s3: S3;
  private readonly bucketName: string;

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly configService: ConfigService,
  ) {
    this.s3 = new S3({
      region: this.configService.get<string>('AWS_REGION'),
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
    });
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME') as string;
  }

  async checkFileInfo(fileId: string, userId: string) {
    const file = await this.fileRepository.findOne({ where: { id: parseInt(fileId, 10) } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // In a real app, you would have more complex permission logic
    const userCanWrite = file.ownerId === userId;

    return {
      BaseFileName: file.name,
      OwnerId: file.ownerId,
      UserId: userId,
      Size: file.size,
      Version: file.version.toString(),
      UserCanWrite: userCanWrite,
      DisablePrint: true,
      DisableExport: true,
      DisableCopy: true,
    };
  }

  async getFile(fileId: string): Promise<any> {
    const file = await this.fileRepository.findOne({ where: { id: parseInt(fileId, 10) } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const params = {
      Bucket: this.bucketName,
      Key: file.s3Key,
    };

    return this.s3.getObject(params).createReadStream();
  }

  async updateFile(fileId: string, fileContent: Buffer): Promise<any> {
    const file = await this.fileRepository.findOne({ where: { id: parseInt(fileId, 10) } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const params = {
      Bucket: this.bucketName,
      Key: file.s3Key,
      Body: fileContent,
    };

    await this.s3.upload(params).promise();

    file.size = fileContent.length;
    await this.fileRepository.save(file);

    return { success: true };
  }
}
