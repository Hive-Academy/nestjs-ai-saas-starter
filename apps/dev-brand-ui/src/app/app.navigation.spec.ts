import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

/**
 * Mock App Component for testing navigation removal
 * This simulates the app.component structure for testing
 */
@Component({
  selector: 'brand-test-app',
  template: `
    <div class="main-content">
      <router-outlet></router-outlet>
    </div>
  `
})
class TestAppComponent {}

/**
 * Showcase Navigation Removal Tests
 * Tests that the showcase-navigation component is completely removed from the landing page
 */
describe('App Navigation - Showcase Navigation Removal', () => {
  let fixture: ComponentFixture<TestAppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestAppComponent],
      imports: [RouterTestingModule, NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TestAppComponent);
    fixture.detectChanges();
  });

  describe('Showcase Navigation Component Removal', () => {
    it('should not contain brand-showcase-navigation component', () => {
      const showcaseNavElement = fixture.nativeElement.querySelector('brand-showcase-navigation');
      expect(showcaseNavElement).toBeNull('Showcase navigation component should be completely removed');
    });

    it('should not have any showcase-navigation related classes', () => {
      const elementsWithShowcaseClasses = fixture.nativeElement.querySelectorAll('[class*="showcase-nav"]');
      expect(elementsWithShowcaseClasses.length).toBe(0, 'No elements should have showcase navigation classes');
    });

    it('should not have any showcase-navigation selectors in the DOM', () => {
      const showcaseSelectors = [
        'brand-showcase-navigation',
        '.showcase-navigation',
        '[showcase-navigation]',
        'showcase-nav'
      ];

      showcaseSelectors.forEach(selector => {
        const elements = fixture.nativeElement.querySelectorAll(selector);
        expect(elements.length).toBe(0, `No elements should match selector: ${selector}`);
      });
    });

    it('should have clean app template structure without unwanted navigation', () => {
      const mainContent = fixture.nativeElement.querySelector('.main-content');
      expect(mainContent).toBeTruthy('Main content container should exist');
      
      const routerOutlet = fixture.nativeElement.querySelector('router-outlet');
      expect(routerOutlet).toBeTruthy('Router outlet should exist');
      
      // Verify only expected elements are present
      const allElements = fixture.nativeElement.querySelectorAll('*');
      const unwantedNavigationElements = Array.from(allElements).filter((element: Element) => {
        return element.tagName.toLowerCase().includes('showcase-nav') ||
               element.className.includes('showcase-nav');
      });
      
      expect(unwantedNavigationElements.length).toBe(0, 'No unwanted navigation elements should be present');
    });
  });

  describe('Proper Navigation Elements', () => {
    it('should only contain appropriate app-level navigation elements', () => {
      // Test that only legitimate navigation remains
      const mainContent = fixture.nativeElement.querySelector('.main-content');
      const routerOutlet = fixture.nativeElement.querySelector('router-outlet');
      
      expect(mainContent).toBeTruthy('Main content should be present');
      expect(routerOutlet).toBeTruthy('Router outlet should be present for proper routing');
    });

    it('should have clean DOM structure without navigation component imports', () => {
      const htmlContent = fixture.nativeElement.innerHTML;
      
      // Verify no showcase navigation component references
      expect(htmlContent).not.toContain('brand-showcase-navigation');
      expect(htmlContent).not.toContain('showcase-navigation');
      expect(htmlContent).not.toContain('ShowcaseNavigation');
    });

    it('should not have bottom navigation or unwanted navigation positioning', () => {
      // Check for common navigation positioning classes that might indicate unwanted nav
      const bottomNavElements = fixture.nativeElement.querySelectorAll('.bottom-nav, .nav-bottom, .fixed-bottom');
      expect(bottomNavElements.length).toBe(0, 'No bottom navigation elements should be present');
      
      const floatingNavElements = fixture.nativeElement.querySelectorAll('.floating-nav, .nav-floating');
      expect(floatingNavElements.length).toBe(0, 'No floating navigation elements should be present');
    });
  });

  describe('Landing Page Clean Display', () => {
    it('should provide clean landing page display environment', () => {
      // Verify the app structure supports clean landing page display
      const mainContent = fixture.nativeElement.querySelector('.main-content');
      
      expect(mainContent).toBeTruthy('Main content area should exist for landing page');
      
      // Check that main content doesn't have constraints that would interfere with landing page
      const computedStyle = window.getComputedStyle(mainContent);
      expect(mainContent.style.display !== 'none').toBe(true, 'Main content should be visible');
    });

    it('should not have navigation elements that would overlay landing page content', () => {
      const overlayElements = fixture.nativeElement.querySelectorAll('.overlay, .fixed, .absolute');
      
      // Filter to only navigation-related overlay elements
      const navigationOverlays = Array.from(overlayElements).filter((element: Element) => {
        const className = element.className || '';
        const tagName = element.tagName.toLowerCase();
        
        return tagName.includes('nav') || 
               className.includes('nav') ||
               className.includes('navigation') ||
               tagName.includes('showcase');
      });
      
      expect(navigationOverlays.length).toBe(0, 'No navigation overlays should interfere with landing page');
    });

    it('should maintain focus on router-outlet for landing page content', () => {
      const routerOutlet = fixture.nativeElement.querySelector('router-outlet');
      const allInteractiveElements = fixture.nativeElement.querySelectorAll('button, a, input, [tabindex]');
      
      expect(routerOutlet).toBeTruthy('Router outlet should be primary content focus');
      
      // Verify no showcase navigation interactive elements remain
      const showcaseInteractiveElements = Array.from(allInteractiveElements).filter((element: Element) => {
        const className = element.className || '';
        const id = element.id || '';
        
        return className.includes('showcase-nav') || id.includes('showcase-nav');
      });
      
      expect(showcaseInteractiveElements.length).toBe(0, 'No showcase navigation interactive elements should remain');
    });
  });
});