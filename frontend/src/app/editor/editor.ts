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
    this.route.paramMap.pipe(
      switchMap(params => {
        const reportId = params.get('id');
        if (!reportId) throw new Error('Report ID not found in route');
        return this.reportService.getEditSession(reportId);
      })
    ).subscribe({
      next: (session: EditSession) => {
        // Use the BASE wopiSrc (e.g., https://yourdomain.com/wopi/files/123), NOT + '/contents'
        const encodedWopiSrc = encodeURIComponent(session.wopiSrc);
        const encodedToken = encodeURIComponent(session.accessToken);
        // For editing: Use 'embed.aspx' instead of 'view.aspx' if you want editable mode
        // (view.aspx is read-only; switch to embed.aspx for full edit support)
        //  const url = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedWopiSrc}&access_token=${encodedToken}`;
        // const url = `https://view.officeapps.live.com/op/embed.aspx?src=https://docs.google.com/document/d/1qJgDbFIT19w1NpeEMmRiVzmsYqxqjCGSbE9AP97rZ5g/edit?usp=sharing`;
        const url = `https://word-edit.officeapps.live.com/we/wordeditorframe.aspx?WOPISrc=${encodeURIComponent(session.wopiSrc)}&access_token=${encodeURIComponent(session.accessToken)}`;

        console.log('Generated iframe URL:', url); // Debug: Copy-paste this into a browser to test directly
        this.editorUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      },
      error: (err) => console.error('Failed to get edit session:', err)
    });
  }
}
