import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { PdfViewerComponent, PdfViewerModule } from '@syncfusion/ej2-angular-pdfviewer';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';


interface Car {
  make: string;
  model: string;
  price: number;
}

@Component({
  selector: 'app-pdf-grid',
  standalone: true,
  imports: [CommonModule, HttpClientModule, PdfViewerModule, AgGridModule],
  templateUrl: './gridag.component.html',
  styleUrls: ['./gridag.component.css']
})
export class GridagComponent {
      document = "https://cdn.syncfusion.com/content/pdf/pdf-succinctly.pdf"
    resourceUrl = "https://cdn.syncfusion.com/ej2/26.2.11/dist/ej2-pdfviewer-lib"

  columnDefs: ColDef<Car>[] = [
    { field: 'make' },
    { field: 'model' },
    { field: 'price' }
  ];

  defaultColDef = {
    sortable: true,
    filter: true
  };

  rowData = [
    { make: 'Toyota', model: 'Celica', price: 35000 },
    { make: 'Ford', model: 'Mondeo', price: 32000 },
    { make: 'Porsche', model: 'Boxster', price: 72000 }
  ];
}
