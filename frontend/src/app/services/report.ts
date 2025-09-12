import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EditSession {
  wopiSrc: string;
  accessToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000'; // This should be in an environment file

  getEditSession(reportId: string): Observable<EditSession> {
    return this.http.get<EditSession>(`${this.apiUrl}/reports/${reportId}/editSession`);
  }
}
