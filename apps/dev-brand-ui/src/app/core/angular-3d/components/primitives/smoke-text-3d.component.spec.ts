import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { SmokeText3DComponent } from './smoke-text-3d.component';

describe('SmokeText3DComponent', () => {
  let component: SmokeText3DComponent;
  let fixture: ComponentFixture<SmokeText3DComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SmokeText3DComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SmokeText3DComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('text', 'Test Smoke');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default particle count', () => {
    expect(component.particleCount()).toBe(30);
  });

  it('should have default smoke color', () => {
    expect(component.smokeColor()).toBe(0xcccccc);
  });

  it('should have default particle size', () => {
    expect(component.particleSize()).toBe(0.5);
  });

  it('should have default smoke speed', () => {
    expect(component.smokeSpeed()).toBe(0.3);
  });

  it('should have default smoke spread', () => {
    expect(component.smokeSpread()).toBe(2);
  });

  it('should have default fade distance', () => {
    expect(component.fadeDistance()).toBe(3);
  });

  it('should compute text options correctly', () => {
    fixture.componentRef.setInput('fontSize', 2);
    fixture.componentRef.setInput('position', [1, 2, 3]);
    fixture.detectChanges();

    const options = component.textOptions();
    expect(options.size).toBe(2);
    expect(options.position).toEqual([1, 2, 3]);
  });

  it('should accept custom particle parameters', () => {
    fixture.componentRef.setInput('particleCount', 50);
    fixture.componentRef.setInput('smokeColor', 0xff0000);
    fixture.componentRef.setInput('particleSize', 1);
    fixture.detectChanges();

    expect(component.particleCount()).toBe(50);
    expect(component.smokeColor()).toBe(0xff0000);
    expect(component.particleSize()).toBe(1);
  });

  it('should initialize particle data', () => {
    fixture.detectChanges();
    // Wait for effect to run
    setTimeout(() => {
      const particles = component.particleData();
      expect(particles.length).toBe(component.particleCount());
    }, 100);
  });

  it('should have text material properties', () => {
    expect(component.textColor()).toBe(0xffffff);
    expect(component.textEmissive()).toBe(0x444444);
    expect(component.textEmissiveIntensity()).toBe(0.5);
  });
});
