/**
 * GeometryNodeComponent - Declarative 3D Geometry Component
 *
 * A specialized scene node for 3D geometry with materials.
 * Provides a declarative API for common 3D shapes and custom geometry.
 * Integrates with SceneNodeComponent for hierarchical organization.
 */

import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  effect,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';

import { AngularThreeFoundationService } from '../../services/angular-three-foundation.service';
import { AnimationService } from '../../services/animation.service';
import { ReactiveStateManagerService } from '../../services/reactive-state-manager.service';

// Geometry type definitions
export type GeometryType =
  | 'box'
  | 'sphere'
  | 'plane'
  | 'cylinder'
  | 'cone'
  | 'torus'
  | 'ring'
  | 'custom';

export interface GeometryConfig {
  readonly type: GeometryType;
  readonly args: readonly number[];
  readonly segments?: number;
}

export interface MaterialConfig {
  readonly type: 'basic' | 'standard' | 'phong' | 'lambert' | 'physical';
  readonly color: string;
  readonly opacity: number;
  readonly transparent: boolean;
  readonly wireframe: boolean;
  readonly metalness?: number;
  readonly roughness?: number;
  readonly emissive?: string;
  readonly map?: string;
  readonly normalMap?: string;
}

/**
 * GeometryNodeComponent - Declarative 3D Geometry
 *
 * Creates 3D geometry objects with:
 * - Signal-based reactive configuration
 * - Material property binding
 * - Automatic geometry generation
 * - Performance optimizations
 * - Animation support
 */
