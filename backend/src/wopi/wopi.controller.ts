import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  Res,
  ForbiddenException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { WopiService } from './wopi.service';
import { WopiGuard } from './wopi.guard';
import type { Response, Request } from 'express';

@Controller('wopi/files')
@UseGuards(WopiGuard)
export class WopiController {
  constructor(private readonly wopiService: WopiService) {}

  @Get()
  async listDocuments() {
    return this.wopiService.listDocuments();
  }

  @Get('debug/:id')
  async debugFileInfo(@Param('id') id: string, @Req() req: Request) {
    try {
      // Extract token manually for debugging
      const token = req.query.access_token as string;
      console.log('Debug token:', token);
      
      // Mock user for debugging (you can decode the JWT properly here)
      const userId = '1'; // Replace with actual user ID from token
      const fileInfo = await this.wopiService.checkFileInfo(id, userId);
      
      return {
        success: true,
        fileInfo,
        wopiSrc: `${req.protocol}://${req.get('host')}/wopi/files/${id}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Post('debug/clear-locks')
  async clearLocks() {
    await this.wopiService.clearAllLocks();
    return { success: true, message: 'All locks cleared' };
  }

  @Get(':id')
  async checkFileInfo(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user.userId;
    const fileInfo = await this.wopiService.checkFileInfo(id, userId);
    
    // Set WOPI required headers
    res.setHeader('X-WOPI-MachineName', 'WOPI-Server');
    res.setHeader('X-WOPI-ServerVersion', '1.0.0');
    
    return res.json(fileInfo);
  }

  @Get(':id/contents')
  async getFile(@Param('id') id: string, @Res() res: Response) {
    const fileStream = await this.wopiService.getFile(id);
    const report = await this.wopiService.getFileMetaData(id);
    if (!report) throw new NotFoundException('Report not found');

    const fileExtension = report.filePath.match(/\.([a-z0-9]+)$/i)?.[1] || 'docx';
    const contentType = {
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    }[fileExtension] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="file-${id}.${fileExtension}"`);
    res.setHeader('X-WOPI-MachineName', 'WOPI-Server');
    res.setHeader('X-WOPI-ServerVersion', '1.0.0');
    
    fileStream.pipe(res);
  }

  @Post(':id/contents')
  async updateFile(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {

    console.log('Update file');
    const user = (req as any).user;
    if (!user?.canWrite) {
      throw new ForbiddenException('User does not have write permissions');
    }

    const lockId = req.get('X-WOPI-Lock');
    if (!lockId) {
      throw new ForbiddenException('Missing X-WOPI-Lock header');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const fileContent = Buffer.concat(chunks);

    const version = await this.wopiService.updateFile(id, fileContent, lockId);
    res.setHeader('X-WOPI-ItemVersion', version.toString());
    return res.sendStatus(200);
  }

  @Post(':id')
  async lockOperation(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const operation = req.get('X-WOPI-Override');
    const lockId = req.get('X-WOPI-Lock');
    const oldLockId = req.get('X-WOPI-OldLock');
    
    console.log('WOPI Operation:', operation, 'Lock ID:', lockId, 'Old Lock ID:', oldLockId);

    switch (operation) {
      case 'LOCK':
        if (!lockId) {
          return res.status(400).json({ error: 'Missing X-WOPI-Lock header for LOCK operation' });
        }
        try {
          await this.wopiService.lockFile(id, lockId, (req as any).user.userId);
          res.setHeader('X-WOPI-Lock', lockId);
          return res.sendStatus(200);
        } catch (error) {
          console.error('Lock error:', error);
          if (error.cause && error.cause.lockId) {
            // File is locked by someone else, return the current lock ID
            res.setHeader('X-WOPI-Lock', error.cause.lockId);
            res.setHeader('X-WOPI-LockFailureReason', 'LockedByAnother');
            return res.status(409).end();
          }
          return res.status(500).json({ error: 'Lock operation failed' });
        }
        
      case 'UNLOCK':
        if (!lockId) {
          return res.status(400).json({ error: 'Missing X-WOPI-Lock header for UNLOCK operation' });
        }
        try {
          await this.wopiService.unlockFile(id, lockId);
          return res.sendStatus(200);
        } catch (error) {
          console.error('Unlock error:', error);
          // For unlock, return 409 if lock mismatch
          res.setHeader('X-WOPI-LockFailureReason', 'InvalidLock');
          return res.status(409).end();
        }
        
      case 'REFRESH_LOCK':
        if (!lockId) {
          return res.status(400).json({ error: 'Missing X-WOPI-Lock header for REFRESH_LOCK operation' });
        }
        try {
          await this.wopiService.refreshLock(id, lockId);
          res.setHeader('X-WOPI-Lock', lockId);
          return res.sendStatus(200);
        } catch (error) {
          console.error('Refresh lock error:', error);
          return res.status(409).json({ error: 'Invalid lock ID' });
        }
        
      case 'GET_LOCK':
        const report = await this.wopiService.getFileMetaData(id);
        if (!report) throw new NotFoundException('Report not found');
        res.setHeader('X-WOPI-Lock', report.lockId || '');
        return res.sendStatus(200);
        
      default:
        return res.status(501).json({ error: `Unsupported WOPI operation: ${operation}` });
    }
  }
}