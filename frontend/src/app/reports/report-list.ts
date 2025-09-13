import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReportService } from '../services/report.service';
import { Report } from '../models/report.model'; // I will create this model next
import { Observable } from 'rxjs';

@Component({
  selector: 'app-report-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './report-list.html',
  styleUrls: ['./report-list.css']
})
export class ReportListComponent implements OnInit {
  private reportService = inject(ReportService);
  reports$: Observable<Report[]>;

  ngOnInit(): void {
    this.reports$ = this.reportService.getReports();
  }
}
