import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductionSystemsSectionComponent } from './production-systems-section.component';

describe('ProductionSystemsSectionComponent', () => {
  let component: ProductionSystemsSectionComponent;
  let fixture: ComponentFixture<ProductionSystemsSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductionSystemsSectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductionSystemsSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have four module cards', () => {
    expect(component.modules).toHaveLength(4);
  });

  it('should have checkpoint module with orange accent', () => {
    const checkpointModule = component.modules.find(
      (m) => m.title === 'checkpoint'
    );
    expect(checkpointModule).toBeDefined();
    expect(checkpointModule?.accentColor).toBe('orange');
    expect(checkpointModule?.particleColor).toBe(0xf97316);
  });

  it('should have monitoring module with red accent', () => {
    const monitoringModule = component.modules.find(
      (m) => m.title === 'monitoring'
    );
    expect(monitoringModule).toBeDefined();
    expect(monitoringModule?.accentColor).toBe('red');
    expect(monitoringModule?.particleColor).toBe(0xef4444);
  });

  it('should have time-travel module with cyan accent', () => {
    const timeTravelModule = component.modules.find(
      (m) => m.title === 'time-travel'
    );
    expect(timeTravelModule).toBeDefined();
    expect(timeTravelModule?.accentColor).toBe('cyan');
    expect(timeTravelModule?.particleColor).toBe(0x06b6d4);
  });

  it('should have platform module with pink accent', () => {
    const platformModule = component.modules.find(
      (m) => m.title === 'platform'
    );
    expect(platformModule).toBeDefined();
    expect(platformModule?.accentColor).toBe('pink');
    expect(platformModule?.particleColor).toBe(0xec4899);
  });

  it('should have accurate module descriptions', () => {
    const checkpointModule = component.modules.find(
      (m) => m.title === 'checkpoint'
    );
    expect(checkpointModule?.description).toContain('Checkpoint Management');
    expect(checkpointModule?.description).toContain(
      'Multi-backend state persistence'
    );

    const monitoringModule = component.modules.find(
      (m) => m.title === 'monitoring'
    );
    expect(monitoringModule?.description).toContain('Production Observability');
    expect(monitoringModule?.description).toContain('Facade pattern');

    const timeTravelModule = component.modules.find(
      (m) => m.title === 'time-travel'
    );
    expect(timeTravelModule?.description).toContain(
      'Workflow Debugging and Replay'
    );
    expect(timeTravelModule?.description).toContain('BranchManager');

    const platformModule = component.modules.find(
      (m) => m.title === 'platform'
    );
    expect(platformModule?.description).toContain(
      'LangGraph Platform Integration'
    );
    expect(platformModule?.description).toContain('HTTP client');
  });

  it('should have five features per module', () => {
    component.modules.forEach((module) => {
      expect(module.features).toHaveLength(5);
    });
  });

  it('should render section header', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const header = compiled.querySelector('h2');
    expect(header?.textContent).toContain('Production Systems');
  });

  it('should render four module cards in grid', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.module-card');
    expect(cards.length).toBe(4);
  });

  it('should have canvas elements for particle systems', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const canvases = compiled.querySelectorAll('canvas[data-module]');
    expect(canvases.length).toBe(4);
  });

  it('should use four-column grid layout', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const grid = compiled.querySelector('.grid');
    expect(grid?.classList.contains('lg:grid-cols-4')).toBe(true);
  });

  it('should cleanup on destroy', () => {
    spyOn<any>(component, 'cleanup');
    component.ngOnDestroy();
    expect((component as any).cleanup).toHaveBeenCalled();
  });
});
