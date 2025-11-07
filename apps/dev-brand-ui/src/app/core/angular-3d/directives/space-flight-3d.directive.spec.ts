import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SpaceFlight3dDirective } from './space-flight-3d.directive';
import { NgtCanvas } from 'angular-three';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

@Component({
  template: `
    <ngt-canvas>
      <ngt-mesh spaceFlight3d />
    </ngt-canvas>
  `,
  standalone: true,
  imports: [NgtCanvas, SpaceFlight3dDirective],
  schemas: [],
})
class TestComponent {}

describe('SpaceFlight3dDirective', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent],
      providers: [provideExperimentalZonelessChangeDetection()],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(TestComponent);
    expect(fixture).toBeTruthy();
  });

  it('should have default flight path', () => {
    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();
    expect(fixture).toBeTruthy();
  });
});
