// src/app/app.component.ts
import { Component, OnInit, ViewChild, OnDestroy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, ActivatedRoute, Router, RouterModule } from '@angular/router';
import data from '../../../data.json';
import newData from '../../../newData.json';

import {
  PdfViewerModule,
  LinkAnnotationService,
  BookmarkViewService,
  MagnificationService,
  ThumbnailViewService,
  ToolbarService,
  NavigationService,
  TextSearchService,
  TextSelectionService,
  PrintService,
  FormDesignerService,
  FormFieldsService,
  AnnotationService,
  PdfViewerComponent
} from '@syncfusion/ej2-angular-pdfviewer';

import {
  SpreadsheetModule,
  SpreadsheetComponent,
  SheetModel,
  SelectEventArgs,
  ContextMenuService,
  SpreadsheetAllModule,
  paste,
  CellSaveEventArgs
} from '@syncfusion/ej2-angular-spreadsheet';

import { BroadcastService } from '../services/broadcast-service.service';
import { AnimateTimings } from '@angular/animations';

// Define interfaces for better type safety
type Cell = {
  OriginalValue: string;
  text: string;
  bbox: [number, number, number, number];
  is_empty: boolean;
};

type TableRow = Cell[];
type TableData = TableRow[];



type ViewMode = 'combined' | 'pdf-only' | 'excel-only';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    PdfViewerModule,
    SpreadsheetModule,
    RouterModule
  ],
  providers: [
    LinkAnnotationService,
    BookmarkViewService,
    MagnificationService,
    ThumbnailViewService,
    ToolbarService,
    NavigationService,
    TextSearchService,
    TextSelectionService,
    PrintService,
    FormDesignerService,
    FormFieldsService,
    AnnotationService,
    ContextMenuService,
    SpreadsheetAllModule
  ],
  templateUrl: './splitstuff.component.html',
  styleUrls: ['./splitstuff.component.css'],
})



export class SplitStuffComponent implements OnInit, OnDestroy {
  @ViewChild('pdfViewer') pdfViewer!: PdfViewerComponent;
  @ViewChild('excelSheet') excelSheet!: SpreadsheetComponent;

  private currPage: number = 1;
  private currentHeaders: string[] = []; // store it here

  public document: string = '';
  public resourceUrl: string = '';

  public customContextMenuItems: any = []


  // Window management
  public currentMode: ViewMode = 'combined';
  private excelWindow: Window | null = null;
  public isUpdatingFromBroadcast = false;


  public rawTable = data.table_cell_df;
  private pdfdata : Record<number, {"table_cell_df":TableData}> = {};
  private sourceDataCopyOrCut :any[][]= [];

  constructor(
    private broadcastService: BroadcastService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    // this.service = 'https://services.syncfusion.com/angular/production/api/pdfviewer';
    // this.document = 'https://cdn.syncfusion.com/content/pdf/pdf-succinctly.pdf';

    //  this.service = 'http://localhost:3000/api/pdfviewer';
    // this.document = 'sample.pdf';

    this.document = "https://cdn.syncfusion.com/content/pdf/pdf-succinctly.pdf"
    this.resourceUrl = "https://cdn.syncfusion.com/ej2/26.2.11/dist/ej2-pdfviewer-lib"


    // Combine all page data into one array
    // this.allData = Object.values(this.pageDataMap).flat();

    // Check URL parameters to determine view mode
    this.route.queryParams.subscribe(params => {
      if (params['mode'] === 'excel') {
        this.currentMode = 'excel-only';
      } else if (params['mode'] === 'pdf') {
        this.currentMode = 'pdf-only';
      } else {
        this.currentMode = 'combined';
      }
    });

    this.pdfdata = newData as any;
    


    // Listen for broadcast messages
    this.broadcastService.onMessage((msg) => {
      this.handleBroadcastMessage(msg);
    });

    
    // Listen for window close events
    window.addEventListener('beforeunload', () => {
      this.broadcastService.sendMessage({
        type: 'WINDOW_CLOSING',
        mode: this.currentMode
      });
    });
  }

  ngOnDestroy(): void {
    if (this.excelWindow && !this.excelWindow.closed) {
      this.excelWindow.close();
    }
  }

