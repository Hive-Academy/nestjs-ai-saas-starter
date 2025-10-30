import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { GLTFModelComponent } from './gltf-model.component';
import { NgtCanvas } from 'angular-three';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('GLTFModelComponent', () => {
  let component: GLTFModelComponent;
  let fixture: ComponentFixture<GLTFModelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GLTFModelComponent, NgtCanvas],
      providers: [provideExperimentalZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(GLTFModelComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default position [0, 0, 0]', () => {
    expect(component.position()).toEqual([0, 0, 0]);
  });

  it('should have default scale 1', () => {
    expect(component.scale()).toBe(1);
  });

  it('should compute scale correctly for number input', () => {
    fixture.componentRef.setInput('scale', 2);
    expect(component.computedScale()).toEqual([2, 2, 2]);
  });

  it('should compute scale correctly for array input', () => {
    fixture.componentRef.setInput('scale', [1, 2, 3]);
    expect(component.computedScale()).toEqual([1, 2, 3]);
  });

  it('should have castShadow enabled by default', () => {
    expect(component.castShadow()).toBe(true);
  });

  it('should have receiveShadow enabled by default', () => {
    expect(component.receiveShadow()).toBe(true);
  });

  it('should not show loading placeholder by default', () => {
    expect(component.showLoadingPlaceholder()).toBe(false);
  });

  it('should not auto-center by default', () => {
    expect(component.autoCenter()).toBe(false);
  });

  it('should return null scene when not loaded', () => {
    expect(component.getScene()).toBeNull();
  });

  it('should not be ready initially', () => {
    expect(component.isReady()).toBe(false);
  });
});
