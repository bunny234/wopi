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

  async getFileMetaData(id: string) {
    return this.reportRepository.findOne({
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

    // Compute SHA256 hash more efficiently
    let sha256: string;
    try {
      const fileBuffer = await this.getFileBuffer(fileId);
      const hash = crypto.createHash('sha256');
      hash.update(fileBuffer);
      sha256 = hash.digest('base64');
    } catch (error) {
      console.error('Error computing SHA256:', error);
      sha256 = ''; // Fallback to empty string
    }

    // Determine file extension
    const fileExtension = report.filePath.match(/\.([a-z0-9]+)$/i)?.[1] || 'docx';
    const baseFileName = report.title.match(/\.[a-z0-9]+$/i)
      ? report.title
      : `${report.title}.${fileExtension}`;

    return {
      BaseFileName: baseFileName,
      
      // User information
      OwnerId: report.doctorId.toString(),
      UserId: userId,
      UserFriendlyName: 'User ' + userId,
      UserCanWrite: userCanWrite,
      
      // File information
      Size: head.ContentLength || 0,
      Version: report.version.toString(),
      SHA256: sha256,
      
      // Permissions and capabilities
      ReadOnly: !userCanWrite,
      UserCanNotWriteRelative: !userCanWrite,
      
      // Required for editing
      SupportsUpdate: userCanWrite,
      SupportsLocks: true,
      SupportsGetLock: true,
      SupportsExtendedLockLength: true,
      
      // Additional WOPI properties for Office Online (disable collaboration)
      SupportsCobalt: false,  // Disable real-time collaboration
      SupportsScenarios: 'ImagePreview,DocumentPreview',
      SupportedShareUrlTypes: ['ReadOnly'],
      
      // File format and editing support
      IsAnonymousUser: false,
      UserCanRename: false,  // Disable renaming to avoid conflicts
      
      // Security and features
      AllowExternalMarketplace: false,
      DisablePrint: false,
      DisableTranslation: false,
      
      // Lock information
      LockValue: report.lockId || '',
      
      // Required timestamps
      LastModifiedTime: report.updatedAt.toISOString(),
      
      // Additional editing capabilities (disable collaboration features)
      UserCanAttend: false,
      UserCanPresent: false,
      UserCanReview: false,  // Disable review mode
      UserInfo: userId,
      
      // Disable collaboration features completely
      SupportsCoauth: false,  // Disable co-authoring
      SupportsFolders: false,
      SupportsUserInfo: false,  // Disable user presence
      
      // Single user editing mode
      DisableAsync: true,  // Force synchronous operations
      RestrictedWebViewOnly: false,
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

  async getFileBuffer(fileId: string): Promise<Buffer> {
    const report = await this.reportRepository.findOne({
      where: { id: parseInt(fileId, 10) },
    });
    if (!report) throw new NotFoundException('Report not found');

    const params = {
      Bucket: this.bucketName,
      Key: report.filePath,
    };

    const result = await this.s3.getObject(params).promise();
    return result.Body as Buffer;
  }

  async lockFile(fileId: string, lockId: string, userId: string) {
    const report = await this.reportRepository.findOne({
      where: { id: parseInt(fileId, 10) },
    });
    if (!report) throw new NotFoundException('Report not found');

    // Check if file is currently locked
    if (report.lockId) {
      // If the lock is by the same user, update/refresh the lock
      if (report.lockedBy === userId) {
        console.log(`Refreshing lock for user ${userId}: ${lockId}`);
        report.lockId = lockId;
        report.lockedAt = new Date();
        await this.reportRepository.save(report);
        return { success: true };
      }
      
      // If locked by different user, check if lock is expired (30 minutes)
      const lockAge = Date.now() - report.lockedAt.getTime();
      if (lockAge > 30 * 60 * 1000) { // 30 minutes
        console.log(`Lock expired, taking over for user ${userId}`);
        report.lockId = lockId;
        report.lockedBy = userId;
        report.lockedAt = new Date();
        await this.reportRepository.save(report);
        return { success: true };
      }
      
      // Lock is active by different user
      throw new ForbiddenException('File is locked by another user', {
        cause: { lockId: report.lockId },
      });
    }

    // File not locked, acquire new lock
    console.log(`Acquiring new lock for user ${userId}: ${lockId}`);
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

    // Allow unlocking if no lock exists (idempotent)
    if (!report.lockId) {
      console.log('No lock to unlock');
      return { success: true };
    }

    // Parse lock IDs to compare just the session ID (S property)
    const isLockMatch = this.compareLockIds(report.lockId, lockId);
    
    // Allow unlocking if lock ID matches or if lock is very old
    const lockAge = Date.now() - report.lockedAt.getTime();
    if (isLockMatch || lockAge > 60 * 60 * 1000) { // 1 hour
      console.log(`Unlocking file: ${lockId}`);
      report.lockId = '';
      report.lockedBy = '';
      report.lockedAt = new Date();
      await this.reportRepository.save(report);
      return { success: true };
    }

    // Invalid lock ID
    console.log(`Invalid unlock attempt. Current: ${report.lockId}, Requested: ${lockId}`);
    throw new ForbiddenException('Invalid lock ID');
  }

  private compareLockIds(storedLock: string, requestedLock: string): boolean {
    try {
      // Parse both lock IDs as JSON
      const stored = JSON.parse(storedLock);
      const requested = JSON.parse(requestedLock);
      
      // Compare the session ID (S property) which is the core identifier
      return stored.S === requested.S;
    } catch (error) {
      // Fallback to string comparison if JSON parsing fails
      console.log('Lock ID comparison fallback to string match');
      return storedLock === requestedLock;
    }
  }

  async refreshLock(fileId: string, lockId: string) {
    const report = await this.reportRepository.findOne({
      where: { id: parseInt(fileId, 10) },
    });
    if (!report) throw new NotFoundException('Report not found');

    const isLockMatch = this.compareLockIds(report.lockId || '', lockId);
    if (!isLockMatch) {
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

    console.log(`Updating file ${fileId} with lock ${lockId}, content size: ${fileContent.length} bytes`);
    
    // Use the same lock comparison logic
    const isLockMatch = this.compareLockIds(report.lockId || '', lockId);
    if (!isLockMatch) {
      console.log(`Lock mismatch - Stored: ${report.lockId}, Requested: ${lockId}`);
      throw new ForbiddenException('Invalid or missing lock ID');
    }

    try {
      console.log(`Starting S3 upload to bucket: ${this.bucketName}, key: ${report.filePath}`);
      
      const uploadResult = await this.s3
        .upload({
          Bucket: this.bucketName,
          Key: report.filePath,
          Body: fileContent,
          ContentType: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`,
          ServerSideEncryption: 'AES256', // Add encryption
        })
        .promise();

      console.log(`S3 upload successful:`, {
        Location: uploadResult.Location,
        ETag: uploadResult.ETag,
        Key: uploadResult.Key
      });

      // Update database record
      const oldSize = report.size;
      const oldVersion = report.version;
      
      report.size = fileContent.length;
      report.version += 1;
      await this.reportRepository.save(report);

      console.log(`Database updated - Size: ${oldSize} -> ${report.size}, Version: ${oldVersion} -> ${report.version}`);
      
      return report.version;
      
    } catch (error) {
      console.error('S3 upload failed:', {
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
        bucket: this.bucketName,
        key: report.filePath,
        contentLength: fileContent.length
      });
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  async clearAllLocks(): Promise<void> {
    console.log('Clearing all file locks');
    await this.reportRepository.update({}, { 
      lockId: '', 
      lockedBy: '', 
      lockedAt: new Date() 
    });
  }

  async listDocuments(): Promise<string[]> {
    const response = await this.s3
      .listObjectsV2({
        Bucket: this.bucketName,
      })
      .promise();

    return response.Contents?.filter((obj) => obj.Key?.match(/\.(pdf|docx?|xlsx|pptx)$/i))
      .map((obj) => obj.Key!) || [];
  }
}