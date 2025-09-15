import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { LandingPageComponent } from './landing-page.component';
import { FullPageScrollService } from './services/fullpage-scroll.service';
import { CinematicScrollService } from './services/cinematic-scroll.service';
import { SectionTransitionService } from './services/section-transition.service';
import { RecordingPerformanceService } from './services/recording-performance.service';
import { LoadingStateService } from './services/loading-state.service';

/**
 * Layout Width Consistency Tests
 * Tests that all sections have consistent full-screen width matching the hero section
 */
describe('LandingPageComponent - Layout Width Consistency', () => {
  let component: LandingPageComponent;
  let fixture: ComponentFixture<LandingPageComponent>;
  let mockFullPageScrollService: jasmine.SpyObj<FullPageScrollService>;
  let mockCinematicScrollService: jasmine.SpyObj<CinematicScrollService>;
  let mockSectionTransitionService: jasmine.SpyObj<SectionTransitionService>;
  let mockRecordingPerformanceService: jasmine.SpyObj<RecordingPerformanceService>;
  let mockLoadingStateService: jasmine.SpyObj<LoadingStateService>;

  beforeEach(async () => {
    // Create service mocks
    mockFullPageScrollService = jasmine.createSpyObj('FullPageScrollService', [
      'initialize', 'destroy', 'enable', 'disable', 'config', 'sections'
    ]);
    mockFullPageScrollService.config.and.returnValue(signal({}));
    mockFullPageScrollService.sections.and.returnValue([]);

    mockCinematicScrollService = jasmine.createSpyObj('CinematicScrollService', [
      'destroy', 'initializeSections'
    ]);

    mockSectionTransitionService = jasmine.createSpyObj('SectionTransitionService', [
      'getAllNarrativeFlows'
    ]);
    mockSectionTransitionService.getAllNarrativeFlows.and.returnValue([]);

    mockRecordingPerformanceService = jasmine.createSpyObj('RecordingPerformanceService', [
      'setOptimizationLevel', 'exportPerformanceReport'
    ]);
    mockRecordingPerformanceService.exportPerformanceReport.and.returnValue('{}');

    mockLoadingStateService = jasmine.createSpyObj('LoadingStateService', [
      'startLoading', 'completeLoading', 'reset', 'simulateLoading', 
      'exportLoadingMetrics', 'getSectionLoadingSummary'
    ]);
    mockLoadingStateService.simulateLoading.and.returnValue(Promise.resolve());
    mockLoadingStateService.exportLoadingMetrics.and.returnValue('{}');
    mockLoadingStateService.getSectionLoadingSummary.and.returnValue([]);

    await TestBed.configureTestingModule({
      imports: [LandingPageComponent, NoopAnimationsModule],
      providers: [
        { provide: FullPageScrollService, useValue: mockFullPageScrollService },
        { provide: CinematicScrollService, useValue: mockCinematicScrollService },
        { provide: SectionTransitionService, useValue: mockSectionTransitionService },
        { provide: RecordingPerformanceService, useValue: mockRecordingPerformanceService },
        { provide: LoadingStateService, useValue: mockLoadingStateService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LandingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Layout Width Requirements', () => {
    it('should render all section containers with full screen width class', () => {
      const sectionContainers = fixture.nativeElement.querySelectorAll('.section-container');
      
      expect(sectionContainers.length).toBeGreaterThan(0);
      
      sectionContainers.forEach((section: HTMLElement, index: number) => {
        // Each section should have w-screen for full screen width
        const hasFullWidthClass = section.classList.contains('w-screen') || 
                                 section.classList.contains('w-full');
        expect(hasFullWidthClass)
          .toBe(true, `Section ${index} should have full width class (w-screen or w-full)`);
      });
    });

    it('should have hero section with correct full-width styling as reference', () => {
      const heroSection = fixture.nativeElement.querySelector('brand-hero-section');
      expect(heroSection).toBeTruthy('Hero section should be present as reference');
      
      // Hero section should be within a section container with full width
      const heroContainer = heroSection.closest('.section-container');
      expect(heroContainer).toBeTruthy('Hero should be in section container');
      
      const hasFullWidthClass = heroContainer.classList.contains('w-screen') || 
                               heroContainer.classList.contains('w-full');
      expect(hasFullWidthClass).toBe(true, 'Hero section container should have full width');
    });

    it('should have platform pillars section with consistent width styling', () => {
      const platformPillarsSection = fixture.nativeElement.querySelector('brand-platform-pillars');
      expect(platformPillarsSection).toBeTruthy('Platform pillars section should be present');
      
      const platformContainer = platformPillarsSection.closest('.section-container');
      expect(platformContainer).toBeTruthy('Platform pillars should be in section container');
      
      const hasFullWidthClass = platformContainer.classList.contains('w-screen') || 
                               platformContainer.classList.contains('w-full');
      expect(hasFullWidthClass).toBe(true, 'Platform pillars section should have full width');
    });

    it('should have demo theater section with consistent width styling', () => {
      const demoTheaterSection = fixture.nativeElement.querySelector('brand-demo-theater');
      expect(demoTheaterSection).toBeTruthy('Demo theater section should be present');
      
      const theaterContainer = demoTheaterSection.closest('.section-container');
      expect(theaterContainer).toBeTruthy('Demo theater should be in section container');
      
      const hasFullWidthClass = theaterContainer.classList.contains('w-screen') || 
                               theaterContainer.classList.contains('w-full');
      expect(hasFullWidthClass).toBe(true, 'Demo theater section should have full width');
    });

    it('should have ecosystem explorer section with consistent width styling', () => {
      const ecosystemSection = fixture.nativeElement.querySelector('brand-ecosystem-explorer');
      expect(ecosystemSection).toBeTruthy('Ecosystem explorer section should be present');
      
      const ecosystemContainer = ecosystemSection.closest('.section-container');
      expect(ecosystemContainer).toBeTruthy('Ecosystem explorer should be in section container');
      
      const hasFullWidthClass = ecosystemContainer.classList.contains('w-screen') || 
                               ecosystemContainer.classList.contains('w-full');
      expect(hasFullWidthClass).toBe(true, 'Ecosystem explorer section should have full width');
    });

    it('should have architecture diagram section with consistent width styling', () => {
      const architectureSection = fixture.nativeElement.querySelector('brand-architecture-diagram');
      expect(architectureSection).toBeTruthy('Architecture diagram section should be present');
      
      const architectureContainer = architectureSection.closest('.section-container');
      expect(architectureContainer).toBeTruthy('Architecture diagram should be in section container');
      
      const hasFullWidthClass = architectureContainer.classList.contains('w-screen') || 
                               architectureContainer.classList.contains('w-full');
      expect(hasFullWidthClass).toBe(true, 'Architecture diagram section should have full width');
    });
  });

  describe('Visual Consistency Validation', () => {
    it('should have all sections with h-screen class for consistent height', () => {
      const sectionContainers = fixture.nativeElement.querySelectorAll('.section-container');
      
      sectionContainers.forEach((section: HTMLElement, index: number) => {
        const hasFullHeightClass = section.classList.contains('h-screen') || 
                                   section.classList.contains('h-full');
        expect(hasFullHeightClass)
          .toBe(true, `Section ${index} should have full height class (h-screen or h-full)`);
      });
    });

    it('should not have width constraints that would prevent full-screen display', () => {
      const sectionContainers = fixture.nativeElement.querySelectorAll('.section-container');
      
      sectionContainers.forEach((section: HTMLElement, index: number) => {
        // Check for constraining classes that would limit width
        const hasConstrainingClass = section.classList.contains('max-w-') || 
                                     section.classList.contains('container') ||
                                     section.classList.contains('mx-auto');
        expect(hasConstrainingClass)
          .toBe(false, `Section ${index} should not have width-constraining classes`);
      });
    });

    it('should maintain consistent section structure across all sections', () => {
      const allSections = [
        'brand-hero-section',
        'brand-platform-pillars', 
        'brand-demo-theater',
        'brand-ecosystem-explorer',
        'brand-architecture-diagram'
      ];

      allSections.forEach(sectionSelector => {
        const sectionElement = fixture.nativeElement.querySelector(sectionSelector);
        expect(sectionElement).toBeTruthy(`${sectionSelector} should be present`);
        
        const container = sectionElement.closest('.section-container');
        expect(container).toBeTruthy(`${sectionSelector} should be in section-container`);
      });
    });
  });
});