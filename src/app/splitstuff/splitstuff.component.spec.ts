import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SplitstuffComponent } from '../splitstuff.component';

describe('SplitstuffComponent', () => {
  let component: SplitstuffComponent;
  let fixture: ComponentFixture<SplitstuffComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SplitstuffComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SplitstuffComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
