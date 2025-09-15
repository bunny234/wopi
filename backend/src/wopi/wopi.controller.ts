import {
  Controller,
  Get,
  Post,
  Put,
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
import { Readable } from 'stream';

@Controller('wopi/files')
@UseGuards(WopiGuard)
export class WopiController {
  constructor(private readonly wopiService: WopiService) {}

  @Get()
  async listDocuments() {
    return this.wopiService.listDocuments();
  }

  @Get(':id')
  async checkFileInfo(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user.userId;
    return this.wopiService.checkFileInfo(id, userId);
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
console.log(operation, lockId, oldLockId);
    if (!lockId) {
      throw new ForbiddenException('Missing X-WOPI-Lock header');
    }


    switch (operation) {
      case 'LOCK':
        await this.wopiService.lockFile(id, lockId, (req as any).user.userId);
        return res.sendStatus(200);
      case 'UNLOCK':
        await this.wopiService.unlockFile(id, lockId);
        return res.sendStatus(200);
      case 'REFRESH_LOCK':
        await this.wopiService.refreshLock(id, lockId);
        return res.sendStatus(200);
      case 'GET_LOCK':
        const report = await this.wopiService.getFileMetaData(id);
        if (!report) throw new NotFoundException('Report not found');
        res.setHeader('X-WOPI-Lock', report.lockId || '');
        return res.sendStatus(200);
      default:
        throw new ForbiddenException(`Unsupported WOPI operation: ${operation}`);
    }
  }
}