import { Component, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ReportService } from '../services/report.service';
import { EditSession } from '../models/edit-session.model';
import { CommonModule } from '@angular/common';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-editor',
  imports: [CommonModule],
  templateUrl: './editor.html',
  styleUrl: './editor.css',
  standalone: true,
})
export class EditorComponent implements OnInit {
  private reportService = inject(ReportService);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);

  editorUrl: SafeResourceUrl | null = null;
  // This should be configured in an environment-specific file
  private oosDomain = 'https://wopi.rctiplus.com';

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        const reportId = params.get('id');
        if (!reportId) {
          throw new Error('Report ID not found in route');
        }
        return this.reportService.getEditSession(reportId);
      })
    ).subscribe({
      next: (session: EditSession) => {
        const encodedWopiSrc = encodeURIComponent(session.wopiSrc);
        const url = `${this.oosDomain}/we/wordeditorframe.aspx?WOPISrc=${encodedWopiSrc}&access_token=${session.accessToken}`;
        this.editorUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      },
      error: (err) => console.error('Failed to get edit session:', err)
    });
  }
}
