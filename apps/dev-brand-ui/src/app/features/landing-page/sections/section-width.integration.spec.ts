import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Component, signal } from '@angular/core';
import { PlatformPillarsComponent } from './platform-pillars.component';
import { DemoTheaterComponent } from './demo-theater.component';
import { ThreeIntegrationService } from '../../../core/services/three-integration.service';

/**
 * Mock components for testing section width consistency
 */
@Component({
  selector: 'brand-mock-hero-section',
  template: `
    <div
      class="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900"
    >
      <h1 class="text-4xl font-bold text-white">Hero Section (Reference)</h1>
    </div>
  `,
})
class MockHeroSectionComponent {}

/**
 * Section Width Integration Tests
 * Tests that section components have proper full-screen width styling
 */
describe('Section Components - Width Integration Tests', () => {
  let mockThreeService: jasmine.SpyObj<ThreeIntegrationService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
    }).compileComponents();

    mockThreeService = {
      createScene: jest.fn().mockReturnValue({
        scene: {} as any,
        camera: { position: { set: jest.fn(), lookAt: jest.fn() } } as any,
        renderer: {} as any,
      }),
      activateScene: jest.fn(),
      removeScene: jest.fn(),
    } as any;
  });

  describe('PlatformPillarsComponent Width Styling', () => {
    let component: PlatformPillarsComponent;
    let fixture: ComponentFixture<PlatformPillarsComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [PlatformPillarsComponent, NoopAnimationsModule],
        providers: [
          { provide: ThreeIntegrationService, useValue: mockThreeService },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(PlatformPillarsComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should have full screen width class on root container', () => {
      const rootElement =
        fixture.nativeElement.querySelector('.w-full.h-screen');
      expect(rootElement).toBeTruthy(
        'Platform pillars should have w-full h-screen classes'
      );
    });

    it('should not have width constraints that prevent full-screen display', () => {
      const rootElement = fixture.nativeElement;

      // Check for constraining classes
      const hasConstrainingClass =
        rootElement.classList.contains('max-w-') ||
        rootElement.classList.contains('container') ||
        rootElement.querySelector('.container, [class*="max-w-"]');

      expect(hasConstrainingClass).toBeFalsy(
        'Platform pillars should not have width constraints'
      );
    });

    it('should have proper flex layout for full width utilization', () => {
      const rootElement =
        fixture.nativeElement.querySelector('.w-full.h-screen');
      expect(rootElement.classList.contains('flex')).toBe(
        true,
        'Should use flex layout'
      );
      expect(rootElement.classList.contains('flex-col')).toBe(
        true,
        'Should use column flex direction'
      );
    });

    it('should have content areas that utilize full available width', () => {
      const contentGrid = fixture.nativeElement.querySelector('.grid');
      expect(contentGrid).toBeTruthy('Should have grid layout for content');

      const maxWidthContainer =
        fixture.nativeElement.querySelector('.max-w-6xl.mx-auto');
      expect(maxWidthContainer).toBeTruthy(
        'Content should be centered with max-width for readability'
      );
    });

    it('should match hero section width behavior pattern', () => {
      const rootElement = fixture.nativeElement.querySelector('div');

      // Should have similar root classes to hero section
      expect(rootElement.classList.contains('w-full')).toBe(true);
      expect(rootElement.classList.contains('h-screen')).toBe(true);
      expect(rootElement.classList.contains('relative')).toBe(true);
    });
  });

  describe('DemoTheaterComponent Width Styling', () => {
    let component: DemoTheaterComponent;
    let fixture: ComponentFixture<DemoTheaterComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [DemoTheaterComponent, NoopAnimationsModule],
      }).compileComponents();

      fixture = TestBed.createComponent(DemoTheaterComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should have full screen width class on root container', () => {
      const rootElement =
        fixture.nativeElement.querySelector('.w-full.h-screen');
      expect(rootElement).toBeTruthy(
        'Demo theater should have w-full h-screen classes'
      );
    });

    it('should not have width constraints that prevent full-screen display', () => {
      const rootElement = fixture.nativeElement;

      // The main theater stage should use proper width classes
      const theaterStage = rootElement.querySelector('[class*="mx-8"]');
      expect(theaterStage).toBeTruthy(
        'Theater stage should have horizontal margins but full available width'
      );
    });

    it('should have proper flex layout structure for full width', () => {
      const rootElement =
        fixture.nativeElement.querySelector('.w-full.h-screen');
      expect(rootElement.classList.contains('flex')).toBe(
        true,
        'Should use flex layout'
      );
      expect(rootElement.classList.contains('flex-col')).toBe(
        true,
        'Should use column layout'
      );
    });

    it('should have theater stage that utilizes full screen width appropriately', () => {
      const theaterStage = fixture.nativeElement.querySelector('.flex-1');
      expect(theaterStage).toBeTruthy(
        'Theater stage should use flex-1 to fill available space'
      );

      // Should have horizontal margins but full width within those constraints
      const hasHorizontalMargins = theaterStage.classList.contains('mx-8');
      expect(hasHorizontalMargins).toBe(
        true,
        'Theater stage should have consistent horizontal margins'
      );
    });

    it('should match hero section width behavior pattern', () => {
      const rootElement = fixture.nativeElement.querySelector('div');

      // Should have similar root classes to hero section
      expect(rootElement.classList.contains('w-full')).toBe(true);
      expect(rootElement.classList.contains('h-screen')).toBe(true);
      expect(rootElement.classList.contains('text-white')).toBe(true);
    });

    it('should have demo grid that uses full available width', () => {
      const demoGrid = fixture.nativeElement.querySelector('.grid');
      expect(demoGrid).toBeTruthy('Should have demo grid');

      // Grid should span full width with proper responsive classes
      expect(demoGrid.classList.contains('grid-cols-1')).toBe(true);
      expect(demoGrid.classList.contains('md:grid-cols-2')).toBe(true);
      expect(demoGrid.classList.contains('lg:grid-cols-3')).toBe(true);
    });
  });

  describe('Cross-Section Width Consistency', () => {
    it('should have consistent width classes across section components', async () => {
      // Test Platform Pillars
      const pillarsFixture = TestBed.createComponent(PlatformPillarsComponent);
      pillarsFixture.detectChanges();

      // Test Demo Theater
      const theaterFixture = TestBed.createComponent(DemoTheaterComponent);
      theaterFixture.detectChanges();

      // Both should have w-full h-screen on root elements
      const pillarsRoot = pillarsFixture.nativeElement.querySelector('div');
      const theaterRoot = theaterFixture.nativeElement.querySelector('div');

      expect(pillarsRoot.classList.contains('w-full')).toBe(true);
      expect(pillarsRoot.classList.contains('h-screen')).toBe(true);

      expect(theaterRoot.classList.contains('w-full')).toBe(true);
      expect(theaterRoot.classList.contains('h-screen')).toBe(true);
    });

    it('should not have conflicting width styles across sections', async () => {
      const pillarsFixture = TestBed.createComponent(PlatformPillarsComponent);
      const theaterFixture = TestBed.createComponent(DemoTheaterComponent);

      pillarsFixture.detectChanges();
      theaterFixture.detectChanges();

      // Check that neither has conflicting width constraints
      const pillarsConstraints = pillarsFixture.nativeElement.querySelectorAll(
        '[class*="max-w-"], .container'
      );
      const theaterConstraints = theaterFixture.nativeElement.querySelectorAll(
        '[class*="max-w-"], .container'
      );

      // Content max-width is OK for readability, but root containers should not be constrained
      const pillarsRoot = pillarsFixture.nativeElement.querySelector('div');
      const theaterRoot = theaterFixture.nativeElement.querySelector('div');

      expect(pillarsRoot.classList.contains('max-w-')).toBe(false);
      expect(pillarsRoot.classList.contains('container')).toBe(false);

      expect(theaterRoot.classList.contains('max-w-')).toBe(false);
      expect(theaterRoot.classList.contains('container')).toBe(false);
    });

    it('should render sections with visually consistent full-width appearance', () => {
      // This test would ideally use visual testing, but we can test structural consistency
      const heroMockFixture = TestBed.createComponent(MockHeroSectionComponent);
      const pillarsFixture = TestBed.createComponent(PlatformPillarsComponent);
      const theaterFixture = TestBed.createComponent(DemoTheaterComponent);

      heroMockFixture.detectChanges();
      pillarsFixture.detectChanges();
      theaterFixture.detectChanges();

      // All should have similar root structure
      const heroRoot = heroMockFixture.nativeElement.querySelector('div');
      const pillarsRoot = pillarsFixture.nativeElement.querySelector('div');
      const theaterRoot = theaterFixture.nativeElement.querySelector('div');

      // All should have w-full class
      expect(heroRoot.classList.contains('w-full')).toBe(
        true,
        'Hero should have w-full'
      );
      expect(pillarsRoot.classList.contains('w-full')).toBe(
        true,
        'Pillars should have w-full'
      );
      expect(theaterRoot.classList.contains('w-full')).toBe(
        true,
        'Theater should have w-full'
      );

      // All should have h-screen or h-full for consistent height
      const heroHasFullHeight =
        heroRoot.classList.contains('h-full') ||
        heroRoot.classList.contains('h-screen');
      const pillarsHasFullHeight =
        pillarsRoot.classList.contains('h-full') ||
        pillarsRoot.classList.contains('h-screen');
      const theaterHasFullHeight =
        theaterRoot.classList.contains('h-full') ||
        theaterRoot.classList.contains('h-screen');

      expect(heroHasFullHeight).toBe(true, 'Hero should have full height');
      expect(pillarsHasFullHeight).toBe(
        true,
        'Pillars should have full height'
      );
      expect(theaterHasFullHeight).toBe(
        true,
        'Theater should have full height'
      );
    });
  });
});
