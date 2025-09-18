import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  input,
  output,
  signal,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as THREE from 'three';
import {
  ThreeIntegrationService,
  SceneInstance,
} from '../../../core/services/three-integration.service';
import { LazyLoadingService } from '../services/lazy-loading.service';

/**
 * Scene 3D Component
 * Manages the Three.js 3D scene rendering and basic interactions
 */
@Component({
  selector: 'brand-scene-3d',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <div class="scene-container" #sceneContainer></div> `,
  styles: [
    `
      .scene-container {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
      }
    `,
  ],
})
export class Scene3DComponent implements OnInit, OnDestroy {
  private readonly threeService = inject(ThreeIntegrationService);
  private readonly lazyLoader = inject(LazyLoadingService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('sceneContainer', { static: true })
  sceneContainer!: ElementRef<HTMLDivElement>;

  sceneId = input.required<string>();
  enableShadows = input(true);
  backgroundColor = input(0x0a0a0a);
  cameraFov = input(75);
  addDefaultContent = input(false);

  sceneReady = output<SceneInstance>();
  sceneError = output<Error>();

  readonly isReady = signal(false);
  private sceneInstance: SceneInstance | null = null;
  private controls: any = null;

  ngOnInit(): void {
    this.initializeScene();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * Initialize the 3D scene
   */
  private async initializeScene(): Promise<void> {
    try {
      // Create Three.js scene
      this.sceneInstance = this.threeService.createScene(
        this.sceneId(),
        this.sceneContainer.nativeElement,
        {
          backgroundColor: this.backgroundColor(),
          enableShadows: this.enableShadows(),
          cameraFov: this.cameraFov(),
          cameraNear: 0.1,
          cameraFar: 1000,
        }
      );

      if (!this.sceneInstance) {
        throw new Error('Failed to create 3D scene');
      }

      // Setup camera position
      this.sceneInstance.camera.position.set(0, 5, 15);
      this.sceneInstance.camera.lookAt(0, 0, 0);

      // Setup camera controls
      await this.setupCameraControls();

      // Add default content if requested
      if (this.addDefaultContent()) {
        this.addDefaultSceneContent();
      }

      // Start render loop
      this.threeService.activateScene(this.sceneId());

      this.isReady.set(true);
      this.sceneReady.emit(this.sceneInstance);
    } catch (error) {
      console.error('Failed to initialize 3D scene:', error);
      this.sceneError.emit(error as Error);
    }
  }

  /**
   * Setup camera controls with lazy loading
   */
  private async setupCameraControls(): Promise<void> {
    if (!this.sceneInstance) return;

    try {
      // Use lazy loading service for better performance tracking
      const orbitControlsModule = await this.lazyLoader
        .loadModule('orbitControls')
        .toPromise();
      const { OrbitControls } = orbitControlsModule;

      this.controls = new OrbitControls(
        this.sceneInstance.camera,
        this.sceneInstance.renderer.domElement
      );

      // Configure controls
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.screenSpacePanning = false;
      this.controls.minDistance = 5;
      this.controls.maxDistance = 50;
      this.controls.maxPolarAngle = Math.PI;
      this.controls.minPolarAngle = 0;
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    } catch (error) {
      console.error('Failed to setup camera controls:', error);
    }
  }

  /**
   * Add default scene content
   */
  private addDefaultSceneContent(): void {
    if (!this.sceneInstance) return;

    // Add test cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.7,
    });
    const testCube = new THREE.Mesh(geometry, material);
    testCube.position.set(0, 0, 0);
    testCube.name = 'testCube';
    this.sceneInstance.scene.add(testCube);

    // Preload optional modules
    this.preloadOptionalModules();

    // Add particles
    this.addParticleSystem();
  }

  /**
   * Add particle system
   */
  private addParticleSystem(): void {
    if (!this.sceneInstance) return;

    const particleCount = 200;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 100;
      positions[i3 + 1] = (Math.random() - 0.5) * 100;
      positions[i3 + 2] = (Math.random() - 0.5) * 100;

      colors[i3] = 0.2 + Math.random() * 0.5;
      colors[i3 + 1] = 0.4 + Math.random() * 0.6;
      colors[i3 + 2] = 0.8 + Math.random() * 0.2;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    particleSystem.name = 'constellationParticles';
    this.sceneInstance.scene.add(particleSystem);
  }

  /**
   * Get scene instance
   */
  getSceneInstance(): SceneInstance | null {
    return this.sceneInstance;
  }

  /**
   * Update controls (called from parent animation loop)
   */
  updateControls(): void {
    if (this.controls) {
      this.controls.update();
    }
  }

  /**
   * Preload modules that might be needed later
   */
  private preloadOptionalModules(): void {
    // Preload modules in background for better UX
    this.lazyLoader
      .preloadModules(['postProcessing', 'gltfLoader'])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => console.log('📦 Optional modules preloaded'),
        error: (error) =>
          console.warn('⚠️ Some optional modules failed to preload:', error),
      });
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }

    if (this.sceneInstance) {
      this.threeService.removeScene(this.sceneId());
      this.sceneInstance = null;
    }
  }
}
