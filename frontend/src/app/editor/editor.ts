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

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap(params => {
          const reportId = params.get('id');
          if (!reportId) {
            throw new Error('Report ID not found in route');
          }
          return this.reportService.getEditSession(reportId);
        })
      )
      .subscribe({
        next: (session: EditSession) => {
          /**
           * session.editorUrl must already be:
           * https://word-edit.officeapps.live.com/we/wordeditorframe.aspx?...&signature=...
           */
          console.log('Editor URL from backend:', session.editorUrl);

          this.editorUrl =
            this.sanitizer.bypassSecurityTrustResourceUrl(session.editorUrl);
        },
        error: err => {
          console.error('Failed to get edit session:', err);
        }
      });
  }
}
