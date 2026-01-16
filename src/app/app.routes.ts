import { Routes } from '@angular/router';
import { EntryListComponent } from './components/entry-list/entry-list.component';
import { EntryDetailComponent } from './components/entry-detail/entry-detail.component';
import { SettingsComponent } from './components/settings/settings.component';

export const routes: Routes = [
  { path: '', component: EntryListComponent },
  { path: 'entry/:id', component: EntryDetailComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '**', redirectTo: '' }
];
