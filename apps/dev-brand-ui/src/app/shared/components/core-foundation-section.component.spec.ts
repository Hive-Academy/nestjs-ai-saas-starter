/**
 * Core Foundation Section Component Tests
 *
 * Test suite for CoreFoundationSectionComponent covering:
 * - Component rendering
 * - Content accuracy (langgraph-core features)
 * - Animation initialization
 * - Responsive behavior
 */

import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { CoreFoundationSectionComponent } from './core-foundation-section.component';
import { GlassmorphismCardComponent } from './glassmorphism-card.component';
import { SectionContainerComponent } from './section-container.component';
import { SectionParticleBackgroundComponent } from './section-particle-background.component';

describe('CoreFoundationSectionComponent', () => {
  let component: CoreFoundationSectionComponent;
  let fixture: ComponentFixture<CoreFoundationSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CoreFoundationSectionComponent,
        GlassmorphismCardComponent,
        SectionContainerComponent,
        SectionParticleBackgroundComponent,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CoreFoundationSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Rendering', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should render section container with correct title', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const title = compiled.querySelector('h2');
      expect(title?.textContent).toContain('Core Foundation');
    });

    it('should render section container with correct subtitle', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const subtitle = compiled.querySelector('p');
      expect(subtitle?.textContent).toContain(
        'Enterprise-grade workflow orchestration'
      );
    });
  });

  describe('Content Accuracy', () => {
    it('should display langgraph-core module data', () => {
      const coreModule = component.coreModule();
      expect(coreModule.title).toBe('langgraph-core');
      expect(coreModule.icon).toBe('⚡');
      expect(coreModule.color).toBe('purple');
    });

    it('should display correct feature list', () => {
      const coreModule = component.coreModule();
      expect(coreModule.features).toContain('Type-safe workflow interfaces');
      expect(coreModule.features).toContain('Advanced state management');
      expect(coreModule.features).toContain('Graph-based orchestration');
      expect(coreModule.features).toContain('Conditional routing');
      expect(coreModule.features).toContain('Parallel execution');
      expect(coreModule.features).toContain('Error recovery patterns');
    });

    it('should have exactly 6 features', () => {
      const coreModule = component.coreModule();
      expect(coreModule.features.length).toBe(6);
    });

    it('should render GlassmorphismCard component', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('app-glassmorphism-card');
      expect(card).toBeTruthy();
    });
  });

  describe('3D Particle Background', () => {
    it('should render particle background with purple tint', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const particleBackground = compiled.querySelector(
        'app-section-particle-background'
      );
      expect(particleBackground).toBeTruthy();
    });

    it('should have correct particle count (15)', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const particleBackground = compiled.querySelector(
        'app-section-particle-background'
      );
      expect(
        particleBackground?.getAttribute('ng-reflect-particle-count')
      ).toBe('15');
    });

    it('should use purple tint color', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const particleBackground = compiled.querySelector(
        'app-section-particle-background'
      );
      expect(particleBackground?.getAttribute('ng-reflect-tint-color')).toBe(
        'purple'
      );
    });
  });

  describe('Responsive Layout', () => {
    it('should render centered spotlight card container', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const container = compiled.querySelector('.max-w-4xl');
      expect(container).toBeTruthy();
    });

    it('should apply spotlight-card class for animation', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const spotlightCard = compiled.querySelector('.spotlight-card');
      expect(spotlightCard).toBeTruthy();
    });
  });

  describe('Component Quality Gates', () => {
    it('should be a standalone component', () => {
      expect(
        (CoreFoundationSectionComponent as any).ɵcmp.standalone
      ).toBeTruthy();
    });

    it('should use signal-based state', () => {
      expect(component.coreModule).toBeDefined();
      expect(typeof component.coreModule).toBe('function'); // Signals are functions
    });

    it('should initialize GSAP animation (no errors)', () => {
      // Animation initialization is tested via afterNextRender
      expect(() => fixture.detectChanges()).not.toThrow();
    });
  });
});
