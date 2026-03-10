import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, input } from '@angular/core';
import { By } from '@angular/platform-browser';

import { LgDynamicComponent } from './lg-dynamic.component';
import type { GeneratedComponent } from './gen-ui.models';

@Component({
  selector: 'lib-test-greeting',
  standalone: true,
  template: '<span class="greeting">Hello, {{ name() }}</span>',
})
class GreetingComponent {
  readonly name = input<string>('World');
}

/**
 * Wrapper component to provide the required input to LgDynamicComponent
 * since it uses `input.required`.
 */
@Component({
  selector: 'lib-test-host',
  standalone: true,
  imports: [LgDynamicComponent],
  template: '<lib-lg-dynamic [components]="items" />',
})
class TestHostComponent {
  items: GeneratedComponent[] = [];
}

describe('LgDynamicComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, LgDynamicComponent, GreetingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
  });

  it('should create the component', () => {
    fixture.detectChanges();

    const lgDynamic = fixture.debugElement.query(
      By.directive(LgDynamicComponent)
    );
    expect(lgDynamic).toBeTruthy();
  });

  it('should render nothing when components array is empty', () => {
    host.items = [];
    fixture.detectChanges();

    const greetings = fixture.debugElement.queryAll(By.css('.greeting'));
    expect(greetings.length).toBe(0);
  });

  it('should render components via NgComponentOutlet', () => {
    host.items = [
      {
        id: 'g1',
        component: GreetingComponent,
        inputs: { name: 'Angular' },
      },
    ];
    fixture.detectChanges();

    const greeting = fixture.debugElement.query(By.css('.greeting'));
    expect(greeting).toBeTruthy();
    expect(greeting.nativeElement.textContent).toContain('Angular');
  });

  it('should render multiple components', () => {
    host.items = [
      {
        id: 'g1',
        component: GreetingComponent,
        inputs: { name: 'First' },
      },
      {
        id: 'g2',
        component: GreetingComponent,
        inputs: { name: 'Second' },
      },
    ];
    fixture.detectChanges();

    const greetings = fixture.debugElement.queryAll(By.css('.greeting'));
    expect(greetings.length).toBe(2);
  });
});
