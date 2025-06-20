import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { ContextMenuService, SpreadsheetAllModule } from '@syncfusion/ej2-angular-spreadsheet';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, RouterOutlet],
  providers: [ContextMenuService, SpreadsheetAllModule],
  template: `
    <h1>Main Page</h1>
    <nav>
      <a routerLink="/usecase1">Go to Usecase 1</a> |
      <a routerLink="/usecase2">Go to Usecase 2</a>
    </nav>
    <router-outlet></router-outlet>
  `
})
export class AppComponent {}
