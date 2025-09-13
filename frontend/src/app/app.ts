import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { LoginComponent } from './auth/login';
import { EditorComponent } from './editor/editor';
import { ReportListComponent } from './reports/report-list';
import { AuthService } from './auth/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    ReactiveFormsModule,
    LoginComponent,
    EditorComponent,
    ReportListComponent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoggedIn$: Observable<boolean>;

  constructor() {
    this.isLoggedIn$ = this.authService.isLoggedIn();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
