import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionParticleBackgroundComponent } from './section-particle-background.component';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

// Mock ParticleSystemComponent
@Component({
  selector: 'app-particle-system',
  standalone: true,
  template: '<div>Mock Particle System</div>',
})
class MockParticleSystemComponent {}

describe('SectionParticleBackgroundComponent', () => {
  let component: SectionParticleBackgroundComponent;
  let fixture: ComponentFixture<SectionParticleBackgroundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionParticleBackgroundComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(SectionParticleBackgroundComponent, {
        remove: {
          imports: [
            // Remove real ParticleSystemComponent
          ],
        },
        add: {
          imports: [MockParticleSystemComponent],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SectionParticleBackgroundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should use purple color palette by default', () => {
    const palette = component.computedColorPalette();
    expect(palette).toContain('#8a2be2'); // Blue Violet
    expect(palette).toContain('#9b59d6'); // Medium Purple
    expect(palette.length).toBe(5);
  });

  it('should use green color palette when tintColor is green', () => {
    fixture.componentRef.setInput('tintColor', 'green');
    fixture.detectChanges();

    const palette = component.computedColorPalette();
    expect(palette).toContain('#32cd32'); // Lime Green
    expect(palette).toContain('#3cb371'); // Medium Sea Green
    expect(palette.length).toBe(5);
  });

  it('should use cyan color palette when tintColor is cyan', () => {
    fixture.componentRef.setInput('tintColor', 'cyan');
    fixture.detectChanges();

    const palette = component.computedColorPalette();
    expect(palette).toContain('#00bfff'); // Deep Sky Blue
    expect(palette).toContain('#1e90ff'); // Dodger Blue
    expect(palette.length).toBe(5);
  });

  it('should use orange color palette when tintColor is orange', () => {
    fixture.componentRef.setInput('tintColor', 'orange');
    fixture.detectChanges();

    const palette = component.computedColorPalette();
    expect(palette).toContain('#ffd700'); // Gold
    expect(palette).toContain('#ffa500'); // Orange
    expect(palette.length).toBe(5);
  });

  it('should use custom color palette when provided', () => {
    const customPalette = ['#ff0000', '#00ff00', '#0000ff'];
    fixture.componentRef.setInput('colorPalette', customPalette);
    fixture.detectChanges();

    const palette = component.computedColorPalette();
    expect(palette).toEqual(customPalette);
  });

  it('should have default particle count of 200', () => {
    expect(component.particleCount()).toBe(200);
  });

  it('should accept custom particle count', () => {
    fixture.componentRef.setInput('particleCount', 50);
    fixture.detectChanges();

    expect(component.particleCount()).toBe(50);
  });

  it('should have default exclusion zone', () => {
    const exclusionZone = component.exclusionZone();
    expect(exclusionZone.x).toBe(10);
    expect(exclusionZone.y).toBe(6);
  });

  it('should accept custom exclusion zone', () => {
    fixture.componentRef.setInput('exclusionZone', { x: 5, y: 3 });
    fixture.detectChanges();

    const exclusionZone = component.exclusionZone();
    expect(exclusionZone.x).toBe(5);
    expect(exclusionZone.y).toBe(3);
  });

  it('should have default particle size of 0.8', () => {
    expect(component.particleSize()).toBe(0.8);
  });

  it('should have default particle opacity of 0.5', () => {
    expect(component.particleOpacity()).toBe(0.5);
  });
});
