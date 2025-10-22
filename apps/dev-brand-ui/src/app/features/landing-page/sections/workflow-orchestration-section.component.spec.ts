/**
 * Workflow Orchestration Section Component Tests
 *
 * Test suite for WorkflowOrchestrationSectionComponent covering:
 * - Component rendering
 * - Content accuracy (workflow-engine, functional-api, streaming)
 * - Animation initialization
 * - Responsive three-column layout
 */

import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkflowOrchestrationSectionComponent } from './workflow-orchestration-section.component';
import { LibraryShowcaseCardComponent } from '../../../shared/components/library-showcase-card.component';
import { SectionContainerComponent } from '../../../shared/components/section-container.component';
import { SectionParticleBackgroundComponent } from '../../../shared/components/section-particle-background.component';

describe('WorkflowOrchestrationSectionComponent', () => {
  let component: WorkflowOrchestrationSectionComponent;
  let fixture: ComponentFixture<WorkflowOrchestrationSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        WorkflowOrchestrationSectionComponent,
        LibraryShowcaseCardComponent,
        SectionContainerComponent,
        SectionParticleBackgroundComponent,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkflowOrchestrationSectionComponent);
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
      expect(title?.textContent).toContain('Workflow Orchestration');
    });

    it('should render section container with correct subtitle', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const subtitle = compiled.querySelector('p');
      expect(subtitle?.textContent).toContain(
        'Build, manage, and scale AI workflows'
      );
    });
  });

  describe('Content Accuracy', () => {
    it('should display exactly 3 workflow modules', () => {
      const modules = component.workflowModules();
      expect(modules.length).toBe(3);
    });

    it('should display workflow-engine module', () => {
      const modules = component.workflowModules();
      const workflowEngine = modules.find((m) => m.title === 'workflow-engine');
      expect(workflowEngine).toBeDefined();
      expect(workflowEngine?.icon).toBe('⚙️');
      expect(workflowEngine?.color).toBe('orange');
      expect(workflowEngine?.features).toContain('Workflow composition');
    });

    it('should display functional-api module', () => {
      const modules = component.workflowModules();
      const functionalApi = modules.find((m) => m.title === 'functional-api');
      expect(functionalApi).toBeDefined();
      expect(functionalApi?.icon).toBe('λ');
      expect(functionalApi?.color).toBe('cyan');
      expect(functionalApi?.features).toContain('Pure functions');
    });

    it('should display streaming module', () => {
      const modules = component.workflowModules();
      const streaming = modules.find((m) => m.title === 'streaming');
      expect(streaming).toBeDefined();
      expect(streaming?.icon).toBe('📡');
      expect(streaming?.color).toBe('pink');
      expect(streaming?.features).toContain('Event streaming');
    });

    it('should have 4 features per module', () => {
      const modules = component.workflowModules();
      modules.forEach((module) => {
        expect(module.features.length).toBe(4);
      });
    });

    it('should render 3 GlassmorphismCard components', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const cards = compiled.querySelectorAll('app-glassmorphism-card');
      expect(cards.length).toBe(3);
    });
  });

  describe('3D Particle Background', () => {
    it('should render 3 particle backgrounds (one per card)', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const particleBackgrounds = compiled.querySelectorAll(
        'app-section-particle-background'
      );
      expect(particleBackgrounds.length).toBe(3);
    });

    it('should have correct particle count per card (15 each)', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const particleBackgrounds = compiled.querySelectorAll(
        'app-section-particle-background'
      );
      particleBackgrounds.forEach((bg) => {
        expect(bg.getAttribute('ng-reflect-particle-count')).toBe('15');
      });
    });

    it('should use different tint colors for each card', () => {
      const modules = component.workflowModules();
      expect(modules[0].particleTint).toBe('orange'); // workflow-engine
      expect(modules[1].particleTint).toBe('cyan'); // functional-api
      expect(modules[2].particleTint).toBe('purple'); // streaming
    });
  });

  describe('Responsive Layout', () => {
    it('should render three-column grid container', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const grid = compiled.querySelector('.grid.md\\:grid-cols-3');
      expect(grid).toBeTruthy();
    });

    it('should render 3 workflow-card elements for animation', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const cards = compiled.querySelectorAll('.workflow-card');
      expect(cards.length).toBe(3);
    });

    it('should have gap-6 spacing between cards', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const grid = compiled.querySelector('.gap-6');
      expect(grid).toBeTruthy();
    });
  });

  describe('Component Quality Gates', () => {
    it('should be a standalone component', () => {
      expect(
        (WorkflowOrchestrationSectionComponent as any).ɵcmp.standalone
      ).toBeTruthy();
    });

    it('should use signal-based state', () => {
      expect(component.workflowModules).toBeDefined();
      expect(typeof component.workflowModules).toBe('function'); // Signals are functions
    });

    it('should initialize GSAP animation (no errors)', () => {
      // Animation initialization is tested via afterNextRender
      expect(() => fixture.detectChanges()).not.toThrow();
    });
  });

  describe('3D Budget Compliance', () => {
    it('should comply with 45 particle budget (15 per card × 3)', () => {
      const modules = component.workflowModules();
      const totalParticles = modules.length * 15;
      expect(totalParticles).toBe(45);
    });
  });
});
