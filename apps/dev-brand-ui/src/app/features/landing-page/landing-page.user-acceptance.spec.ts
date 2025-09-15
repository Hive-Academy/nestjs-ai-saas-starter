import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { LandingPageComponent } from './landing-page.component';
import { FullPageScrollService } from './services/fullpage-scroll.service';
import { CinematicScrollService } from './services/cinematic-scroll.service';
import { SectionTransitionService } from './services/section-transition.service';
import { RecordingPerformanceService } from './services/recording-performance.service';
import { LoadingStateService } from './services/loading-state.service';

/**
 * User Acceptance Tests
 * Tests that verify the user's specific requirements are met
 */
describe('LandingPageComponent - User Acceptance Tests', () => {
  let component: LandingPageComponent;
  let fixture: ComponentFixture<LandingPageComponent>;
  let mockFullPageScrollService: jasmine.SpyObj<FullPageScrollService>;
  let mockCinematicScrollService: jasmine.SpyObj<CinematicScrollService>;
  let mockSectionTransitionService: jasmine.SpyObj<SectionTransitionService>;
  let mockRecordingPerformanceService: jasmine.SpyObj<RecordingPerformanceService>;
  let mockLoadingStateService: jasmine.SpyObj<LoadingStateService>;

  beforeEach(async () => {
    // Create service mocks with all required methods
    mockFullPageScrollService = jasmine.createSpyObj('FullPageScrollService', [
      'initialize',
      'destroy',
      'enable',
      'disable',
      'config',
      'sections',
      'goToSection',
      'goToSectionById',
      'updateConfig',
    ]);
    mockFullPageScrollService.config.and.returnValue(signal({}));
    mockFullPageScrollService.sections.and.returnValue([]);

    mockCinematicScrollService = jasmine.createSpyObj(
      'CinematicScrollService',
      [
        'destroy',
        'initializeSections',
        'enableRecordingMode',
        'stopAutoPlay',
        'autoPlayConfig',
        'getDemoInformation',
        'getCinematicTiming',
        'navigateToSection',
      ]
    );
    mockCinematicScrollService.autoPlayConfig.and.returnValue({
      sectionDuration: 8000,
      pauseBetweenSections: 1000,
      transitionDuration: 2000,
    });
    mockCinematicScrollService.getDemoInformation.and.returnValue({
      script: [],
      timings: [],
    });
    mockCinematicScrollService.getCinematicTiming.and.returnValue({
      sectionTimings: [8000, 8000, 8000, 8000, 8000],
      totalDuration: 40000,
    });

    mockSectionTransitionService = jasmine.createSpyObj(
      'SectionTransitionService',
      ['getAllNarrativeFlows']
    );
    mockSectionTransitionService.getAllNarrativeFlows.and.returnValue([
      { from: 'hero', to: 'platform-pillars', narrative: 'test narrative' },
    ]);

    mockRecordingPerformanceService = jasmine.createSpyObj(
      'RecordingPerformanceService',
      ['setOptimizationLevel', 'exportPerformanceReport']
    );
    mockRecordingPerformanceService.exportPerformanceReport.and.returnValue(
      JSON.stringify({ fps: 60, memoryUsage: '100MB' })
    );

    mockLoadingStateService = jasmine.createSpyObj('LoadingStateService', [
      'startLoading',
      'completeLoading',
      'reset',
      'simulateLoading',
      'exportLoadingMetrics',
      'getSectionLoadingSummary',
    ]);
    mockLoadingStateService.simulateLoading.and.returnValue(Promise.resolve());
    mockLoadingStateService.exportLoadingMetrics.and.returnValue(
      JSON.stringify({ totalLoadTime: 1500, sectionsLoaded: 5 })
    );
    mockLoadingStateService.getSectionLoadingSummary.and.returnValue([
      { section: 'hero', loadTime: 300, status: 'loaded' },
    ]);

    await TestBed.configureTestingModule({
      imports: [LandingPageComponent, NoopAnimationsModule],
      providers: [
        { provide: FullPageScrollService, useValue: mockFullPageScrollService },
        {
          provide: CinematicScrollService,
          useValue: mockCinematicScrollService,
        },
        {
          provide: SectionTransitionService,
          useValue: mockSectionTransitionService,
        },
        {
          provide: RecordingPerformanceService,
          useValue: mockRecordingPerformanceService,
        },
        { provide: LoadingStateService, useValue: mockLoadingStateService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('USER REQUIREMENT 1: Fix Layout Width Issues', () => {
    it('ACCEPTANCE CRITERIA: All sections display with full screen width like hero section', () => {
      const allSections =
        fixture.nativeElement.querySelectorAll('.section-container');

      expect(allSections.length).toBeGreaterThan(
        0,
        'Should have section containers'
      );

      allSections.forEach((section: HTMLElement, index: number) => {
        const hasFullWidthClass =
          section.classList.contains('w-screen') ||
          section.classList.contains('w-full');
        expect(hasFullWidthClass).toBe(
          true,
          `Section ${index} should have full screen width matching hero section`
        );
      });
    });

    it('ACCEPTANCE CRITERIA: Width should be consistent across all sections', () => {
      const sectionSelectors = [
        'brand-hero-section',
        'brand-platform-pillars',
        'brand-demo-theater',
        'brand-ecosystem-explorer',
        'brand-architecture-diagram',
      ];

      const sectionWidthClasses: string[][] = [];

      sectionSelectors.forEach((selector, index) => {
        const sectionElement = fixture.nativeElement.querySelector(selector);
        expect(sectionElement).toBeTruthy(`${selector} should be present`);

        const container = sectionElement.closest('.section-container');
        expect(container).toBeTruthy(
          `${selector} should be in section-container`
        );

        // Collect width classes for consistency checking
        const widthClasses = Array.from(container.classList).filter(
          (className: string) => className.startsWith('w-')
        );
        sectionWidthClasses.push(widthClasses);
      });

      // All sections should have similar width classes
      const firstSectionWidthClasses = sectionWidthClasses[0];
      sectionWidthClasses.forEach((widthClasses, index) => {
        const hasConsistentWidth = widthClasses.some(
          (className) => className === 'w-screen' || className === 'w-full'
        );
        expect(hasConsistentWidth).toBe(
          true,
          `Section ${index} should have consistent width classes with hero section`
        );
      });
    });

    it('ACCEPTANCE CRITERIA: No constrained width sections that look smaller than intended', () => {
      const allSections =
        fixture.nativeElement.querySelectorAll('.section-container');

      allSections.forEach((section: HTMLElement, index: number) => {
        // Check for width-constraining classes
        const hasConstrainingClass =
          section.classList.contains('max-w-') ||
          section.classList.contains('container') ||
          Array.from(section.classList).some(
            (cls: string) => cls.startsWith('max-w-') && cls !== 'max-w-none'
          );

        expect(hasConstrainingClass).toBe(
          false,
          `Section ${index} should not have width constraints that make it smaller than full screen`
        );
      });
    });
  });

  describe('USER REQUIREMENT 2: Remove Showcase Navigation Component', () => {
    it('ACCEPTANCE CRITERIA: Showcase navigation component should not be visible', () => {
      const showcaseNavElement = document.querySelector(
        'brand-showcase-navigation'
      );
      expect(showcaseNavElement).toBeNull(
        'Showcase navigation component should be completely removed from the page'
      );
    });

    it('ACCEPTANCE CRITERIA: Only appropriate navigation elements should be present', () => {
      // Check that unwanted navigation is gone
      const unwantedNavSelectors = [
        'brand-showcase-navigation',
        '.showcase-navigation',
        '[showcase-navigation]',
      ];

      unwantedNavSelectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        expect(elements.length).toBe(
          0,
          `No elements should match unwanted navigation selector: ${selector}`
        );
      });

      // Check that appropriate navigation (like router-outlet) remains
      const routerOutlet = document.querySelector('router-outlet');
      expect(routerOutlet).toBeTruthy(
        'Appropriate router-outlet navigation should remain'
      );
    });

    it('ACCEPTANCE CRITERIA: No unwanted navigation components appear anywhere', () => {
      const bodyContent = document.body.innerHTML;

      // Verify no showcase navigation references in DOM
      expect(bodyContent).not.toContain('brand-showcase-navigation');
      expect(bodyContent).not.toContain('showcase-navigation');

      // Verify no bottom or floating navigation that would be unwanted
      const bottomNavElements = document.querySelectorAll(
        '.bottom-nav, .nav-bottom, .fixed-bottom'
      );
      const floatingNavElements = document.querySelectorAll(
        '.floating-nav, .nav-floating'
      );

      expect(bottomNavElements.length).toBe(
        0,
        'No unwanted bottom navigation should appear'
      );
      expect(floatingNavElements.length).toBe(
        0,
        'No unwanted floating navigation should appear'
      );
    });
  });

  describe('USER REQUIREMENT 3: Restore Critical Services', () => {
    it('ACCEPTANCE CRITERIA: SectionTransitionService should be properly integrated and functioning', () => {
      expect(component['sectionTransitionService']).toBeDefined();
      expect(component['sectionTransitionService']).not.toBeNull();

      // Test that service is functional by calling a method
      component.exportDemoInfo();
      expect(
        mockSectionTransitionService.getAllNarrativeFlows
      ).toHaveBeenCalled();
    });

    it('ACCEPTANCE CRITERIA: RecordingPerformanceService should be available and functional', () => {
      expect(component.recordingPerformanceService).toBeDefined();
      expect(component.recordingPerformanceService).not.toBeNull();

      // Test service functionality
      const mockEvent = {
        target: { value: 'Ultra Quality' },
      } as unknown as Event;
      component.onOptimizationChange(mockEvent);

      expect(
        mockRecordingPerformanceService.setOptimizationLevel
      ).toHaveBeenCalledWith('Ultra Quality');
    });

    it('ACCEPTANCE CRITERIA: LoadingStateService should be properly connected', () => {
      expect(component.loadingStateService).toBeDefined();
      expect(component.loadingStateService).not.toBeNull();

      // Test service integration during component lifecycle
      expect(mockLoadingStateService.startLoading).toHaveBeenCalled();
    });

    it('ACCEPTANCE CRITERIA: No commented out service imports should remain', () => {
      // Verify services are actively used, not commented out
      expect(component['sectionTransitionService']).toBeTruthy(
        'SectionTransitionService should be actively imported and injected'
      );
      expect(component.recordingPerformanceService).toBeTruthy(
        'RecordingPerformanceService should be actively imported and injected'
      );
      expect(component.loadingStateService).toBeTruthy(
        'LoadingStateService should be actively imported and injected'
      );
    });
  });

  describe('SUCCESS METRICS VALIDATION', () => {
    it('SUCCESS METRIC: All sections display with consistent full screen width', () => {
      const allSectionContainers =
        fixture.nativeElement.querySelectorAll('.section-container');
      let fullWidthSectionCount = 0;

      allSectionContainers.forEach((section: HTMLElement) => {
        if (
          section.classList.contains('w-screen') ||
          section.classList.contains('w-full')
        ) {
          fullWidthSectionCount++;
        }
      });

      expect(fullWidthSectionCount).toBe(
        allSectionContainers.length,
        'All sections should have consistent full screen width'
      );
    });

    it('SUCCESS METRIC: Showcase navigation component is completely removed', () => {
      const showcaseNavCount = document.querySelectorAll(
        'brand-showcase-navigation, .showcase-navigation'
      ).length;
      expect(showcaseNavCount).toBe(
        0,
        'Showcase navigation should be completely removed'
      );
    });

    it('SUCCESS METRIC: All three critical services are properly integrated and functional', () => {
      // Test all three services are working together
      component.exportDemoInfo();

      expect(
        mockSectionTransitionService.getAllNarrativeFlows
      ).toHaveBeenCalled();
      expect(
        mockRecordingPerformanceService.exportPerformanceReport
      ).toHaveBeenCalled();
      expect(mockLoadingStateService.exportLoadingMetrics).toHaveBeenCalled();

      // Verify no service is null/undefined (indicating they were commented out)
      expect(component['sectionTransitionService']).not.toBeNull();
      expect(component.recordingPerformanceService).not.toBeNull();
      expect(component.loadingStateService).not.toBeNull();
    });

    it('SUCCESS METRIC: Visual layout is uniform across all sections', () => {
      const sectionContainers =
        fixture.nativeElement.querySelectorAll('.section-container');

      // All should have consistent height and width classes
      let uniformSections = 0;
      sectionContainers.forEach((section: HTMLElement) => {
        const hasFullWidth =
          section.classList.contains('w-screen') ||
          section.classList.contains('w-full');
        const hasFullHeight =
          section.classList.contains('h-screen') ||
          section.classList.contains('h-full');

        if (hasFullWidth && hasFullHeight) {
          uniformSections++;
        }
      });

      expect(uniformSections).toBe(
        sectionContainers.length,
        'All sections should have uniform layout with full width and height'
      );
    });

    it('SUCCESS METRIC: No layout constraints affecting section width', () => {
      const allSections =
        fixture.nativeElement.querySelectorAll('.section-container');
      let sectionsWithoutConstraints = 0;

      allSections.forEach((section: HTMLElement) => {
        const hasConstraints =
          section.classList.contains('max-w-') ||
          section.classList.contains('container') ||
          Array.from(section.classList).some(
            (cls: string) => cls.startsWith('max-w-') && cls !== 'max-w-none'
          );

        if (!hasConstraints) {
          sectionsWithoutConstraints++;
        }
      });

      expect(sectionsWithoutConstraints).toBe(
        allSections.length,
        'No sections should have layout constraints affecting width'
      );
    });
  });

  describe('USER EXPERIENCE VALIDATION', () => {
    it('should provide clean visual experience without unwanted navigation', () => {
      const showcaseNavigation = document.querySelector(
        'brand-showcase-navigation'
      );
      expect(showcaseNavigation).toBeNull(
        'Page should be clean without showcase navigation'
      );

      const mainContent = document.querySelector('router-outlet');
      expect(mainContent).toBeTruthy('Main content should be the focus');
    });

    it('should display all sections with consistent full-width visual appearance', () => {
      const sections =
        fixture.nativeElement.querySelectorAll('.section-container');

      sections.forEach((section: HTMLElement, index: number) => {
        const rect = section.getBoundingClientRect();
        // All sections should utilize available width consistently
        expect(
          section.classList.contains('w-full') ||
            section.classList.contains('w-screen')
        ).toBe(true, `Section ${index} should visually appear full-width`);
      });
    });

    it('should have all critical services working to provide intended functionality', () => {
      // Services should work without errors
      expect(() => {
        component.exportDemoInfo();
        const mockEvent = {
          target: { value: 'Performance' },
        } as unknown as Event;
        component.onOptimizationChange(mockEvent);
      }).not.toThrow('All services should work without errors');

      // Verify services responded properly
      expect(
        mockSectionTransitionService.getAllNarrativeFlows
      ).toHaveBeenCalled();
      expect(
        mockRecordingPerformanceService.setOptimizationLevel
      ).toHaveBeenCalledWith('Performance');
      expect(mockLoadingStateService.startLoading).toHaveBeenCalled();
    });
  });
});
