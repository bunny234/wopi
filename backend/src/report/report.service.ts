import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from '../files/file.entity';
import { AuthService } from '../auth/auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  async getEditSession(fileId: string, userId: string) {
    const file = await this.fileRepository.findOne({ where: { id: parseInt(fileId, 10) } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // In a real app, you would check if the user has permission to edit this file
    const userCanWrite = file.ownerId === userId;

    const accessToken = await this.authService.generateWopiToken(userId, fileId, {
      canWrite: userCanWrite,
    });

    // This should be the URL to your backend
    const wopiAppUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    const wopiSrc = `${wopiAppUrl}/wopi/files/${fileId}`;

    return {
      wopiSrc,
      accessToken,
    };
  }
}
