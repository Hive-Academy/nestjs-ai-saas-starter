/**
 * FogComponent - Declarative Scene Fog Primitive
 *
 * Manages THREE.Scene.fog reactively based on input configuration.
 * Supports both linear fog (near/far) and exponential fog (density).
 *
 * Pattern verified from:
 * - injectStore: mouse-parallax-3d.directive.ts:28
 * - effect pattern: Angular signals API
 * - cleanup: ngOnDestroy lifecycle
 *
 * Usage:
 * ```html
 * <app-fog
 *   [fogType]="'exponential'"
 *   [color]="0xcccccc"
 *   [density]="0.008"
 * />
 *
 * <app-fog
 *   [fogType]="'linear'"
 *   [color]="0x87ceeb"
 *   [near]="10"
 *   [far]="100"
 * />
 * ```
 */

import { Component, OnDestroy, effect, input } from '@angular/core';
import { injectStore } from 'angular-three'; // Verified: mouse-parallax-3d.directive.ts:20
import * as THREE from 'three';

@Component({
  selector: 'app-fog',
  standalone: true,
  template: '', // No visual template - manages scene.fog programmatically
})
export class FogComponent implements OnDestroy {
  // Inject Angular-Three store for scene access
  private readonly store = injectStore(); // Pattern: mouse-parallax-3d.directive.ts:28

  // Fog configuration inputs (signal-based)
  readonly fogType = input<'linear' | 'exponential'>('exponential');
  readonly color = input<number>(0xcccccc);

  // Linear fog parameters (THREE.Fog)
  readonly near = input<number>(10);
  readonly far = input<number>(100);

  // Exponential fog parameters (THREE.FogExp2)
  readonly density = input<number>(0.008);

  constructor() {
    // Reactive fog management using effect
    // Updates scene.fog whenever inputs change
    effect(() => {
      const scene = this.store.get('scene');
      if (!scene) {
        console.warn('[Fog] Scene not available');
        return;
      }

      const type = this.fogType();
      const color = this.color();

      if (type === 'linear') {
        const near = this.near();
        const far = this.far();
        scene.fog = new THREE.Fog(color, near, far);
        console.log(
          `[Fog] Linear fog applied: color=${color.toString(
            16
          )}, near=${near}, far=${far}`
        );
      } else {
        const density = this.density();
        scene.fog = new THREE.FogExp2(color, density);
        console.log(
          `[Fog] Exponential fog applied: color=${color.toString(
            16
          )}, density=${density}`
        );
      }
    });
  }

  /**
   * Cleanup: Remove fog from scene on component destroy
   */
  ngOnDestroy(): void {
    const scene = this.store.get('scene');
    if (scene) {
      scene.fog = null;
      console.log('[Fog] Fog removed from scene');
    }
  }
}