  /**
 * Merge either 2 adjacent rows or columns.
 * @param mergeType 'row' or 'column'
 * @param targetIndex Index of the first row/column to merge (0-based)
 */
  private mergeDataCells(mergeType: 'row' | 'column', targetIndex: number): void {
    const sheet = this.excelSheet.getActiveSheet();
    const rowCount = this.rawTable.length;
    const colCount = this.rawTable[0].length;

    if (mergeType === 'row') {
      if (targetIndex + 1 >= rowCount) return;

      const row1 = this.rawTable[targetIndex];
      const row2 = this.rawTable[targetIndex + 1];

      let fullMerge = true;

      for (let c = 0; c < colCount; c++) {
        const cell1 = row1[c];
        const cell2 = row2[c];

        // If both are empty, skip
        if (!cell1.text && !cell2.text) continue;

        if (!cell1.text || !cell2.text) fullMerge = false;

        // Concatenate cell text
        console.log("concatinate text : ",cell1.text);
        
        cell1.text = [cell1.text, cell2.text].filter(Boolean).join(' ');
      }

      // Remove row2 if fully merged
      if (fullMerge) {
        this.rawTable.splice(targetIndex + 1, 1);
      }

    } else if (mergeType === 'column') {
      if (targetIndex + 1 >= colCount) return;

      let fullMerge = true;

      for (let r = 0; r < rowCount; r++) {
        const cell1 = this.rawTable[r][targetIndex];
        const cell2 = this.rawTable[r][targetIndex + 1];

        if (!cell1.text && !cell2.text) continue;

        if (!cell1.text || !cell2.text) fullMerge = false;

        cell1.text = [cell1.text, cell2.text].filter(Boolean).join(' ');
      }

      if (fullMerge) {
        for (let r = 0; r < rowCount; r++) {
          this.rawTable[r].splice(targetIndex + 1, 1);
        }
      }
    }

    // Re-render after merge
    this.loadAllDataToSpreadsheet(this.currPage);
  }

async onCustomContextClick(args: any): Promise<void> {
  try {
    console.log(args);
    
    const sheet = this.excelSheet.getActiveSheet();
    const range = sheet.selectedRange;

    if (!range) {
      alert('Please select a range first');
      return;
    }

    const selection = this.parseSelectedRange(range);
    if (!selection) {
      alert('Invalid selection range');
      return;
    }

    const { startRow, endRow, startCol, endCol, rowSpan, colSpan } = selection;

    // Handle merge rows
    if (args.item.id === 'merge-rows') {
      if (!this.validateRowSelection(rowSpan, colSpan, startRow, endRow)) {
        return;
      }
      await this.mergeRows(sheet, startRow, endRow, startCol, endCol);
    }

    // Handle merge columns
    if (args.item.id === 'merge-cols') {
      if (!this.validateColumnSelection(rowSpan, colSpan, startCol, endCol)) {
        return;
      }
      await this.mergeColumns(sheet, startRow, endRow, startCol, endCol);
    }
    this.writeToFile();
  } catch (error) {
    console.error('Error in custom context click:', error);
    alert('An error occurred during the merge operation');
  }
}

private writeToFile(){
  const jsonStr = JSON.stringify(this.pdfdata, null, 2); // Pretty print
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'updatedData.json';
  a.click();

  window.URL.revokeObjectURL(url);
}

private parseSelectedRange(range: string): any {
  try {
    const [start, end] = range.split(':');
    const startRow = parseInt(start.match(/\d+/)?.[0] || '1', 10) - 1;
    const endRow = parseInt(end.match(/\d+/)?.[0] || '1', 10) - 1;
    const startCol = this.columnLetterToIndex(start.match(/[A-Z]+/)?.[0] || 'A');
    const endCol = this.columnLetterToIndex(end.match(/[A-Z]+/)?.[0] || 'A');

    const rowSpan = Math.abs(endRow - startRow) + 1;
    const colSpan = Math.abs(endCol - startCol) + 1;

    return { startRow, endRow, startCol, endCol, rowSpan, colSpan };
  } catch (error) {
    console.error('Error parsing range:', error);
    return null;
  }
}

private validateRowSelection(rowSpan: number, colSpan: number, startRow: number, endRow: number): boolean {
  if (rowSpan !== 2) {
    alert('Please select exactly 2 adjacent rows');
    return false;
  }

  if (Math.abs(endRow - startRow) !== 1) {
    alert('Selected rows must be adjacent');
    return false;
  }

  return true;
}

private validateColumnSelection(rowSpan: number, colSpan: number, startCol: number, endCol: number): boolean {
  if (colSpan !== 2) {
    alert('Please select exactly 2 adjacent columns');
    return false;
  }

  if (Math.abs(endCol - startCol) !== 1) {
    alert('Selected columns must be adjacent');
    return false;
  }

  return true;
}

private async mergeRows(sheet: any, startRow: number, endRow: number, startCol: number, endCol: number): Promise<void> {
  console.log("in merge rows");
  
  const firstRow = Math.min(startRow, endRow);
  const secondRow = Math.max(startRow, endRow);

  // Check if entire rows are selected (from column A to last used column)
  const isEntireRowMerge = this.isEntireRowSelected(sheet, startCol, endCol);

  // Get data from both rows
  const firstRowData = await this.getRowData(sheet, firstRow, startCol, endCol);
  const secondRowData = await this.getRowData(sheet, secondRow, startCol, endCol);

  // Merge (concatenate) the data
  const mergedData = this.concatenateRowData(firstRowData, secondRowData);

  // Set merged data to first row
  this.setRowData(sheet, firstRow, startCol, mergedData);
  this.updateRowData(firstRow, startCol, mergedData);

  if (isEntireRowMerge) {
    // Remove the second row entirely
    this.deleteRow(sheet, secondRow);
    this.deleteJsonRowEntry(endRow);
  } else {
    // Clear the second row data in the selected range only
    this.clearRowData(sheet, secondRow, startCol, endCol);
    this.clearJsonRowsCell(endRow,startCol, endCol);
  }

  // Refresh the sheet
  this.refreshSheet();
}

private async mergeColumns(sheet: any, startRow: number, endRow: number, startCol: number, endCol: number): Promise<void> {
  const firstCol = Math.min(startCol, endCol);
  const secondCol = Math.max(startCol, endCol);

  // Check if entire columns are selected
  const isEntireColumnMerge = this.isEntireColumnSelected(sheet, startRow, endRow);

  // Get data from both columns
  const firstColData = await this.getColumnData(sheet, firstCol, startRow, endRow);
  const secondColData = await this.getColumnData(sheet, secondCol, startRow, endRow);

  console.log(firstColData, secondColData, 'hehe')

  // Merge (concatenate) the data
  const mergedData = this.concatenateColumnData(firstColData, secondColData);

  // Set merged data to first column
  this.setColumnData(sheet, firstCol, startRow, mergedData);
  this.updateColData(firstCol, startRow, mergedData);

  if (isEntireColumnMerge) {
    // Remove the second column entirely
    this.deleteColumn(sheet, secondCol);
    this.deleteJsonColumnEntry(secondCol);
  } else {
    // Clear the second column data in the selected range only
    this.clearColumnData(sheet, secondCol, startRow, endRow);
    this.clearJsonColumnCell(secondCol, startRow, endRow);
  }

  // Refresh the sheet
  this.refreshSheet();
}

private isEntireRowSelected(sheet: any, startCol: number, endCol: number): boolean {
  // Check if selection spans from column A (0) to the last used column
  const lastUsedColumn = this.getLastUsedColumn(sheet);
  return startCol === 0 && endCol >= lastUsedColumn - 1;
}

private isEntireColumnSelected(sheet: any, startRow: number, endRow: number): boolean {
  // Check if selection spans from row 1 (0) to the last used row
  const lastUsedRow = this.getLastUsedRow(sheet);
  return startRow === 0 && endRow >= lastUsedRow - 1;
}

private async getRowData(sheet: any, rowIndex: number, startCol: number, endCol: number): Promise<any[]> {
  const data: any[] = [];
  for (let col = startCol; col <= endCol; col++) {
    const cellAddress = this.getCellAddress(rowIndex, col);

    const cellData: any = (await this.excelSheet.getData(`${sheet.name}!${cellAddress}`)).get(cellAddress) || {};
    data.push({
      value: cellData.value || '',
      metadata: cellData.metadata || null,
      style: cellData.style || null
    });
  }
  return data;
}

private async getColumnData(sheet: any, colIndex: number, startRow: number, endRow: number): Promise<any[]> {
  const data: any[] = [];
  for (let row = startRow; row <= endRow; row++) {
    const cellAddress = this.getCellAddress(row, colIndex);
    const cellData: any = (await this.excelSheet.getData(`${sheet.name}!${cellAddress}`)).get(cellAddress) || {};
    data.push({
      value: cellData.value || '',
      metadata: cellData.metadata || null,
      style: cellData.style || null
    });
  }
  return data;
}

private concatenateRowData(firstRowData: any[], secondRowData: any[]): any[] {
  const mergedData: any[] = [];
  const maxLength = Math.max(firstRowData.length, secondRowData.length);
  console.log(`concatinate Row data  fD : ${firstRowData[1]} , SD : ${secondRowData[1]} , maxLength : ${maxLength}`);
  

  for (let i = 0; i < maxLength; i++) {
    const first = firstRowData[i] || { value: '', metadata: null, style: null };
    const second = secondRowData[i] || { value: '', metadata: null, style: null };

    const mergedCell = {
      value: this.concatenateValues(first.value, second.value),
      metadata: this.mergeBoundingBoxes(first.metadata, second.metadata),
      style: first.style || second.style || { border: '1px solid #999' }
    };

    mergedData.push(mergedCell);
  }
  console.log(`meataData : ${mergedData.length}`);
  
  return mergedData;
}

private concatenateColumnData(firstColData: any[], secondColData: any[]): any[] {
  const mergedData: any[] = [];
  const maxLength = Math.max(firstColData.length, secondColData.length);

  for (let i = 0; i < maxLength; i++) {
    const first = firstColData[i] || { value: '', metadata: null, style: null };
    const second = secondColData[i] || { value: '', metadata: null, style: null };

    const mergedCell = {
      value: this.concatenateValues(first.value, second.value),
      metadata: this.mergeBoundingBoxes(first.metadata, second.metadata),
      style: first.style || second.style || { border: '1px solid #999' }
    };
    
    
    mergedData.push(mergedCell);
  }

  return mergedData;
}

private concatenateValues(value1: string, value2: string): string {
  // Handle empty values
  if (!value1 && !value2) return '';
  if (!value1) return value2;
  if (!value2) return value1;

  // Add a space between values for better readability
  return `${value1} ${value2}`;
}

private setRowData(sheet: any, rowIndex: number, startCol: number, data: any[]): void {
  console.log("inside set Row data : ",data);
  
  for (let i = 0; i < data.length; i++) {
    const colIndex = startCol + i;
    const cellAddress = this.getCellAddress(rowIndex, colIndex);
    this.excelSheet.updateCell({
      value: data[i].value,
      metadata: data[i].metadata,
      style: data[i].style
    } as any, cellAddress);
  }
}

private setColumnData(sheet: any, colIndex: number, startRow: number, data: any[]): void {
  for (let i = 0; i < data.length; i++) {
    const rowIndex = startRow + i;
    const cellAddress = this.getCellAddress(rowIndex, colIndex);
    this.excelSheet.updateCell({
      value: data[i].value,
      metadata: data[i].metadata,
      style: data[i].style
    } as any, cellAddress);
  }
}

private updateRowData(rowIndex:number, startCol:number, data:any){
  for(let i =0 ;i <data.length; i++){
    console.log("data in row update ", data[i]);
    
    this.pdfdata[this.currPage].table_cell_df[rowIndex][startCol].text = data[i].value;
    this.pdfdata[this.currPage].table_cell_df[rowIndex][startCol++].bbox = data[i]["metadata"];
    
  }
}

private updateColData(colIndex:number, startRow:number, data:any){
  for(let i =0 ;i <data.length; i++){
    this.pdfdata[this.currPage].table_cell_df[startRow][colIndex].text = data[i].value;
    this.pdfdata[this.currPage].table_cell_df[startRow][colIndex].bbox = data[i]["metadata"];
    startRow++;
    
  }
}

private clearRowData(sheet: any, rowIndex: number, startCol: number, endCol: number): void {
  for (let col = startCol; col <= endCol; col++) {
    const cellAddress = this.getCellAddress(rowIndex, col);
    this.excelSheet.updateCell({
      value: '',
      metadata: null,
      style: { border: '1px solid #999' }
    } as any, cellAddress);
  }
}

private clearColumnData(sheet: any, colIndex: number, startRow: number, endRow: number): void {
  for (let row = startRow; row <= endRow; row++) {
    const cellAddress = this.getCellAddress(row, colIndex);
    this.excelSheet.updateCell({
      value: '',
      metadata: null,
      style: { border: '1px solid #999' }
    } as any, cellAddress);
  }
}

private mergeBoundingBoxes(bbox1: number[] | null, bbox2: number[] | null): number[] | null {
  
  if (!bbox1) return bbox2;
  if (!bbox2) return bbox1;
  if (!bbox1 && !bbox2) return null;
  console.log("merged cell ",bbox1 , bbox2 );
  // bbox format: [x1, y1, x2, y2]
  // Take minimum of first coordinates and maximum of second coordinates
  return [
    Math.min(bbox1[0], bbox2[0]), // min x1
    Math.min(bbox1[1], bbox2[1]), // min y1
    Math.max(bbox1[2], bbox2[2]), // max x2
    Math.max(bbox1[3], bbox2[3])  // max y2
  ];
}

private deleteRow(sheet: any, rowIndex: number): void {
  // Use Syncfusion's delete row method
  this.excelSheet.delete(rowIndex, rowIndex, 'Row');
}

private deleteColumn(sheet: any, colIndex: number): void {
  // Use Syncfusion's delete column method
  this.excelSheet.delete(colIndex, colIndex, 'Column');
}

private deleteJsonRowEntry(rowIndex :  number){
  this.pdfdata[this.currPage].table_cell_df.splice(rowIndex,1)
}

private deleteJsonColumnEntry(colIndex : number){
  this.pdfdata[this.currPage].table_cell_df.forEach((e,index)=> {
      console.log("Before row data ",e);
      e.splice(colIndex,1);
      console.log("after row data ",e);
  })
}

private clearJsonRowsCell(rowIndex :  number, startCol:number, endCol:number){
  this.pdfdata[this.currPage].table_cell_df[rowIndex].forEach((e,index)=>{
    if(index >= startCol && index <=endCol){
      e.bbox= [0,0,0,0];      /// should add null or what but null is not allowed so what to do;
      e.is_empty=true;
      e.text = ''
    }
  })
}

private clearJsonColumnCell(colIndex :  number, startRow:number, endRow:number){
  for(let i = startRow ; i <= endRow ;i++){
    this.pdfdata[this.currPage].table_cell_df[i][colIndex].text = '';
    this.pdfdata[this.currPage].table_cell_df[i][colIndex].bbox = [0,0,0,0];
    this.pdfdata[this.currPage].table_cell_df[i][colIndex].is_empty = true;
  }
}

private getLastUsedColumn(sheet: any): number {
  return sheet.usedRange ? sheet.usedRange.colIndex : 10; // fallback to 10 columns
}

private getLastUsedRow(sheet: any): number {
  return sheet.usedRange ? sheet.usedRange.rowIndex : 100; // fallback to 100 rows
}

private getCellAddress(rowIndex: number, colIndex: number): string {
  // Convert row and column indices to cell address (e.g., A1, B2)
  const columnLetter = this.indexToColumnLetter(colIndex);
  return `${columnLetter}${rowIndex + 1}`;
}

private indexToColumnLetter(index: number): string {
  let result = '';
  while (index >= 0) {
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26) - 1;
  }
  return result;
}

