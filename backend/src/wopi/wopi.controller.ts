import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import { WopiService } from './wopi.service';
import { WopiGuard } from './wopi.guard';
import { Response } from 'express';

@Controller('wopi/files')
@UseGuards(WopiGuard)
export class WopiController {
  constructor(private readonly wopiService: WopiService) {}

  @Get(':id')
  async checkFileInfo(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.wopiService.checkFileInfo(id, userId);
  }

  @Get(':id/contents')
  async getFile(@Param('id') id: string, @Res() res: Response) {
    const fileStream = await this.wopiService.getFile(id);
    // Note: The WOPI client expects a file stream. Don't set Content-Disposition.
    fileStream.pipe(res);
  }

  @Post(':id/contents')
  async updateFile(
    @Param('id') id: string,
    @Body() fileContent: Buffer,
    @Req() req,
  ) {
    if (!req.user.canWrite) {
      throw new ForbiddenException('User does not have write permissions for this file.');
    }
    return this.wopiService.updateFile(id, fileContent);
  }
}
