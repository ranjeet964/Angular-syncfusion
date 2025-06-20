import { Routes } from '@angular/router';
import { SplitStuffComponent } from './splitstuff/splitstuff.component';
import { GridagComponent } from './gridag/gridag.component';

export const routes: Routes = [
  { path: 'usecase1', component:  SplitStuffComponent},
  { path: 'usecase2', component: GridagComponent },
  { path: '**', redirectTo: '' }
];