private refreshSheet(): void {
  // Refresh the spreadsheet to reflect changes
  this.excelSheet.refresh();
}

onCellSave(args : CellSaveEventArgs){
  console.log("cell save event args ", args);
  console.log(args.address.split("!")[1]);
  const row = parseInt(args.address.split("!")[1].match(/\d+/)?.[0] || '1')-1;
  const col = this.columnLetterToIndex(args.address.split("!")[1].match(/[A-Z]+/)?.[0] || 'A');
  console.log(`row : ${row} col : ${col}`);
  
  

  
}


  /**
   * Handle incoming broadcast messages
   */
  private handleBroadcastMessage(msg: any): void {
    console.log('msggg', msg)
    if (!msg) return;

    this.isUpdatingFromBroadcast = true;



    switch (msg.type) {
      case 'PDF_NAVIGATE':
        console.log(typeof msg.page === 'number')
        if (typeof msg.page === 'number') {
          console.log(`Received PDF navigation to page ${msg.page}`);
          // this.scrollToAndHighlightExcelRow(msg.page)
        }
        break;

      case 'EXCEL_ROW_SELECTED':
        if (typeof msg.page === 'number' && this.pdfViewer) {
          console.log(`Received Excel selection, navigating PDF to page ${msg.page}`);
          this.pdfViewer.navigation.goToPage(msg.page);
        }
        break;

      case 'WINDOW_CLOSING':
        if (msg.mode === 'excel-only') {
          this.excelWindow = null;
          // Optionally switch back to combined mode
          this.currentMode = 'combined';
        }
        this.router.navigate([], {
          queryParams: { mode: null }, // ❗️Set to null to remove
          queryParamsHandling: 'merge' // ⬅️ Merge with existing params except 'mode'
        });
        break;

      case 'PING':
        // Respond to ping to confirm this window is active
        this.broadcastService.sendMessage({
          type: 'PONG',
          mode: this.currentMode,
          timestamp: Date.now()
        });
        break;
    }

    this.isUpdatingFromBroadcast = false;
  }

  private columnLetterToKey(col: string): string {
    const index = col.charCodeAt(0) - 65;
    return this.currentHeaders[index] || '';
  }

  /**
   * Split into separate windows - PDF stays, Excel opens in new tab
   */
  splitWindows(): void {
    if (this.excelWindow && !this.excelWindow.closed) {
      this.excelWindow.focus();
      return;
    }

    // Get current URL and modify it for Excel mode
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('mode', 'excel');

    // Open Excel in new window
    this.excelWindow = window.open(
      currentUrl.toString(),
      'excel-window',
      'width=1200,height=800,scrollbars=yes,resizable=yes'
    );

    if (this.excelWindow) {
      // Switch current window to PDF-only mode
      this.router.navigate([

      ], {
        queryParams: { mode: 'pdf' },
        queryParamsHandling: 'merge'
      });

      // Send initialization message to new window
      setTimeout(() => {
        this.broadcastService.sendMessage({
          type: 'WINDOW_SPLIT',
          pdfWindow: true,
          excelWindow: false
        });
      }, 1000);
    }
  }

  /**
   * Combine windows back together
   */
  combineWindows(): void {
    if (this.excelWindow && !this.excelWindow.closed) {
      this.excelWindow.close();
      this.excelWindow = null;
    }

    // Switch back to combined mode
    this.router.navigate([], {
      queryParams: { mode: null }, // ❗️Set to null to remove
      queryParamsHandling: 'merge' // ⬅️ Merge with existing params except 'mode'
    });

    this.broadcastService.sendMessage({
      type: 'WINDOWS_COMBINED'
    });
  }

  /**
   * Event handler for when the spreadsheet is created and ready
   */
  onSpreadsheetCreated(): void {
    if (this.currentMode === 'excel-only' || this.currentMode === 'combined') {



      console.log('Spreadsheet created, loading data...');
      this.loadAllDataToSpreadsheet(1);
    }
  }


  /**
   * Loads all data from all pages into the spreadsheet at once
   */

  private getColLetter(colIndex: number): string {
    let temp = '';
    let col = colIndex + 1;
    while (col > 0) {
      const mod = (col - 1) % 26;
      temp = String.fromCharCode(65 + mod) + temp;
      col = Math.floor((col - mod) / 26);
    }
    return temp;
  }


  private clearSheet(): void {
    const sheet = this.excelSheet.getActiveSheet();
    const usedRange = sheet.usedRange!;
    const lastRow = usedRange.rowIndex!;
    const lastCol = usedRange.colIndex!;

    const range = `${sheet.name}!A1:${this.getColLetter(lastCol)}${lastRow + 1}`;

    this.excelSheet.clear({
      type: 'Clear All',
      range
    });


  }

  private loadAllDataToSpreadsheet(pageNumber: number): void {
    if (!this.excelSheet || !this.rawTable || this.rawTable.length === 0) return;

    this.clearSheet();
    this.rawTable = this.pdfdata[pageNumber].table_cell_df;
    console.log(this.rawTable );
    
    const sheet = this.excelSheet.getActiveSheet()!;
    const headers = this.rawTable[0]; // First row as headers

    this.currentHeaders = headers.map((cell, i) => cell.text.trim() || `Col${i + 1}`);

    let row = 1;

    // Header row
    this.currentHeaders.forEach((header, colIndex) => {
      const cellAddress = `${String.fromCharCode(65 + colIndex)}${row}`;
      this.excelSheet.updateCell({
        value: header.toUpperCase(),
        metadata: this.rawTable[0][colIndex].bbox,
        style: {
          fontWeight: 'bold',
          backgroundColor: '#dceeff',
          border: '1px solid #333'
        }
      }as any, cellAddress);
    });

    row++;

    // Data rows
    for (let r = 1; r < this.rawTable.length; r++) {
      const rowData = this.rawTable[r];

      rowData.forEach((cell, colIndex) => {
        const cellAddress = `${String.fromCharCode(65 + colIndex)}${row}`;

        this.excelSheet.updateCell({
          value: cell.text,
          metadata: cell.bbox,
          style: { border: '1px solid #999' }
        } as any, cellAddress);

      });

      row++;
    }
    setTimeout(() => {
      this.excelSheet.autoFit('A:Z');
    }, 100);

    console.log('Raw table loaded into spreadsheet');
  }

 async onBeforeAction(args: any){
    console.log("action :",args);
    
    if(args){
      try{
        const sheet = this.excelSheet.getActiveSheet();
          if(args?.action === 'copy'  || args?.action === 'cut' ){
            this.sourceDataCopyOrCut = []
              const [sheetname , range] = args?.args?.copiedRange.split("!");
              const sourceRange = this.parseSelectedRange(range);
              for(let i=sourceRange.startRow; i <= sourceRange.endRow ; i++){
                const rowData =  await this.getRowData(sheet,i,sourceRange.startCol,sourceRange.endCol);
                this.sourceDataCopyOrCut.push(rowData)
                console.log("source Range : ", sourceRange);
                
                
            }
          }else if(args?.action === 'clipboard' && args?.args?.eventArgs?.type === 'paste'){
            const targetRange = this.parseSelectedRange(args?.args?.eventArgs?.pastedRange);
            console.log(this.sourceDataCopyOrCut);
            this.updateJsonDataAfterPaste(targetRange.startRow,targetRange.endRow,targetRange.startCol,targetRange.endCol,this.sourceDataCopyOrCut);
            console.log("target Range ", targetRange);
            
          }
      }catch{
        console.error("failed to paste cell contain");
        
      }
    }
    
  }

  private updateJsonDataAfterPaste(rowStart:number, rowEnd:number,colStart:number,colEnd:number,data:any[][]){
    for(let i =0; i< data.length;i++){
      console.log(`update row  ${rowStart}, colStart : ${colStart} , data : ${data}`);
      
      this.updateRowData(rowStart+i,colStart,data[i])
    }
    // this.writeToFile();

  }
  public contextMenuCustom(args: any): void {
    
    this.excelSheet.addContextMenuItems(
      [
        { text: '🔀 Merge Selected Rows', id: 'merge-rows' },
        { text: '↔️ Merge Selected Columns', id: 'merge-cols' }
      ],
      'Paste',     // 👈 insert relative to this item
      true,        // 👈 insert after 'Paste'
    );

    

  }

  /**
   * Handles cell selection in the spreadsheet
   */

  private getEffectivePage(page: number): number | null {
    let current = page;

    // while (current > 0) {
    //   if (this.pageDataMap[current]?.length > 0) {
    //     return current + 1;
    //   }
    //   current--;
    // }

    return null; // no data found at all
  }

  private columnLetterToIndex(letter: string): number {
    let index = 0;
    for (let i = 0; i < letter.length; i++) {
      index *= 26;
      index += letter.charCodeAt(i) - 64; // 'A' is 65
    }
    return index - 1; // Convert to 0-based index
  }


  private getModelCell(address: string): any {
    const col = address.match(/[A-Z]+/)?.[0] || 'A';
    const row = parseInt(address.match(/\d+/)?.[0] || '1', 10);

    const colIndex = this.columnLetterToIndex(col);
    const rowIndex = row - 1;

    const sheet = this.excelSheet.getActiveSheet();
    return sheet.rows?.[rowIndex]?.cells?.[colIndex] as any;
  }



  onCellSelect(args: SelectEventArgs): void {
    if (!args.range || this.isUpdatingFromBroadcast) return;

    const selectedCell = this.getModelCell(args.range.split(':')[0]);

  }


  // private scrollToAndHighlightExcelRow(pageNumber: number): void {
  //   console.log('hehe')
  //   if (!this.excelSheet || !this.pageDataMap[pageNumber]) return;

  //   const targetData = this.pageDataMap[pageNumber];
  //   const allRows = Object.entries(this.excelRowToDataMap);

  //   for (const [rowStr, data] of allRows) {
  //     const rowIndex = parseInt(rowStr, 10);
  //     const shouldHighlight = targetData.some(d => d.ID === data.ID);

  //     // Set background color for target rows, reset others
  //     // this.excelSheet.setRowStyle(
  //     //   { backgroundColor: shouldHighlight ? '#fff4c4' : '#ffffff' },
  //     //   rowIndex
  //     // );

  //     // Scroll to first matching row
  //     if (shouldHighlight) {
  //       this.excelSheet.selectRange(`A${rowIndex}`);
  //       this.excelSheet.goTo(`A${rowIndex}`);
  //       break; // scroll to first relevant row only
  //     }
  //   }
  // }

  // private scrollToAndHighlightExcelRow(pageNumber: number): void {
  //   if (!this.excelSheet) return;

  //   // Find the row number from the pageDataMap
  //   const dataGroup = this.pageDataMap[pageNumber];
  //   if (!dataGroup || dataGroup.length === 0) return;

  //   const rowIndex = this.findRowIndexForPage(pageNumber); // 👇 You must implement this

  //   if (rowIndex === -1) return;

  //   // Assuming the number of columns is known (e.g., 6 for ID, Name, Revenue, Profit, FiscalYear, PageNumber)
  //   const columnCount = 6;

  //   for (let col = 0; col < columnCount; col++) {
  //     const colLetter = String.fromCharCode(65 + col); // A, B, C...
  //     const cellAddress = `${colLetter}${rowIndex}`;
  //     this.excelSheet.updateCell({
  //       style: {
  //         backgroundColor: '#ffeb3b', // Yellow highlight
  //         fontWeight: 'bold'
  //       }
  //     }, cellAddress);
  //   }

  //   // Scroll to the row (optional)
  //   this.excelSheet.goTo(`A${rowIndex}`);
  // }
  // private findRowIndexForPage(pageNumber: number): number {
  //   let row = 1;
  //   for (const page in this.pageDataMap) {
  //     const group = this.pageDataMap[parseInt(page)];
  //     if (!group) continue;

  //     // 1 header + group.length rows
  //     if (parseInt(page) === pageNumber) {
  //       return row + 1; // skip header
  //     }

  //     row += group.length + 1;
  //   }

  //   return -1;
  // }



  /**
   * Handle PDF page changes
   */
  onPageChange(args: { currentPageNumber: number }): void {


    if (this.currentMode === 'combined' && this.pdfViewer) {
      // this.scrollToAndHighlightExcelRow(args.currentPageNumber);
    }
    this.currPage = args.currentPageNumber;
    const effectivePage = this.getEffectivePage(args.currentPageNumber);

    this.currentHeaders = []
    this.loadAllDataToSpreadsheet(this.currPage)
    setTimeout(() => {
      this.excelSheet.goTo('A1'); // Scroll to top-left corner
    }, 100);

    if (this.isUpdatingFromBroadcast) return;

    console.log(`PDF page changed to: ${args.currentPageNumber}`);



    // Broadcast PDF page change
    this.broadcastService.sendMessage({
      type: 'PDF_NAVIGATE',
      page: args.currentPageNumber,
      timestamp: Date.now()
    });
  }

  /**
   * Check if current mode should show PDF
   */
  get showPdf(): boolean {
    return this.currentMode === 'combined' || this.currentMode === 'pdf-only';
  }

  /**
   * Check if current mode should show Excel
   */
  get showExcel(): boolean {
    return this.currentMode === 'combined' || this.currentMode === 'excel-only';
  }

  /**
   * Get title for current window
   */
  get windowTitle(): string {
    switch (this.currentMode) {
      case 'pdf-only': return 'PDF Viewer';
      case 'excel-only': return 'Excel Data';
      default: return 'PDF & Excel Viewer';
    }
  }
}