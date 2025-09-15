import { Controller, Post, Param, UseGuards, Request, Get } from '@nestjs/common';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get()
  async getReports(@Request() req) {
    const userId = req.user.id;
    return this.reportService.getReportsForUser(userId);
  }

  @Post(':id/editSession')
  async getEditSession(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    console.log(userId);
    return this.reportService.getEditSession(id, userId);
  }
}
