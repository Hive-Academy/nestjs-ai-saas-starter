import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { InstancedParticleTextComponent } from './instanced-particle-text.component';

describe('InstancedParticleTextComponent', () => {
  let component: InstancedParticleTextComponent;
  let fixture: ComponentFixture<InstancedParticleTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstancedParticleTextComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InstancedParticleTextComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('text', 'TEST');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept text input', () => {
    expect(component.text()).toBe('TEST');
  });

  it('should have default values', () => {
    expect(component.fontSize()).toBe(60);
    expect(component.opacity()).toBe(0.3);
    expect(component.fontScaleFactor()).toBe(0.08);
  });

  it('should cleanup resources on destroy', () => {
    const ngOnDestroySpy = jest.spyOn(component, 'ngOnDestroy');
    component.ngOnDestroy();
    expect(ngOnDestroySpy).toHaveBeenCalled();
  });
});
