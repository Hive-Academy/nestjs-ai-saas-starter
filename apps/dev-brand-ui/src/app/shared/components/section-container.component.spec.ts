import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionContainerComponent } from './section-container.component';
import { Component } from '@angular/core';

// Mock Scene3DComponent
@Component({
  selector: 'app-scene-3d',
  standalone: true,
  template: '<div>Mock Scene3D</div>',
})
class MockScene3DComponent {}

describe('SectionContainerComponent', () => {
  let component: SectionContainerComponent;
  let fixture: ComponentFixture<SectionContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionContainerComponent],
    })
      .overrideComponent(SectionContainerComponent, {
        remove: {
          imports: [
            // Remove real Scene3DComponent
          ],
        },
        add: {
          imports: [MockScene3DComponent],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SectionContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply gradient background class by default', () => {
    const containerClasses = component.containerClasses();
    expect(containerClasses).toContain('bg-gradient-to-br');
    expect(containerClasses).toContain('from-black');
    expect(containerClasses).toContain('via-sky-900');
    expect(containerClasses).toContain('to-black');
  });

  it('should apply solid background class when specified', () => {
    fixture.componentRef.setInput('background', 'solid');
    fixture.detectChanges();

    const containerClasses = component.containerClasses();
    expect(containerClasses).toContain('bg-gray-900');
  });

  it('should apply dark background class when specified', () => {
    fixture.componentRef.setInput('background', 'dark');
    fixture.detectChanges();

    const containerClasses = component.containerClasses();
    expect(containerClasses).toContain('bg-gray-900/95');
  });

  it('should render title when provided', () => {
    fixture.componentRef.setInput('title', 'Test Section Title');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toContain(
      'Test Section Title'
    );
  });

  it('should render subtitle when provided', () => {
    fixture.componentRef.setInput('title', 'Test Title');
    fixture.componentRef.setInput('subtitle', 'Test subtitle description');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Test subtitle description');
  });

  it('should not render header when title is empty', () => {
    fixture.componentRef.setInput('title', '');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')).toBeNull();
  });

  it('should apply custom min-height when provided', () => {
    fixture.componentRef.setInput('minHeight', '80vh');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const container = compiled.querySelector('.relative') as HTMLElement;
    expect(container.style.minHeight).toBe('80vh');
  });

  it('should project content into ng-content slot', () => {
    // Create a test host component with projected content
    @Component({
      standalone: true,
      imports: [SectionContainerComponent],
      template: `
        <app-section-container>
          <div class="test-content">Projected Content</div>
        </app-section-container>
      `,
    })
    class TestHostComponent {}

    const hostFixture = TestBed.createComponent(TestHostComponent);
    hostFixture.detectChanges();

    const compiled = hostFixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.test-content')?.textContent).toContain(
      'Projected Content'
    );
  });
});
