import { Routes } from '@angular/router';
import { EditorComponent } from './editor/editor';

export const routes: Routes = [
  { path: '', redirectTo: '/editor', pathMatch: 'full' },
  { path: 'editor', component: EditorComponent },
];