@Component({
  selector: 'app-geometry-node',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="geometry-node-container"
      [attr.data-geometry-type]="geometryConfig().type"
      [style.display]="visible() ? 'block' : 'none'">

      <!-- Content projection for child nodes -->
      <ng-content></ng-content>

      <!-- Debug geometry information -->
      @if (showDebugInfo()) {
        <div class="geometry-debug-info">
          <div class="debug-header">Geometry: {{ geometryConfig().type }}</div>
          <div class="debug-stats">
            <div>
              <span>Args:</span>
              <span>{{ formatArgs(geometryConfig().args) }}</span>
            </div>
            <div>
              <span>Material:</span>
              <span>{{ materialConfig().type }}</span>
            </div>
            <div>
              <span>Triangles:</span>
              <span>{{ triangleCount() }}</span>
            </div>
            <div>
              <span>Vertices:</span>
              <span>{{ vertexCount() }}</span>
            </div>
            @if (isAnimating()) {
              <div>
                <span>Status:</span>
                <span class="animating">Animating</span>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./geometry-node.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class GeometryNodeComponent implements OnInit, OnDestroy {
  // Input configuration signals
  readonly geometryConfig = input<GeometryConfig>({
    type: 'box',
    args: [1, 1, 1],
  });

  readonly materialConfig = input<MaterialConfig>({
    type: 'standard',
    color: '#ffffff',
    opacity: 1,
    transparent: false,
    wireframe: false,
    metalness: 0.0,
    roughness: 0.5,
  });

  readonly position = input<readonly [number, number, number]>([0, 0, 0]);
  readonly rotation = input<readonly [number, number, number]>([0, 0, 0]);
  readonly scale = input<readonly [number, number, number]>([1, 1, 1]);
  readonly visible = input(true);
  readonly castShadow = input(true);
  readonly receiveShadow = input(true);
  readonly showDebugInfo = input(false);
  readonly enableAnimation = input(true);
  readonly animationTarget = input<string>('');

  // Output events
  readonly geometryReady = output<THREE.Mesh>();
  readonly materialChanged = output<THREE.Material>();
  readonly geometryChanged = output<THREE.BufferGeometry>();
  readonly animationEvent = output<{ type: string; data: any }>();

  // Dependency injection
  private readonly angularThree = inject(AngularThreeFoundationService);
  private readonly animationService = inject(AnimationService);
  private readonly reactiveStateManager = inject(ReactiveStateManagerService);

  // Component ID for state management
  private readonly componentId = `geometry-${Math.random().toString(36).substr(2, 9)}`;

  // Internal state
  private readonly _triangleCount = signal(0);
  private readonly _vertexCount = signal(0);
  private readonly _isAnimating = signal(false);

  // Three.js references
  private _mesh: THREE.Mesh | null = null;
  private _geometry: THREE.BufferGeometry | null = null;
  private _material: THREE.Material | null = null;

  // Computed properties
  readonly triangleCount = computed(() => this._triangleCount());
  readonly vertexCount = computed(() => this._vertexCount());
  readonly isAnimating = computed(() => this._isAnimating());

  // Lifecycle hooks
  ngOnInit(): void {
    this.createGeometry();
    this.setupReactiveEffects();
    this.registerWithStateManager();
    this.addToScene();
  }

  ngOnDestroy(): void {
    this.reactiveStateManager.unregisterComponent(this.componentId);
    this.cleanup();
  }

  // Public API methods

  /**
   * Get the Three.js Mesh object
   */
  getMesh(): THREE.Mesh | null {
    return this._mesh;
  }

  /**
   * Get the Three.js Geometry object
   */
  getGeometry(): THREE.BufferGeometry | null {
    return this._geometry;
  }

  /**
   * Get the Three.js Material object
   */
  getMaterial(): THREE.Material | null {
    return this._material;
  }

  /**
   * Animate material properties
   */
  animateMaterial(
    properties: Partial<MaterialConfig>,
    duration = 1000,
    ease = 'power2.inOut'
  ): void {
    if (!this._material || !this.enableAnimation()) return;

    this._isAnimating.set(true);

    const timelineId = this.animationService.createTimeline({
      name: `Geometry Material Animation ${Date.now()}`,
      animations: [{
        type: 'custom',
        duration,
        ease,
      }],
      targets: [{
        elementId: this.animationTarget() || `geometry-${Date.now()}`,
        object3D: this._mesh || undefined,
      }],
    });

    this.animationService.playTimeline(timelineId);

    setTimeout(() => {
      this._isAnimating.set(false);
      this.animationEvent.emit({
        type: 'material-animation-complete',
        data: { properties, timelineId }
      });
    }, duration);
  }

  /**
   * Update geometry configuration
   */
  updateGeometry(config: Partial<GeometryConfig>): void {
    // In a real implementation, you'd update the geometry
    // For now, just trigger a rebuild
    this.recreateGeometry();
  }

  // Template helper methods
  formatArgs(args: readonly number[]): string {
    return args.map(arg => arg.toFixed(2)).join(', ');
  }

  // Private methods

  private createGeometry(): void {
    const config = this.geometryConfig();

    // Create geometry based on type
    switch (config.type) {
      case 'box':
        this._geometry = new THREE.BoxGeometry(...(config.args as [number, number, number]));
        break;
      case 'sphere': {
        const [radius, widthSeg, heightSeg] = config.args;
        this._geometry = new THREE.SphereGeometry(radius, widthSeg || 32, heightSeg || 16);
        break;
      }
      case 'plane': {
        const [width, height, wSeg, hSeg] = config.args;
        this._geometry = new THREE.PlaneGeometry(width, height, wSeg || 1, hSeg || 1);
        break;
      }
      case 'cylinder': {
        const [radiusTop, radiusBottom, cylinderHeight, radialSeg] = config.args;
        this._geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, cylinderHeight, radialSeg || 8);
        break;
      }
      case 'cone': {
        const [coneRadius, coneHeight, coneRadialSeg] = config.args;
        this._geometry = new THREE.ConeGeometry(coneRadius, coneHeight, coneRadialSeg || 8);
        break;
      }
      case 'torus': {
        const [torusRadius, tubeRadius, radialSegments, tubularSegments] = config.args;
        this._geometry = new THREE.TorusGeometry(torusRadius, tubeRadius, radialSegments || 8, tubularSegments || 16);
        break;
      }
      default:
        this._geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    // Create material
    this.createMaterial();

    // Create mesh
    this._mesh = new THREE.Mesh(this._geometry, this._material || undefined);
    this.applyTransforms();
    this.updateGeometryStats();
  }

  private createMaterial(): void {
    const config = this.materialConfig();

    const commonProps = {
      color: new THREE.Color(config.color),
      opacity: config.opacity,
      transparent: config.transparent,
      wireframe: config.wireframe,
    };

    switch (config.type) {
      case 'basic':
        this._material = new THREE.MeshBasicMaterial(commonProps);
        break;
      case 'lambert':
        this._material = new THREE.MeshLambertMaterial(commonProps);
        break;
      case 'phong':
        this._material = new THREE.MeshPhongMaterial({
          ...commonProps,
          emissive: config.emissive ? new THREE.Color(config.emissive) : new THREE.Color(0x000000),
        });
        break;
      case 'physical':
        this._material = new THREE.MeshPhysicalMaterial({
          ...commonProps,
          metalness: config.metalness ?? 0.0,
          roughness: config.roughness ?? 0.5,
        });
        break;
      case 'standard':
      default:
        this._material = new THREE.MeshStandardMaterial({
          ...commonProps,
          metalness: config.metalness ?? 0.0,
          roughness: config.roughness ?? 0.5,
          emissive: config.emissive ? new THREE.Color(config.emissive) : new THREE.Color(0x000000),
        });
    }
  }

  private applyTransforms(): void {
    if (!this._mesh) return;

    const position = this.position();
    const rotation = this.rotation();
    const scale = this.scale();

    this._mesh.position.set(...position);
    this._mesh.rotation.set(...rotation);
    this._mesh.scale.set(...scale);
    this._mesh.visible = this.visible();
    this._mesh.castShadow = this.castShadow();
    this._mesh.receiveShadow = this.receiveShadow();
  }

  private updateGeometryStats(): void {
    if (!this._geometry) return;

    const positions = this._geometry.attributes['position'];
    if (positions) {
      const vertexCount = positions.count;
      const triangleCount = this._geometry.index
        ? this._geometry.index.count / 3
        : vertexCount / 3;

      this._vertexCount.set(vertexCount);
      this._triangleCount.set(Math.floor(triangleCount));
    }
  }

  private setupReactiveEffects(): void {
    // Monitor geometry config changes
    effect(() => {
      this.recreateGeometry();
    });

    // Monitor material config changes
    effect(() => {
      const config = this.materialConfig();
      if (this._material) {
        this.updateMaterialProperties(config);
      }
    });

    // Monitor transform changes
    effect(() => {
      this.applyTransforms();
    });
  }

  private registerWithStateManager(): void {
    // Register component with reactive state manager
    this.reactiveStateManager.registerComponent({
      componentId: this.componentId,
      componentType: 'geometry-node',
      sceneObjectId: this.componentId,
      isActive: this.visible(),
      dependencies: []
    });

    // Set up reactive state synchronization
    this.reactiveStateManager.syncTransformWithStore(
      this.componentId,
      this.componentId,
      () => ({
        position: this.position() || [0, 0, 0] as const,
        rotation: this.rotation() || [0, 0, 0] as const,
        scale: this.scale() || [1, 1, 1] as const
      })
    );

    // Track performance metrics
    this.reactiveStateManager.trackComponentPerformance(this.componentId, () => ({
      complexity: this._triangleCount(),
      memoryUsage: this._triangleCount() * 24, // Estimated bytes per triangle
      renderTime: this._triangleCount() > 1000 ? 1 : 0.5 // Estimated render impact
    }));

    // React to global geometry events
    this.reactiveStateManager.events$.subscribe(event => {
      if (event.type === 'node-updated' && event.source !== this.componentId) {
        // Could coordinate LOD levels or visibility based on other geometry nodes
        console.log(`Geometry event from ${event.source}:`, event.data);
      }
    });
  }

  private updateMaterialProperties(config: MaterialConfig): void {
    if (!this._material) return;

    // Type-safe material property updates
    if ('color' in this._material) {
      (this._material as any).color = new THREE.Color(config.color);
    }
    if ('opacity' in this._material) {
      (this._material as any).opacity = config.opacity;
    }
    if ('transparent' in this._material) {
      (this._material as any).transparent = config.transparent;
    }
    if ('wireframe' in this._material) {
      (this._material as any).wireframe = config.wireframe;
    }

    this._material.needsUpdate = true;
    this.materialChanged.emit(this._material);
  }

  private recreateGeometry(): void {
    this.disposeGeometry();
    this.createGeometry();

    if (this._mesh && this._geometry) {
      this._mesh.geometry = this._geometry;
      this.geometryChanged.emit(this._geometry);
    }
  }

  private addToScene(): void {
    if (!this._mesh) return;

    const scene = this.angularThree.scene();
    if (scene) {
      scene.add(this._mesh);
      this.geometryReady.emit(this._mesh);
    }
  }

  private disposeGeometry(): void {
    if (this._geometry) {
      this._geometry.dispose();
      this._geometry = null;
    }
    if (this._material) {
      this._material.dispose();
      this._material = null;
    }
  }

  private cleanup(): void {
    // Remove from scene
    if (this._mesh && this._mesh.parent) {
      this._mesh.parent.remove(this._mesh);
    }

    // Dispose resources
    this.disposeGeometry();
    this._mesh = null;
  }
}
