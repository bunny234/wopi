import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { WopiService } from './wopi.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // I will create this guard next
import { Response } from 'express';

@Controller('wopi/files')
export class WopiController {
  constructor(private readonly wopiService: WopiService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async checkFileInfo(@Param('id') id: string, @Req() req) {
    // The user information is available in req.user thanks to JwtStrategy
    const userId = req.user.userId;
    return this.wopiService.checkFileInfo(id, userId);
  }

  @Get(':id/contents')
  @UseGuards(JwtAuthGuard)
  async getFile(
    @Param('id') id: string,
    @Res() res: any,
  ) {
    const fileStream = await this.wopiService.getFile(id);
    res.setHeader('Content-Disposition', 'attachment; filename="report.docx"');
    fileStream.pipe(res);
  }

  @Post(':id/contents')
  @UseGuards(JwtAuthGuard)
  async updateFile(
    @Param('id') id: string,
    @Body() fileContent: Buffer,
  ) {
    return this.wopiService.updateFile(id, fileContent);
  }
}
