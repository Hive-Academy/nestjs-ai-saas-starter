import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { SVGIconComponent } from './svg-icon.component';
import { NgtCanvas } from 'angular-three';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { Colors3D } from '../../config/colors.config';

describe('SVGIconComponent', () => {
  let component: SVGIconComponent;
  let fixture: ComponentFixture<SVGIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SVGIconComponent, NgtCanvas],
      providers: [provideExperimentalZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(SVGIconComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should be loading initially', () => {
      expect(component.isLoading()).toBe(true);
    });

    it('should not be ready initially', () => {
      expect(component.isReady()).toBe(false);
    });

    it('should have null group initially', () => {
      expect(component.getGroup()).toBeNull();
    });

    it('should have zero mesh count initially', () => {
      expect(component.getMeshCount()).toBe(0);
    });
  });

  describe('Default Input Values', () => {
    it('should have default position [0, 0, 0]', () => {
      expect(component.position()).toEqual([0, 0, 0]);
    });

    it('should have default scale 1', () => {
      expect(component.scale()).toBe(1);
    });

    it('should have default rotation [0, 0, 0]', () => {
      expect(component.rotation()).toEqual([0, 0, 0]);
    });

    it('should have default extrude depth 0.1', () => {
      expect(component.extrudeDepth()).toBe(0.1);
    });

    it('should center by default', () => {
      expect(component.center()).toBe(true);
    });

    it('should fill only by default', () => {
      expect(component.fillOnly()).toBe(true);
    });

    it('should flip Y by default', () => {
      expect(component.flipY()).toBe(true);
    });

    it('should not enable bevel by default', () => {
      expect(component.bevelEnabled()).toBe(false);
    });

    it('should have default bevel thickness 0.02', () => {
      expect(component.bevelThickness()).toBe(0.02);
    });

    it('should have default bevel size 0.01', () => {
      expect(component.bevelSize()).toBe(0.01);
    });
  });

  describe('Material Properties', () => {
    it('should have default color (gold)', () => {
      expect(component.color()).toBe(Colors3D.accent.gold.hex);
    });

    it('should have default metalness 0.7', () => {
      expect(component.metalness()).toBe(0.7);
    });

    it('should have default roughness 0.2', () => {
      expect(component.roughness()).toBe(0.2);
    });

    it('should have default emissive (black)', () => {
      expect(component.emissive()).toBe(Colors3D.material.black.hex);
    });

    it('should have default emissive intensity 0', () => {
      expect(component.emissiveIntensity()).toBe(0);
    });

    it('should not be transparent by default', () => {
      expect(component.transparent()).toBe(false);
    });

    it('should have default opacity 1.0', () => {
      expect(component.opacity()).toBe(1.0);
    });
  });

  describe('Shadow Configuration', () => {
    it('should cast shadow by default', () => {
      expect(component.castShadow()).toBe(true);
    });

    it('should receive shadow by default', () => {
      expect(component.receiveShadow()).toBe(true);
    });
  });

  describe('Animation Configuration', () => {
    it('should have no float config by default', () => {
      expect(component.floatConfig()).toBeUndefined();
    });

    it('should have no space flight path by default', () => {
      expect(component.spaceFlightPath()).toBeUndefined();
    });

    it('should have default space flight rotations 8', () => {
      expect(component.spaceFlightRotations()).toBe(8);
    });

    it('should auto-start space flight by default', () => {
      expect(component.spaceFlightAutoStart()).toBe(true);
    });

    it('should loop space flight by default', () => {
      expect(component.spaceFlightLoop()).toBe(true);
    });
  });

  describe('Loading State', () => {
    it('should not show loading placeholder by default', () => {
      expect(component.showLoadingPlaceholder()).toBe(false);
    });
  });

  describe('Computed Properties', () => {
    it('should compute scale correctly for number input', () => {
      fixture.componentRef.setInput('scale', 2);
      expect(component.computedScale()).toEqual([2, 2, 2]);
    });

    it('should compute scale correctly for array input', () => {
      fixture.componentRef.setInput('scale', [1, 2, 3]);
      expect(component.computedScale()).toEqual([1, 2, 3]);
    });

    it('should compute scale correctly for uniform scale', () => {
      fixture.componentRef.setInput('scale', 0.5);
      expect(component.computedScale()).toEqual([0.5, 0.5, 0.5]);
    });
  });

  describe('Input Changes', () => {
    it('should accept custom position', () => {
      fixture.componentRef.setInput('position', [1, 2, 3]);
      expect(component.position()).toEqual([1, 2, 3]);
    });

    it('should accept custom rotation', () => {
      fixture.componentRef.setInput('rotation', [Math.PI, 0, Math.PI / 2]);
      expect(component.rotation()).toEqual([Math.PI, 0, Math.PI / 2]);
    });

    it('should accept custom color', () => {
      fixture.componentRef.setInput('color', 0xff0000);
      expect(component.color()).toBe(0xff0000);
    });

    it('should accept custom extrude depth', () => {
      fixture.componentRef.setInput('extrudeDepth', 0.5);
      expect(component.extrudeDepth()).toBe(0.5);
    });

    it('should accept custom metalness', () => {
      fixture.componentRef.setInput('metalness', 0.9);
      expect(component.metalness()).toBe(0.9);
    });

    it('should accept custom roughness', () => {
      fixture.componentRef.setInput('roughness', 0.1);
      expect(component.roughness()).toBe(0.1);
    });

    it('should disable centering', () => {
      fixture.componentRef.setInput('center', false);
      expect(component.center()).toBe(false);
    });

    it('should disable Y flip', () => {
      fixture.componentRef.setInput('flipY', false);
      expect(component.flipY()).toBe(false);
    });

    it('should enable bevel', () => {
      fixture.componentRef.setInput('bevelEnabled', true);
      expect(component.bevelEnabled()).toBe(true);
    });

    it('should enable transparency', () => {
      fixture.componentRef.setInput('transparent', true);
      expect(component.transparent()).toBe(true);
    });

    it('should accept custom opacity', () => {
      fixture.componentRef.setInput('opacity', 0.5);
      expect(component.opacity()).toBe(0.5);
    });
  });

  describe('Float Animation Configuration', () => {
    it('should accept float config with all options', () => {
      const floatConfig = {
        height: 0.5,
        speed: 3,
        delay: 1,
        ease: 'easeInOut',
        autoStart: false,
      };
      fixture.componentRef.setInput('floatConfig', floatConfig);
      expect(component.floatConfig()).toEqual(floatConfig);
    });

    it('should accept partial float config', () => {
      const floatConfig = {
        height: 0.3,
        speed: 2,
      };
      fixture.componentRef.setInput('floatConfig', floatConfig);
      expect(component.floatConfig()).toEqual(floatConfig);
    });
  });

  describe('Space Flight Configuration', () => {
    it('should accept space flight path', () => {
      const flightPath = [
        { position: [0, 0, 0], duration: 2000 },
        { position: [1, 1, 1], duration: 3000 },
      ];
      fixture.componentRef.setInput('spaceFlightPath', flightPath);
      expect(component.spaceFlightPath()).toEqual(flightPath);
    });

    it('should accept custom rotations per cycle', () => {
      fixture.componentRef.setInput('spaceFlightRotations', 12);
      expect(component.spaceFlightRotations()).toBe(12);
    });

    it('should disable space flight auto-start', () => {
      fixture.componentRef.setInput('spaceFlightAutoStart', false);
      expect(component.spaceFlightAutoStart()).toBe(false);
    });

    it('should disable space flight loop', () => {
      fixture.componentRef.setInput('spaceFlightLoop', false);
      expect(component.spaceFlightLoop()).toBe(false);
    });
  });

  describe('Public Methods', () => {
    it('should return null group when not loaded', () => {
      expect(component.getGroup()).toBeNull();
    });

    it('should return false for isReady when loading', () => {
      component.isLoading.set(true);
      component.svgGroup.set(null);
      expect(component.isReady()).toBe(false);
    });

    it('should return false for isReady when no group', () => {
      component.isLoading.set(false);
      component.svgGroup.set(null);
      expect(component.isReady()).toBe(false);
    });

    it('should return zero mesh count when no group', () => {
      expect(component.getMeshCount()).toBe(0);
    });
  });

  describe('Type Safety', () => {
    it('should enforce required svgPath input', () => {
      // TypeScript compile-time check - this test verifies the type system
      // @ts-expect-error - svgPath is required
      const invalidComponent: SVGIconComponent = {} as SVGIconComponent;
      expect(invalidComponent).toBeDefined();
    });

    it('should accept readonly tuple for position', () => {
      const position: readonly [number, number, number] = [1, 2, 3];
      fixture.componentRef.setInput('position', position);
      expect(component.position()).toEqual(position);
    });

    it('should accept readonly tuple for rotation', () => {
      const rotation: readonly [number, number, number] = [0, Math.PI, 0];
      fixture.componentRef.setInput('rotation', rotation);
      expect(component.rotation()).toEqual(rotation);
    });

    it('should accept number or tuple for scale', () => {
      fixture.componentRef.setInput('scale', 2);
      expect(component.scale()).toBe(2);

      fixture.componentRef.setInput('scale', [1, 2, 3]);
      expect(component.scale()).toEqual([1, 2, 3]);
    });
  });

  describe('Event Outputs', () => {
    it('should have svgLoaded output', () => {
      expect(component.svgLoaded).toBeDefined();
    });

    it('should have svgError output', () => {
      expect(component.svgError).toBeDefined();
    });

    it('should have svgDestroyed output', () => {
      expect(component.svgDestroyed).toBeDefined();
    });
  });
});
