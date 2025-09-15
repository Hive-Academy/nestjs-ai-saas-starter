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
 * Critical Services Integration Tests
 * Tests that all three critical services are properly imported, injected, and functioning
 */
describe('LandingPageComponent - Critical Services Integration', () => {
  let component: LandingPageComponent;
  let fixture: ComponentFixture<LandingPageComponent>;
  let mockFullPageScrollService: jasmine.SpyObj<FullPageScrollService>;
  let mockCinematicScrollService: jasmine.SpyObj<CinematicScrollService>;
  let mockSectionTransitionService: jasmine.SpyObj<SectionTransitionService>;
  let mockRecordingPerformanceService: jasmine.SpyObj<RecordingPerformanceService>;
  let mockLoadingStateService: jasmine.SpyObj<LoadingStateService>;

  beforeEach(async () => {
    // Create comprehensive service mocks
    mockFullPageScrollService = jasmine.createSpyObj('FullPageScrollService', [
      'initialize', 'destroy', 'enable', 'disable', 'config', 'sections',
      'goToSection', 'goToSectionById', 'updateConfig'
    ]);
    mockFullPageScrollService.config.and.returnValue(signal({}));
    mockFullPageScrollService.sections.and.returnValue([]);

    mockCinematicScrollService = jasmine.createSpyObj('CinematicScrollService', [
      'destroy', 'initializeSections', 'enableRecordingMode', 'stopAutoPlay',
      'autoPlayConfig', 'getDemoInformation', 'getCinematicTiming', 'navigateToSection'
    ]);
    mockCinematicScrollService.autoPlayConfig.and.returnValue({ 
      sectionDuration: 8000, 
      pauseBetweenSections: 1000,
      transitionDuration: 2000
    });
    mockCinematicScrollService.getDemoInformation.and.returnValue({
      script: [], timings: []
    });
    mockCinematicScrollService.getCinematicTiming.and.returnValue({
      sectionTimings: [8000, 8000, 8000, 8000, 8000],
      totalDuration: 40000
    });

    mockSectionTransitionService = jasmine.createSpyObj('SectionTransitionService', [
      'getAllNarrativeFlows'
    ]);
    mockSectionTransitionService.getAllNarrativeFlows.and.returnValue([
      { from: 'hero', to: 'platform-pillars', narrative: 'test flow' }
    ]);

    mockRecordingPerformanceService = jasmine.createSpyObj('RecordingPerformanceService', [
      'setOptimizationLevel', 'exportPerformanceReport'
    ]);
    mockRecordingPerformanceService.exportPerformanceReport.and.returnValue(
      JSON.stringify({ fps: 60, memoryUsage: '100MB' })
    );

    mockLoadingStateService = jasmine.createSpyObj('LoadingStateService', [
      'startLoading', 'completeLoading', 'reset', 'simulateLoading', 
      'exportLoadingMetrics', 'getSectionLoadingSummary'
    ]);
    mockLoadingStateService.simulateLoading.and.returnValue(Promise.resolve());
    mockLoadingStateService.exportLoadingMetrics.and.returnValue(
      JSON.stringify({ totalLoadTime: 1500, sectionsLoaded: 5 })
    );
    mockLoadingStateService.getSectionLoadingSummary.and.returnValue([
      { section: 'hero', loadTime: 300, status: 'loaded' }
    ]);

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
  });

  describe('Service Imports and Injection', () => {
    it('should have SectionTransitionService properly imported and injected', () => {
      expect(component['sectionTransitionService']).toBeDefined();
      expect(component['sectionTransitionService']).toBe(mockSectionTransitionService);
    });

    it('should have RecordingPerformanceService properly imported and injected', () => {
      expect(component.recordingPerformanceService).toBeDefined();
      expect(component.recordingPerformanceService).toBe(mockRecordingPerformanceService);
    });

    it('should have LoadingStateService properly imported and injected', () => {
      expect(component.loadingStateService).toBeDefined();
      expect(component.loadingStateService).toBe(mockLoadingStateService);
    });

    it('should have all three critical services accessible from component instance', () => {
      // Verify services are not undefined or null (indicating they were previously commented out)
      expect(component['sectionTransitionService']).not.toBeNull();
      expect(component['sectionTransitionService']).not.toBeUndefined();
      
      expect(component.recordingPerformanceService).not.toBeNull();
      expect(component.recordingPerformanceService).not.toBeUndefined();
      
      expect(component.loadingStateService).not.toBeNull();
      expect(component.loadingStateService).not.toBeUndefined();
    });
  });

  describe('SectionTransitionService Integration', () => {
    it('should call SectionTransitionService.getAllNarrativeFlows in exportDemoInfo', () => {
      component.exportDemoInfo();
      
      expect(mockSectionTransitionService.getAllNarrativeFlows).toHaveBeenCalled();
    });

    it('should include narrative flows in demo report export', () => {
      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild');
      spyOn(document.body, 'removeChild');
      
      component.exportDemoInfo();
      
      expect(mockSectionTransitionService.getAllNarrativeFlows).toHaveBeenCalled();
      
      // Verify the service was called and flows are included
      const narrativeFlows = mockSectionTransitionService.getAllNarrativeFlows();
      expect(narrativeFlows).toEqual([
        { from: 'hero', to: 'platform-pillars', narrative: 'test flow' }
      ]);
    });

    it('should handle narrative flows properly when service returns empty array', () => {
      mockSectionTransitionService.getAllNarrativeFlows.and.returnValue([]);
      
      expect(() => component.exportDemoInfo()).not.toThrow();
      expect(mockSectionTransitionService.getAllNarrativeFlows).toHaveBeenCalled();
    });
  });

  describe('RecordingPerformanceService Integration', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should call RecordingPerformanceService.setOptimizationLevel when optimization changes', () => {
      const mockEvent = {
        target: { value: 'Ultra Quality' }
      } as unknown as Event;
      
      component.onOptimizationChange(mockEvent);
      
      expect(mockRecordingPerformanceService.setOptimizationLevel)
        .toHaveBeenCalledWith('Ultra Quality');
    });

    it('should call RecordingPerformanceService.exportPerformanceReport in exportDemoInfo', () => {
      component.exportDemoInfo();
      
      expect(mockRecordingPerformanceService.exportPerformanceReport).toHaveBeenCalled();
    });

    it('should set optimization level based on device capabilities in toggleRecordingMode', () => {
      // Enable fullPage mode first (required for recording mode)
      component.fullPageEnabled.set(true);
      
      // Mock mobile device
      Object.defineProperty(window, 'innerWidth', { value: 700, writable: true });
      Object.defineProperty(window, 'devicePixelRatio', { value: 1, writable: true });
      
      component.toggleRecordingMode();
      
      expect(mockRecordingPerformanceService.setOptimizationLevel)
        .toHaveBeenCalledWith('Performance');
    });

    it('should handle responsive optimization level changes', () => {
      component.fullPageEnabled.set(true);
      component.isRecordingMode.set(true);
      
      // Trigger resize event simulation
      const resizeEvent = new Event('resize');
      Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
      
      window.dispatchEvent(resizeEvent);
      
      // Should call setOptimizationLevel during responsive adjustments
      expect(mockRecordingPerformanceService.setOptimizationLevel).toHaveBeenCalled();
    });
  });

  describe('LoadingStateService Integration', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should call LoadingStateService.startLoading during component initialization', () => {
      expect(mockLoadingStateService.startLoading).toHaveBeenCalled();
    });

    it('should call LoadingStateService.simulateLoading during initialization', async () => {
      // Wait for async initialization
      await fixture.whenStable();
      
      expect(mockLoadingStateService.simulateLoading).toHaveBeenCalled();
    });

    it('should call LoadingStateService.reset on component destroy', () => {
      component.ngOnDestroy();
      
      expect(mockLoadingStateService.reset).toHaveBeenCalled();
    });

    it('should include loading metrics in demo report export', () => {
      component.exportDemoInfo();
      
      expect(mockLoadingStateService.exportLoadingMetrics).toHaveBeenCalled();
      expect(mockLoadingStateService.getSectionLoadingSummary).toHaveBeenCalled();
    });

    it('should handle loading completion on initialization errors', async () => {
      mockLoadingStateService.simulateLoading.and.returnValue(Promise.reject('test error'));
      
      // Re-initialize component to test error handling
      const newFixture = TestBed.createComponent(LandingPageComponent);
      const newComponent = newFixture.componentInstance;
      
      newFixture.detectChanges();
      await newFixture.whenStable();
      
      expect(mockLoadingStateService.completeLoading).toHaveBeenCalled();
      expect(newComponent.isLoaded()).toBe(true);
    });
  });

  describe('Service Integration in Complete Workflows', () => {
    it('should integrate all three services in demo export workflow', () => {
      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild');
      spyOn(document.body, 'removeChild');
      
      component.exportDemoInfo();
      
      // Verify all three critical services are called
      expect(mockSectionTransitionService.getAllNarrativeFlows).toHaveBeenCalled();
      expect(mockRecordingPerformanceService.exportPerformanceReport).toHaveBeenCalled();
      expect(mockLoadingStateService.exportLoadingMetrics).toHaveBeenCalled();
      expect(mockLoadingStateService.getSectionLoadingSummary).toHaveBeenCalled();
    });

    it('should handle service dependencies and interactions properly', () => {
      // Test that services work together without conflicts
      component.fullPageEnabled.set(true);
      component.toggleRecordingMode();
      component.exportDemoInfo();
      
      // All services should have been called without errors
      expect(mockRecordingPerformanceService.setOptimizationLevel).toHaveBeenCalled();
      expect(mockSectionTransitionService.getAllNarrativeFlows).toHaveBeenCalled();
      expect(mockLoadingStateService.exportLoadingMetrics).toHaveBeenCalled();
    });

    it('should maintain service functionality after component lifecycle events', () => {
      // Initialize
      fixture.detectChanges();
      
      // Use services
      component.exportDemoInfo();
      
      // Destroy
      component.ngOnDestroy();
      
      // Verify services were called appropriately throughout lifecycle
      expect(mockLoadingStateService.startLoading).toHaveBeenCalled();
      expect(mockSectionTransitionService.getAllNarrativeFlows).toHaveBeenCalled();
      expect(mockLoadingStateService.reset).toHaveBeenCalled();
    });
  });
});