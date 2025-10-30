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

    expect(component.fontSize()).toBe(1.0);
    expect(component.glowIntensity()).toBe(2.5);
    expect(component.pulseSpeed()).toBe(0);
    expect(component.anchorX()).toBe('center');
    expect(component.anchorY()).toBe('middle');
  });
});
