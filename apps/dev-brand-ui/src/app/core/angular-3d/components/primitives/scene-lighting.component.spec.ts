import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { SceneLightingComponent } from './scene-lighting.component';
import { LIGHTING_PRESETS } from '../../types/scene-lighting.types';

describe('SceneLightingComponent', () => {
  let component: SceneLightingComponent;
  let fixture: ComponentFixture<SceneLightingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SceneLightingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SceneLightingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should use default preset when no config or preset provided', () => {
    const lighting = component.lighting();
    expect(lighting).toEqual(LIGHTING_PRESETS['default']);
  });

  it('should use specified preset', () => {
    fixture.componentRef.setInput('preset', 'dramatic');
    fixture.detectChanges();
    const lighting = component.lighting();
    expect(lighting).toEqual(LIGHTING_PRESETS['dramatic']);
  });

  it('should prioritize config over preset', () => {
    const customConfig = {
      ambient: { color: 0x123456, intensity: 1.5 },
    };
    fixture.componentRef.setInput('config', customConfig);
    fixture.componentRef.setInput('preset', 'dramatic');
    fixture.detectChanges();
    const lighting = component.lighting();
    expect(lighting).toEqual(customConfig);
  });

  it('should handle all light types in config', () => {
    const fullConfig = {
      ambient: { color: 0xffffff, intensity: 1.0 },
      directional: [
        {
          color: 0xffffff,
          intensity: 1.5,
          position: [10, 10, 10] as [number, number, number],
        },
      ],
      point: [
        {
          color: 0xff0000,
          intensity: 1.0,
          position: [5, 5, 5] as [number, number, number],
        },
      ],
      spot: [
        {
          color: 0x00ff00,
          intensity: 1.2,
          position: [0, 10, 0] as [number, number, number],
        },
      ],
      hemisphere: { skyColor: 0x87ceeb, groundColor: 0x654321, intensity: 1.0 },
    };
    fixture.componentRef.setInput('config', fullConfig);
    fixture.detectChanges();
    const lighting = component.lighting();
    expect(lighting).toEqual(fullConfig);
  });
});
