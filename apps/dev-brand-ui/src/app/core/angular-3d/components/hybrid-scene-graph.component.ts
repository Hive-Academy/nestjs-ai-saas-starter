/**
 * HybridSceneGraphComponent - Angular Three Scene Graph
 *
 * This component is rendered INSIDE NgtCanvas and has access to the Angular Three store.
 * According to Angular Three docs, this is where we should:
 * - Use injectStore() to access scene, camera, renderer
 * - Set up lights
 * - Configure the scene
 * - Handle all THREE.js operations
 *
 * Reference: https://angularthree.org/core/getting-started/first-scene/
 *
 * The parent HybridSceneComponent passes configuration via inputs,
 * and this component handles the actual THREE.js setup.
 */

import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  inject,
  OnInit,
} from '@angular/core';
import { injectStore } from 'angular-three';
import * as THREE from 'three';
import { AngularThreeService } from '../services/angular-three.service';
import { HybridUIService } from '../services/hybrid-ui.service';
import { SceneConfigService } from '../services/scene-config.service';
import { BackgroundCubeComponent, FloatingSphereComponent } from './primitives';

// Type definitions for sphere/cube data
export interface SphereData {
  id: string;
  position: { x: number; y: number; z: number };
  radius: number;
  color: number;
  metalness?: number;
  roughness?: number;
  emissive?: number;
  emissiveIntensity?: number;
  floatHeight?: number;
  floatSpeed?: number;
  floatDelay?: number;
  autoStart?: boolean;
}

export interface CubeData {
  id: string;
  position: [number, number, number];
  size: number;
  color: number;
  rotation?: [number, number, number];
  opacity?: number;
}

@Component({
  selector: 'app-hybrid-scene-graph',
  standalone: true,
  imports: [FloatingSphereComponent, BackgroundCubeComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- Lights setup using Angular Three primitives -->
    <ngt-ambient-light
      [color]="config().ambientLightColor"
      [intensity]="config().ambientLightIntensity"
    />

    <ngt-directional-light
      [color]="config().directionalLightColor"
      [intensity]="config().directionalLightIntensity"
      [position]="config().directionalLightPosition"
      [castShadow]="config().directionalShadowsEnabled"
    >
      @if (config().directionalShadowsEnabled) {
      <ngt-directional-light-shadow
        [mapSize]="[config().shadowMapSize, config().shadowMapSize]"
        [camera]="{
          near: config().shadowCameraNear,
          far: config().shadowCameraFar,
          left: -config().shadowCameraBounds,
          right: config().shadowCameraBounds,
          top: config().shadowCameraBounds,
          bottom: -config().shadowCameraBounds
        }"
      />
      }
    </ngt-directional-light>

    <ngt-point-light
      [color]="config().pointLightColor"
      [intensity]="config().pointLightIntensity"
      [position]="config().pointLightPosition"
    />

    <!-- Render spheres from data -->
    @for (sphere of config().spheres; track sphere.id) {
    <app-floating-sphere
      [position]="[sphere.position.x, sphere.position.y, sphere.position.z]"
      [radius]="sphere.radius"
      [color]="sphere.color"
      [metalness]="sphere.metalness ?? 0.3"
      [roughness]="sphere.roughness ?? 0.1"
      [emissive]="sphere.emissive ?? sphere.color"
      [emissiveIntensity]="sphere.emissiveIntensity ?? 0.2"
      [floatConfig]="{
        height: sphere.floatHeight ?? 0.3,
        speed: sphere.floatSpeed ?? 1500,
        delay: sphere.floatDelay ?? 0,
        autoStart: sphere.autoStart ?? true
      }"
      [performanceConfig]="true"
    />
    }

    <!-- Render cubes from data -->
    @for (cube of config().cubes; track cube.id) {
    <app-background-cube
      [position]="cube.position"
      [size]="cube.size"
      [color]="cube.color"
      [rotation]="cube.rotation ?? [0, 0, 0]"
      [transparent]="true"
      [opacity]="cube.opacity ?? 0.6"
      [performanceConfig]="true"
    />
    }
  `,
})
export class HybridSceneGraphComponent implements OnInit {
  // Angular Three store - THIS IS THE KEY! Only works inside NgtCanvas
  private readonly store = injectStore();
  private readonly angularThreeService = inject(AngularThreeService);
  private readonly sceneConfigService = inject(SceneConfigService);
  private readonly hybridUIService = inject(HybridUIService);

  // Configuration from service (set by HybridSceneComponent)
  readonly config = this.sceneConfigService.config;

  constructor() {
    // Set up reactive effects for camera and scene updates
    this.setupReactiveEffects();
  }

  ngOnInit(): void {
    console.log('[HybridSceneGraph] Initializing inside NgtCanvas');

    // Access the store - this ONLY works inside NgtCanvas!
    const scene = this.store.get('scene');
    const camera = this.store.get('camera');
    const gl = this.store.get('gl');

    console.log('[HybridSceneGraph] Store access - scene:', !!scene);
    console.log('[HybridSceneGraph] Store access - camera:', !!camera);
    console.log('[HybridSceneGraph] Store access - renderer:', !!gl);

    if (scene && camera && gl) {
      // Configure renderer
      this.angularThreeService.configureRenderer(gl);

      // Set scene background
      const bgColor = this.config().backgroundColor;
      if (bgColor !== 'transparent') {
        scene.background = new THREE.Color(bgColor);
      }

      // Position camera
      const [x, y, z] = this.config().cameraPosition;
      camera.position.set(x, y, z);

      // Point camera at target
      const [tx, ty, tz] = this.config().cameraTarget;
      camera.lookAt(new THREE.Vector3(tx, ty, tz));

      console.log('[HybridSceneGraph] Scene initialized successfully');

      // Pass scene references to HybridUIService
      console.log(
        '[HybridSceneGraph] Setting scene references in HybridUIService'
      );
      this.hybridUIService.setSceneReferences(scene, camera, gl);
    } else {
      console.error('[HybridSceneGraph] Failed to access store properties:', {
        scene: !!scene,
        camera: !!camera,
        gl: !!gl,
      });
    }
  }

  /**
   * Set up reactive effects for dynamic updates
   */
  private setupReactiveEffects(): void {
    // React to camera position changes
    effect(() => {
      const camera = this.store.get('camera');
      if (camera) {
        const [x, y, z] = this.config().cameraPosition;
        camera.position.set(x, y, z);
      }
    });

    // React to camera target changes
    effect(() => {
      const camera = this.store.get('camera');
      if (camera) {
        const [tx, ty, tz] = this.config().cameraTarget;
        camera.lookAt(new THREE.Vector3(tx, ty, tz));
      }
    });

    // React to background color changes
    effect(() => {
      const scene = this.store.get('scene');
      const bgColor = this.config().backgroundColor;
      if (scene && bgColor !== 'transparent') {
        scene.background = new THREE.Color(bgColor);
      }
    });
  }

  /**
   * Public API: Get scene (can be called from parent via ViewChild)
   */
  getScene(): THREE.Scene | null {
    return this.store.get('scene') || null;
  }

  /**
   * Public API: Get camera (can be called from parent via ViewChild)
   */
  getCamera(): THREE.Camera | null {
    return this.store.get('camera') || null;
  }

  /**
   * Public API: Get renderer (can be called from parent via ViewChild)
   */
  getRenderer(): THREE.WebGLRenderer | null {
    return this.store.get('gl') || null;
  }
}
