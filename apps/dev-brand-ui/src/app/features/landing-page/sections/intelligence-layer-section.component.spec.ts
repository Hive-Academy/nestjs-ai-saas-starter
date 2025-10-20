import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { IntelligenceLayerSectionComponent } from './intelligence-layer-section.component';

describe('IntelligenceLayerSectionComponent', () => {
  let component: IntelligenceLayerSectionComponent;
  let fixture: ComponentFixture<IntelligenceLayerSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntelligenceLayerSectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IntelligenceLayerSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have three module cards', () => {
    expect(component.modules).toHaveLength(3);
  });

  it('should have memory module with purple accent', () => {
    const memoryModule = component.modules.find((m) => m.title === 'memory');
    expect(memoryModule).toBeDefined();
    expect(memoryModule?.accentColor).toBe('purple');
    expect(memoryModule?.particleColor).toBe(0x9333ea);
  });

  it('should have multi-agent module with blue accent', () => {
    const multiAgentModule = component.modules.find(
      (m) => m.title === 'multi-agent'
    );
    expect(multiAgentModule).toBeDefined();
    expect(multiAgentModule?.accentColor).toBe('blue');
    expect(multiAgentModule?.particleColor).toBe(0x3b82f6);
  });

  it('should have hitl module with green accent', () => {
    const hitlModule = component.modules.find((m) => m.title === 'hitl');
    expect(hitlModule).toBeDefined();
    expect(hitlModule?.accentColor).toBe('green');
    expect(hitlModule?.particleColor).toBe(0x10b981);
  });

  it('should have accurate module descriptions', () => {
    const memoryModule = component.modules.find((m) => m.title === 'memory');
    expect(memoryModule?.description).toContain('Agent Memory Management');
    expect(memoryModule?.description).toContain('semantic search');

    const multiAgentModule = component.modules.find(
      (m) => m.title === 'multi-agent'
    );
    expect(multiAgentModule?.description).toContain(
      'Multi-Agent Network Orchestration'
    );
    expect(multiAgentModule?.description).toContain('network topology');

    const hitlModule = component.modules.find((m) => m.title === 'hitl');
    expect(hitlModule?.description).toContain('Human-in-the-Loop Integration');
    expect(hitlModule?.description).toContain('approval workflows');
  });

  it('should have five features per module', () => {
    component.modules.forEach((module) => {
      expect(module.features).toHaveLength(5);
    });
  });

  it('should render section header', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const header = compiled.querySelector('h2');
    expect(header?.textContent).toContain('Intelligence Layer');
  });

  it('should render three module cards in grid', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.module-card');
    expect(cards.length).toBe(3);
  });

  it('should have canvas elements for particle systems', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const canvases = compiled.querySelectorAll('canvas[data-module]');
    expect(canvases.length).toBe(3);
  });

  it('should cleanup on destroy', () => {
    spyOn<any>(component, 'cleanup');
    component.ngOnDestroy();
    expect((component as any).cleanup).toHaveBeenCalled();
  });
});
