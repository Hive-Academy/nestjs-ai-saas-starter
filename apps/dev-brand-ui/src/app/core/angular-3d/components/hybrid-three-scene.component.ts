import { Component, OnInit, input, effect } from '@angular/core';
import { injectStore } from 'angular-three';
import * as THREE from 'three';

/**
 * Phase 2 Implementation: Hybrid Declarative/Programmatic approach
 * This represents the 3D scene content that will be rendered inside NgtCanvas
 *
 * Migrated to Angular best practices with signals-based configuration
 * while maintaining compatibility with current Angular Three patterns
 */
@Component({
  selector: 'app-hybrid-three-scene',
  standalone: true,
  template: `
    <!-- Phase 2: Signal-based reactive scene configuration -->
    <!-- Content projection for declarative 3D objects -->
    <ng-content></ng-content>
  `,
})
export class HybridThreeSceneComponent implements OnInit {
  private readonly store = injectStore();

  // Input signals for lighting configuration following Angular best practices
  readonly backgroundColor = input<string>('#f0f0f0');

  // Ambient light configuration signals
  readonly ambientLightColor = input<number>(0xffffff);
  readonly ambientLightIntensity = input<number>(0.4);

  // Directional light configuration signals
  readonly directionalLightColor = input<number>(0xffffff);
  readonly directionalLightIntensity = input<number>(0.8);
  readonly directionalShadowsEnabled = input<boolean>(true);

  // Point light configuration signals
  readonly pointLightColor = input<number>(0xffffff);
  readonly pointLightIntensity = input<number>(0.3);

  // Shadow configuration signals
  readonly shadowMapSize = input<number>(2048);
  readonly shadowCameraNear = input<number>(0.1);
  readonly shadowCameraFar = input<number>(50);
  readonly shadowCameraBounds = input<number>(10);

  // Light position configuration signals
  readonly directionalLightPosition = input<[number, number, number]>([5, 5, 5]);
  readonly pointLightPosition = input<[number, number, number]>([-5, 5, 5]);

  // Light references for reactive updates
  private ambientLight: THREE.AmbientLight | null = null;
  private directionalLight: THREE.DirectionalLight | null = null;
  private pointLight: THREE.PointLight | null = null;

  constructor() {
    // Reactive effects for dynamic light configuration updates
    effect(() => {
      this.updateAmbientLight();
    });

    effect(() => {
      this.updateDirectionalLight();
    });

    effect(() => {
      this.updatePointLight();
    });

    effect(() => {
      this.updateSceneBackground();
    });
  }

  ngOnInit(): void {
    // Wait for Angular Three store to be ready, then setup scene
    setTimeout(() => this.setupScene(), 100);
  }

  /**
   * Set up the complete 3D scene with lights
   * Phase 2: Enhanced with signals-based configuration
   */
  private setupScene(): void {
    const scene = this.store.get('scene') as THREE.Scene;

    if (scene) {
      // Set background color
      this.updateSceneBackground();

      // Create and configure ambient light
      this.createAmbientLight(scene);

      // Create and configure directional light with shadows
      this.createDirectionalLight(scene);

      // Create and configure point light
      this.createPointLight(scene);

      console.log('Phase 2 Hybrid Three Scene initialized with reactive lighting');
    }
  }

  /**
   * Create ambient light with signal-based configuration
   */
  private createAmbientLight(scene: THREE.Scene): void {
    this.ambientLight = new THREE.AmbientLight(
      this.ambientLightColor(),
      this.ambientLightIntensity()
    );
    scene.add(this.ambientLight);
  }

  /**
   * Create directional light with signal-based configuration
   */
  private createDirectionalLight(scene: THREE.Scene): void {
    this.directionalLight = new THREE.DirectionalLight(
      this.directionalLightColor(),
      this.directionalLightIntensity()
    );

    // Set position from signal
    const [x, y, z] = this.directionalLightPosition();
    this.directionalLight.position.set(x, y, z);

    // Configure shadows if enabled
    if (this.directionalShadowsEnabled()) {
      this.directionalLight.castShadow = true;
      this.setupDirectionalLightShadows();
    }

    scene.add(this.directionalLight);
  }

  /**
   * Set up directional light shadow configuration with signals
   */
  private setupDirectionalLightShadows(): void {
    if (!this.directionalLight) return;

    const shadowCamera = this.directionalLight.shadow.camera as THREE.OrthographicCamera;
    const bounds = this.shadowCameraBounds();

    shadowCamera.near = this.shadowCameraNear();
    shadowCamera.far = this.shadowCameraFar();
    shadowCamera.left = -bounds;
    shadowCamera.right = bounds;
    shadowCamera.top = bounds;
    shadowCamera.bottom = -bounds;

    const mapSize = this.shadowMapSize();
    this.directionalLight.shadow.mapSize.setScalar(mapSize);
  }

  /**
   * Create point light with signal-based configuration
   */
  private createPointLight(scene: THREE.Scene): void {
    this.pointLight = new THREE.PointLight(
      this.pointLightColor(),
      this.pointLightIntensity()
    );

    // Set position from signal
    const [x, y, z] = this.pointLightPosition();
    this.pointLight.position.set(x, y, z);

    scene.add(this.pointLight);
  }

  /**
   * Reactive effect: Update ambient light configuration
   */
  private updateAmbientLight(): void {
    if (this.ambientLight) {
      this.ambientLight.color.setHex(this.ambientLightColor());
      this.ambientLight.intensity = this.ambientLightIntensity();
    }
  }

  /**
   * Reactive effect: Update directional light configuration
   */
  private updateDirectionalLight(): void {
    if (this.directionalLight) {
      this.directionalLight.color.setHex(this.directionalLightColor());
      this.directionalLight.intensity = this.directionalLightIntensity();

      const [x, y, z] = this.directionalLightPosition();
      this.directionalLight.position.set(x, y, z);

      // Update shadow settings
      if (this.directionalShadowsEnabled()) {
        this.directionalLight.castShadow = true;
        this.setupDirectionalLightShadows();
      } else {
        this.directionalLight.castShadow = false;
      }
    }
  }

  /**
   * Reactive effect: Update point light configuration
   */
  private updatePointLight(): void {
    if (this.pointLight) {
      this.pointLight.color.setHex(this.pointLightColor());
      this.pointLight.intensity = this.pointLightIntensity();

      const [x, y, z] = this.pointLightPosition();
      this.pointLight.position.set(x, y, z);
    }
  }

  /**
   * Reactive effect: Update scene background
   */
  private updateSceneBackground(): void {
    const scene = this.store.get('scene') as THREE.Scene;
    if (scene) {
      scene.background = new THREE.Color(this.backgroundColor());
    }
  }
}
