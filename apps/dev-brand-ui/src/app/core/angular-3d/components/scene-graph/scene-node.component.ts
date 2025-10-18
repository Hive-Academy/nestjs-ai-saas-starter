/**
 * SceneNodeComponent - Hierarchical Scene Graph Node
 *
 * A fundamental building block for hierarchical 3D scene organization.
 * Uses programmatic Three.js with reactive Angular signals for state management.
 * Provides a declarative API while maintaining Three.js performance.
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
  ContentChildren,
  QueryList,
  forwardRef,
  AfterContentInit,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';

import { HybridUIService } from '../../services/hybrid-ui.service';
import { AnimationService } from '../../services/animation.service';
import { Angular3DStateStore } from '../../services/angular-3d-state.store';

// Type definitions for scene node configuration
export interface Transform3D {
  readonly position: readonly [number, number, number];
  readonly rotation: readonly [number, number, number];
  readonly scale: readonly [number, number, number];
}

export interface SceneNodeConfig {
  readonly id: string;
  readonly name?: string;
  readonly visible?: boolean;
  readonly castShadow?: boolean;
  readonly receiveShadow?: boolean;
  readonly renderOrder?: number;
  readonly frustumCulled?: boolean;
  readonly matrixAutoUpdate?: boolean;
  readonly userData?: Record<string, any>;
}

export interface NodeBounds {
  readonly min: THREE.Vector3;
  readonly max: THREE.Vector3;
  readonly center: THREE.Vector3;
  readonly size: THREE.Vector3;
}

/**
 * SceneNodeComponent - Hierarchical Scene Graph Node
 *
 * Creates a hierarchical structure for 3D objects with:
 * - Signal-based reactive transforms
 * - Automatic parent-child relationships
 * - Built-in animation support
 * - Performance optimizations
 * - Bounds calculation
 */
