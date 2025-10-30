import { TestBed } from '@angular/core/testing';
import { Text3DVolumetricComponent } from './text-3d-volumetric.component';
import { NgtCanvas } from 'angular-three';

describe('Text3DVolumetricComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Text3DVolumetricComponent, NgtCanvas],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Text3DVolumetricComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should have default values', () => {
    const fixture = TestBed.createComponent(Text3DVolumetricComponent);
    const component = fixture.componentInstance;

    expect(component.size()).toBe(1);
    expect(component.depth()).toBe(0.2);
    expect(component.glowIntensity()).toBe(3.0);
  });
});
