import { Controller, Get, Param } from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get(':id/editSession')
  async getEditSession(@Param('id') id: string) {
    // In a real application, you would get the userId from the authenticated user's session
    const userId = 'doctor-123'; // Hardcoded for this example
    return this.reportService.getEditSession(id, userId);
  }
}