@Component({
  selector: 'app-scene-node',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="scene-node-container"
      [attr.data-node-id]="config().id"
      [style.display]="visible() ? 'block' : 'none'"
      #containerRef
    >
      <!-- Content projection for child components -->
      <ng-content></ng-content>

      <!-- Debug information when enabled -->
      @if (showDebugBounds()) {
      <div class="debug-info">
        <div class="debug-header">Node: {{ config().name || config().id }}</div>
        <div class="debug-stats">
          <div>Position: {{ formatVector(transformedPosition()) }}</div>
          <div>Rotation: {{ formatVector(transformedRotation()) }}</div>
          <div>Scale: {{ formatVector(transformedScale()) }}</div>
          @if (bounds(); as nodeBounds) {
          <div>Bounds: {{ formatBounds(nodeBounds) }}</div>
          }
          <div>Children: {{ childCount() }}</div>
          <div>Visible: {{ effectiveVisibility() }}</div>
        </div>
      </div>
      }

      <!-- Performance metrics when enabled -->
      @if (showPerformanceInfo()) {
      <div class="performance-info">
        <div>LOD Level: {{ lodLevel() }}</div>
        <div>Animating: {{ isAnimating() }}</div>
      </div>
      }
    </div>
  `,
  styleUrls: ['./scene-node.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SceneNodeComponent implements OnInit, OnDestroy, AfterContentInit {
  // Input configuration signals
  readonly config = input.required<SceneNodeConfig>();
  readonly transform = input<Partial<Transform3D>>({});
  readonly parentTransform = input<Transform3D | null>(null);
  readonly animationTarget = input<string>('');
  readonly enableLOD = input(false);
  readonly lodDistances = input<readonly number[]>([10, 50, 200]);
  readonly showDebugBounds = input(false);
  readonly showPerformanceInfo = input(false);
  readonly debugColor = input('#ff0000');
  readonly performanceMode = input<'normal' | 'optimized' | 'high-performance'>(
    'normal'
  );

  // Transform input signals
  readonly position = input<readonly [number, number, number]>([0, 0, 0]);
  readonly rotation = input<readonly [number, number, number]>([0, 0, 0]);
  readonly scale = input<readonly [number, number, number]>([1, 1, 1]);
  readonly visible = input(true);
  readonly castShadow = input(false);
  readonly receiveShadow = input(false);
  readonly renderOrder = input(0);
  readonly frustumCulled = input(true);
  readonly matrixAutoUpdate = input(true);
  readonly userData = input<Record<string, any>>({});

  // Output events for component integration
  readonly nodeReady = output<THREE.Group>();
  readonly boundsChanged = output<NodeBounds>();
  readonly visibilityChanged = output<boolean>();
  readonly lodLevelChanged = output<number>();
  readonly transformChanged = output<Transform3D>();
  readonly animationEvent = output<{
    type: string;
    node: SceneNodeComponent;
    data: any;
  }>();

  // Child nodes for hierarchy management
  @ContentChildren(forwardRef(() => SceneNodeComponent), { descendants: false })
  private readonly childNodes!: QueryList<SceneNodeComponent>;

  // Dependency injection
  private readonly hybridUI = inject(HybridUIService);
  private readonly animationService = inject(AnimationService);
  private readonly stateStore = inject(Angular3DStateStore);

  // Internal state signals
  private readonly _bounds = signal<NodeBounds | null>(null);
  private readonly _lodLevel = signal(0);
  private readonly _isAnimating = signal(false);
  private readonly _lastTransform = signal<Transform3D>({
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  });

  // Computed properties for reactive transforms
  readonly transformedPosition = computed(() => {
    const pos = this.position();
    const parent = this.parentTransform();
    const transformOverride = this.transform().position;

    if (transformOverride) {
      return transformOverride;
    }

    if (parent) {
      // Apply parent transform
      const parentPos = new THREE.Vector3(...parent.position);
      const localPos = new THREE.Vector3(...pos);
      return [
        parentPos.x + localPos.x,
        parentPos.y + localPos.y,
        parentPos.z + localPos.z,
      ] as const;
    }

    return pos;
  });

  readonly transformedRotation = computed(() => {
    const rot = this.rotation();
    const parent = this.parentTransform();
    const transformOverride = this.transform().rotation;

    if (transformOverride) {
      return transformOverride;
    }

    if (parent) {
      // Apply parent rotation
      const parentRot = new THREE.Euler(...parent.rotation);
      const localRot = new THREE.Euler(...rot);
      parentRot.x += localRot.x;
      parentRot.y += localRot.y;
      parentRot.z += localRot.z;
      return [parentRot.x, parentRot.y, parentRot.z] as const;
    }

    return rot;
  });

  readonly transformedScale = computed(() => {
    const scale = this.scale();
    const parent = this.parentTransform();
    const transformOverride = this.transform().scale;

    if (transformOverride) {
      return transformOverride;
    }

    if (parent) {
      // Apply parent scale
      const parentScale = new THREE.Vector3(...parent.scale);
      const localScale = new THREE.Vector3(...scale);
      return [
        parentScale.x * localScale.x,
        parentScale.y * localScale.y,
        parentScale.z * localScale.z,
      ] as const;
    }

    return scale;
  });

  readonly effectiveVisibility = computed(() => {
    const baseVisible = this.visible();

    // If we have performance optimizations, apply them
    const perfMode = this.performanceMode();
    if (perfMode === 'high-performance') {
      const bounds = this._bounds();
      if (bounds && this.isOutsideFrustum(bounds)) {
        return false;
      }
    }

    return baseVisible;
  });

  readonly currentTransform = computed(
    (): Transform3D => ({
      position: this.transformedPosition(),
      rotation: this.transformedRotation(),
      scale: this.transformedScale(),
    })
  );

  readonly bounds = computed(() => this._bounds());
  readonly lodLevel = computed(() => this._lodLevel());
  readonly isAnimating = computed(() => this._isAnimating());
  readonly childCount = computed(() => this.childNodes?.length ?? 0);

  // Three.js object reference
  private _group: THREE.Group | null = null;

  // Template helper methods
  formatVector(vector: readonly [number, number, number]): string {
    return `(${vector[0].toFixed(2)}, ${vector[1].toFixed(
      2
    )}, ${vector[2].toFixed(2)})`;
  }

  formatBounds(bounds: NodeBounds): string {
    const size = bounds.size;
    return `${size.x.toFixed(1)}×${size.y.toFixed(1)}×${size.z.toFixed(1)}`;
  }

  // Lifecycle hooks
  ngOnInit(): void {
    this.initializeThreeJSGroup();
    this.setupReactiveEffects();
    this.registerWithStateStore();
  }

  ngAfterContentInit(): void {
    this.setupChildNodeManagement();
    this.addToScene();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  // Public API methods

  /**
   * Get the Three.js Group object
   */
  getGroup(): THREE.Group | null {
    return this._group;
  }

  /**
   * Get all child scene nodes
   */
  getChildNodes(): SceneNodeComponent[] {
    return this.childNodes.toArray();
  }

  /**
   * Update transform with optional animation
   */
  updateTransform(
    transform: Partial<Transform3D>,
    animate = false,
    duration = 1000,
    ease = 'power2.inOut'
  ): void {
    if (animate && this.animationTarget()) {
      this._isAnimating.set(true);

      const timelineId = this.animationService.createTimeline({
        name: `Scene Node ${this.config().id} Transform`,
        animations: [
          {
            type: 'slide',
            duration,
            ease,
          },
        ],
        targets: [
          {
            elementId: this.animationTarget(),
            object3D: this.getGroup() || undefined,
            ...transform,
          },
        ],
      });

      this.animationService.playTimeline(timelineId);

      // Listen for animation completion (TODO: Implement onAnimationComplete method)
      // this.animationService.onAnimationComplete(timelineId)
      //   .pipe(takeUntilDestroyed())
      //   .subscribe(() => {
      //     this._isAnimating.set(false);
      //     this.animationEvent.emit({
      //       type: 'transform-animation-complete',
      //       node: this,
      //       data: { transform, timelineId }
      //     });
      //   });

      // Temporary completion handler
      setTimeout(() => {
        this._isAnimating.set(false);
        this.animationEvent.emit({
          type: 'transform-animation-complete',
          node: this,
          data: { transform, timelineId },
        });
      }, 1000); // Default duration
    }
  }

  /**
   * Calculate and update bounds
   */
  updateBounds(): NodeBounds | null {
    const group = this.getGroup();
    if (!group) return null;

    const box = new THREE.Box3().setFromObject(group);
    const bounds: NodeBounds = {
      min: box.min.clone(),
      max: box.max.clone(),
      center: box.getCenter(new THREE.Vector3()),
      size: box.getSize(new THREE.Vector3()),
    };

    this._bounds.set(bounds);
    this.boundsChanged.emit(bounds);
    return bounds;
  }

  /**
   * Set visibility with optional fade animation
   */
  setVisibility(visible: boolean, fade = false, duration = 300): void {
    if (fade) {
      const group = this.getGroup();
      if (!group) return;

      // Animate opacity through material
      this.animateOpacity(visible ? 1 : 0, duration).then(() => {
        group.visible = visible;
        this.visibilityChanged.emit(visible);
      });
    } else {
      const group = this.getGroup();
      if (group) {
        group.visible = visible;
        this.visibilityChanged.emit(visible);
      }
    }
  }

  /**
   * Traverse hierarchy and execute callback on each node
   */
  traverse(
    callback: (node: SceneNodeComponent, depth: number) => void,
    depth = 0
  ): void {
    callback(this, depth);
    this.childNodes.forEach((child) => child.traverse(callback, depth + 1));
  }

  // Event handlers
  onBeforeRender(event: any): void {
    // Update performance optimizations
    if (this.performanceMode() === 'high-performance') {
      this.updateBounds();
    }
  }

  onAfterRender(event: any): void {
    // Post-render optimizations
    const perfMode = this.performanceMode();
    if (perfMode === 'optimized' || perfMode === 'high-performance') {
      this.optimizeChildren();
    }
  }

  onLODLevelChange(level: number): void {
    this._lodLevel.set(level);
    this.lodLevelChanged.emit(level);
  }

  // Private methods

  private setupReactiveEffects(): void {
    // Monitor transform changes
    effect(() => {
      const currentTransform = this.currentTransform();
      const lastTransform = this._lastTransform();

      if (this.hasTransformChanged(currentTransform, lastTransform)) {
        this._lastTransform.set(currentTransform);
        this.transformChanged.emit(currentTransform);
      }
    });

    // Monitor configuration changes
    effect(() => {
      const config = this.config();
      this.applyConfiguration(config);
    });

    // Monitor visibility changes
    effect(() => {
      const visible = this.effectiveVisibility();
      this.visibilityChanged.emit(visible);
    });
  }

  private registerWithStateStore(): void {
    const config = this.config();
    const sceneId = this.stateStore.state().activeSceneId || 'default-scene';

    // Create scene object state
    const objectState = {
      id: config.id,
      name: config.name || `Node ${config.id}`,
      type: 'group' as const,
      visible: this.effectiveVisibility(),
      position: this.position() || ([0, 0, 0] as const),
      rotation: this.rotation() || ([0, 0, 0] as const),
      scale: this.scale() || ([1, 1, 1] as const),
      parent: undefined, // Parent will be determined by component hierarchy
      children: [],
      userData: { nodeType: 'scene-node', config },
    };

    // Register with state store
    this.stateStore.addSceneObject(sceneId, objectState);

    // Set up reactive sync with state store
    effect(() => {
      const transform = this.currentTransform();
      this.stateStore.updateSceneObject(sceneId, config.id, {
        position: transform.position,
        rotation: transform.rotation,
        scale: transform.scale,
        visible: this.effectiveVisibility(),
      });
    });
  }

  private initializeThreeJSGroup(): void {
    this._group = new THREE.Group();
    const config = this.config();

    this._group.name = config.name || config.id;
    this._group.userData = {
      ...config.userData,
      sceneNodeId: config.id,
      component: this,
    };

    this.applyConfiguration(config);
    this.updateTransforms();
  }

  private addToScene(): void {
    if (!this._group) return;

    const scene = this.hybridUI.scene();
    if (scene) {
      scene.add(this._group);
      this.updateBounds();
      this.nodeReady.emit(this._group);
    }
  }

  private updateTransforms(): void {
    if (!this._group) return;

    const position = this.transformedPosition();
    const rotation = this.transformedRotation();
    const scale = this.transformedScale();

    this._group.position.set(...position);
    this._group.rotation.set(...rotation);
    this._group.scale.set(...scale);
  }

  private setupChildNodeManagement(): void {
    // Monitor child node changes
    this.childNodes.changes.pipe(takeUntilDestroyed()).subscribe(() => {
      this.updateChildTransforms();
    });
  }

  private updateChildTransforms(): void {
    this.childNodes.forEach((child) => {
      // Update child's parent transform
      // This would require a way to update child's parentTransform input
      // In a real implementation, you might use a service or different approach
    });
  }

  private applyConfiguration(config: SceneNodeConfig): void {
    const group = this.getGroup();
    if (!group) return;

    group.visible = config.visible ?? true;
    group.castShadow = config.castShadow ?? false;
    group.receiveShadow = config.receiveShadow ?? false;
    group.renderOrder = config.renderOrder ?? 0;
    group.frustumCulled = config.frustumCulled ?? true;
    group.matrixAutoUpdate = config.matrixAutoUpdate ?? true;
    group.userData = { ...group.userData, ...config.userData };
  }

  private hasTransformChanged(
    current: Transform3D,
    last: Transform3D
  ): boolean {
    return (
      !this.arraysEqual(current.position, last.position) ||
      !this.arraysEqual(current.rotation, last.rotation) ||
      !this.arraysEqual(current.scale, last.scale)
    );
  }

  private arraysEqual(a: readonly number[], b: readonly number[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }

  private isOutsideFrustum(bounds: NodeBounds): boolean {
    // Simplified frustum culling check
    // In a real implementation, you'd get the camera frustum
    const camera = this.hybridUI.camera();
    if (!camera) return false;

    // This is a placeholder - implement proper frustum culling
    const distance = bounds.center.distanceTo(camera.position);
    return distance > 1000; // Simple distance-based culling
  }

  private optimizeChildren(): void {
    this.childNodes.forEach((child) => {
      const childBounds = child.bounds();
      if (childBounds && this.isOutsideFrustum(childBounds)) {
        child.setVisibility(false);
      }
    });
  }

  private async animateOpacity(
    targetOpacity: number,
    duration: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const group = this.getGroup();
      if (!group) {
        resolve();
        return;
      }

      // Animate all materials in the group
      group.traverse((object) => {
        if (object instanceof THREE.Mesh && object.material) {
          const material = Array.isArray(object.material)
            ? object.material[0]
            : object.material;

          if ('opacity' in material) {
            // Use GSAP for smooth opacity animation
            const timelineId = this.animationService.createTimeline({
              name: `Opacity Animation ${this.config().id}`,
              animations: [
                {
                  type: 'fade',
                  duration,
                  ease: 'power2.inOut',
                },
              ],
              targets: [
                {
                  elementId: `${this.config().id}-opacity`,
                  opacity: targetOpacity,
                },
              ],
            });

            this.animationService.playTimeline(timelineId);

            setTimeout(resolve, duration);
          }
        }
      });
    });
  }

  private cleanup(): void {
    // Clean up any active animations
    if (this._isAnimating()) {
      // TODO: Implement getActiveAnimations method
      // const activeAnimations = this.animationService.getActiveAnimations();
      // activeAnimations.forEach(timeline => {
      //   if (timeline.name?.includes(this.config().id)) {
      //     this.animationService.stopTimeline(timeline.id);
      //   }
      // });
    }

    // Clean up child nodes
    this.childNodes.forEach((child) => child.ngOnDestroy());
  }
}
