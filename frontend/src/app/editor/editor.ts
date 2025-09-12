import { Component, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ReportService, EditSession } from '../services/report';
import { CommonModule } from '@angular/common';

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

  editorUrl: SafeResourceUrl | null = null;
  private oosDomain = 'https://oos.myhealthdomain.com'; // This should be in an environment file

  ngOnInit(): void {
    const reportId = '1'; // Hardcoded for this example
    this.reportService.getEditSession(reportId).subscribe((session: EditSession) => {
      const url = `${this.oosDomain}/we/wordeditorframe.aspx?WOPISrc=${session.wopiSrc}&access_token=${session.accessToken}`;
      this.editorUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    });
  }
}
