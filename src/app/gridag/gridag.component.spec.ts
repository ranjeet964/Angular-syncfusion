import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GridagComponent } from './gridag.component';

describe('GridagComponent', () => {
  let component: GridagComponent;
  let fixture: ComponentFixture<GridagComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GridagComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GridagComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
