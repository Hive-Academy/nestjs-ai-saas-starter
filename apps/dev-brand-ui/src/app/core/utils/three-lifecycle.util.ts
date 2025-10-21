import type { NgZone } from '@angular/core';
import * as THREE from 'three';

export interface ThreeSceneConfig {
  enableShadows: boolean;
  backgroundColor: number;
  cameraFov: number;
  cameraNear: number;
  cameraFar: number;
  antialias: boolean;
  pixelRatio: number;
}

export interface ThreePerformanceMetrics {
  frameRate: number;
  renderTime: number;
  triangleCount: number;
  drawCalls: number;
  memoryUsage: number;
}

/**
 * Three.js Lifecycle Utilities
 * Manages Angular integration, performance monitoring, and resource cleanup
 */
export class ThreeLifecycleUtil {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private animationFrameId: number | null = null;
  private renderLoop: (() => void) | null = null;

  // Performance monitoring
  private frameCount = 0;
  private lastFrameTime = 0;
  private performanceMetrics: ThreePerformanceMetrics = {
    frameRate: 0,
    renderTime: 0,
    triangleCount: 0,
    drawCalls: 0,
    memoryUsage: 0,
  };

  constructor(private ngZone: NgZone) {}

  /**
   * Initialize Three.js scene with Angular optimization
   */
  initializeScene(
    container: HTMLElement,
    config: Partial<ThreeSceneConfig> = {}
  ): {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
  } {
    const fullConfig: ThreeSceneConfig = {
      enableShadows: true,
      backgroundColor: 0x0a0a0a,
      cameraFov: 75,
      cameraNear: 0.1,
      cameraFar: 1000,
      antialias: true,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      ...config,
    };

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: fullConfig.antialias,
      alpha: true,
      powerPreference: 'high-performance',
    });

    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(fullConfig.pixelRatio);
    this.renderer.setClearColor(fullConfig.backgroundColor, 0.8);

    if (fullConfig.enableShadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // Initialize scene
    this.scene = new THREE.Scene();

    // Initialize camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(
      fullConfig.cameraFov,
      aspect,
      fullConfig.cameraNear,
      fullConfig.cameraFar
    );
    this.camera.position.set(0, 0, 5);

    // Append to container
    container.appendChild(this.renderer.domElement);

    // Add default lighting
    this.addDefaultLighting();

    return {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
    };
  }

  /**
   * Start render loop outside Angular zone for performance
   */
  startRenderLoop(customRenderFn?: () => void): void {
    if (this.animationFrameId !== null) {
      console.warn('Render loop already running');
      return;
    }

    if (!this.renderer || !this.scene || !this.camera) {
      throw new Error('Scene not initialized');
    }

    this.renderLoop = () => {
      this.updatePerformanceMetrics();

      if (customRenderFn) {
        customRenderFn();
      }

      this.renderer!.render(this.scene!, this.camera!);
      this.animationFrameId = requestAnimationFrame(this.renderLoop!);
    };

    // Run outside Angular zone to prevent unnecessary change detection
    this.ngZone.runOutsideAngular(() => {
      this.renderLoop!();
    });
  }

  /**
   * Stop render loop
   */
  stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      this.renderLoop = null;
    }
  }

  /**
   * Handle window resize
   */
  handleResize(container: HTMLElement): void {
    if (!this.renderer || !this.camera) {
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): ThreePerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Dispose of all Three.js resources
   */
  dispose(): void {
    this.stopRenderLoop();

    if (this.scene) {
      this.disposeScene(this.scene);
      this.scene = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
      this.renderer = null;
    }

    this.camera = null;
  }

  /**
   * Add default lighting to scene
   */
  private addDefaultLighting(): void {
    if (!this.scene) return;

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;

    // Configure shadow camera
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;

    this.scene.add(directionalLight);
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    const now = performance.now();

    if (this.lastFrameTime > 0) {
      const deltaTime = now - this.lastFrameTime;
      this.performanceMetrics.frameRate = 1000 / deltaTime;
      this.performanceMetrics.renderTime = deltaTime;
    }

    this.lastFrameTime = now;
    this.frameCount++;

    if (this.renderer) {
      const info = this.renderer.info;
      this.performanceMetrics.triangleCount = info.render.triangles;
      this.performanceMetrics.drawCalls = info.render.calls;

      // Estimate memory usage (simplified)
      this.performanceMetrics.memoryUsage =
        info.memory.geometries * 1000 + info.memory.textures * 5000; // Rough estimate in KB
    }
  }

  /**
   * Recursively dispose of scene objects
   */
  private disposeScene(obj: THREE.Object3D): void {
    while (obj.children.length > 0) {
      this.disposeScene(obj.children[0]);
      obj.remove(obj.children[0]);
    }

    if (obj instanceof THREE.Mesh) {
      if (obj.geometry) {
        obj.geometry.dispose();
      }

      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((material) => this.disposeMaterial(material));
        } else {
          this.disposeMaterial(obj.material);
        }
      }
    }
  }

  /**
   * Dispose of material and its textures
   */
  private disposeMaterial(material: THREE.Material): void {
    Object.keys(material).forEach((prop) => {
      const value = (material as any)[prop];
      if (value && typeof value === 'object' && 'minFilter' in value) {
        value.dispose();
      }
    });

    material.dispose();
  }
}
