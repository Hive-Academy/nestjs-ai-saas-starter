import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { GlassmorphismCardComponent } from './glassmorphism-card.component';

describe('GlassmorphismCardComponent', () => {
  let component: GlassmorphismCardComponent;
  let fixture: ComponentFixture<GlassmorphismCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlassmorphismCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GlassmorphismCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply correct color classes for purple theme', () => {
    fixture.componentRef.setInput('title', 'Test Title');
    fixture.componentRef.setInput('description', 'Test Description');
    fixture.componentRef.setInput('color', 'purple');
    fixture.detectChanges();

    const cardClasses = component.cardClasses();
    expect(cardClasses).toContain('bg-purple-600/30');
    expect(cardClasses).toContain('border-purple-400/30');
  });

  it('should apply correct color classes for cyan theme', () => {
    fixture.componentRef.setInput('title', 'Test Title');
    fixture.componentRef.setInput('description', 'Test Description');
    fixture.componentRef.setInput('color', 'cyan');
    fixture.detectChanges();

    const cardClasses = component.cardClasses();
    expect(cardClasses).toContain('bg-cyan-600/30');
    expect(cardClasses).toContain('border-cyan-400/30');
  });

  it('should render title and description', () => {
    fixture.componentRef.setInput('title', 'Test Title');
    fixture.componentRef.setInput('description', 'Test Description');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h3')?.textContent).toContain('Test Title');
    expect(compiled.querySelector('p')?.textContent).toContain(
      'Test Description'
    );
  });

  it('should render icon when provided', () => {
    fixture.componentRef.setInput('title', 'Test Title');
    fixture.componentRef.setInput('description', 'Test Description');
    fixture.componentRef.setInput('icon', '🔍');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('🔍');
  });

  it('should render metric when provided', () => {
    fixture.componentRef.setInput('title', 'Test Title');
    fixture.componentRef.setInput('description', 'Test Description');
    fixture.componentRef.setInput('metric', {
      label: 'Code Reduction',
      value: '90% Less Code',
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('90% Less Code');
    expect(compiled.textContent).toContain('Code Reduction');
  });

  it('should render features list when provided', () => {
    fixture.componentRef.setInput('title', 'Test Title');
    fixture.componentRef.setInput('description', 'Test Description');
    fixture.componentRef.setInput('features', [
      'Feature 1',
      'Feature 2',
      'Feature 3',
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Feature 1');
    expect(compiled.textContent).toContain('Feature 2');
    expect(compiled.textContent).toContain('Feature 3');
  });

  it('should render status badge when provided', () => {
    fixture.componentRef.setInput('title', 'Test Title');
    fixture.componentRef.setInput('description', 'Test Description');
    fixture.componentRef.setInput('statusBadge', 'Alpha');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Alpha');
  });

  it('should emit cardClick event when clicked', () => {
    fixture.componentRef.setInput('title', 'Test Title');
    fixture.componentRef.setInput('description', 'Test Description');
    fixture.detectChanges();

    let clickEmitted = false;
    component.cardClick.subscribe(() => {
      clickEmitted = true;
    });

    const compiled = fixture.nativeElement as HTMLElement;
    const cardElement = compiled.querySelector('div') as HTMLElement;
    cardElement.click();

    expect(clickEmitted).toBe(true);
  });

  it('should apply correct status badge classes', () => {
    fixture.componentRef.setInput('title', 'Test Title');
    fixture.componentRef.setInput('description', 'Test Description');
    fixture.componentRef.setInput('statusBadge', 'Beta');
    fixture.detectChanges();

    const badgeClasses = component.statusBadgeClasses();
    expect(badgeClasses).toContain('bg-blue-500/20');
    expect(badgeClasses).toContain('text-blue-300');
  });
});
