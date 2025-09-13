import { Routes } from '@angular/router';
import { EditorComponent } from './editor/editor';
import { LoginComponent } from './auth/login';
import { AuthGuard } from './auth/auth.guard';
import { ReportListComponent } from './reports/report-list';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'reports',
    component: ReportListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'editor/:id',
    component: EditorComponent,
    canActivate: [AuthGuard]
  },
  { path: '', redirectTo: '/reports', pathMatch: 'full' },
];
