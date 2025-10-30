/**
 * GLTFModelComponent - Declarative Angular Three GLTF Model Loader
 *
 * A reusable component for loading and rendering GLTF/GLB 3D models using Angular Three's SOBA loaders.
 * Supports automatic model positioning, scaling, and material customization.
 *
 * Features:
 * - Signal-based reactive inputs
 * - Automatic GLTF loading with injectGLTF
 * - Support for Draco compression
 * - Configurable positioning and scaling
 * - Animation support (future enhancement)
 *
 * Usage:
 * ```html
 * <app-gltf-model
 *   [modelPath]="'/assets/3d/mini_robot/scene.gltf'"
 *   [position]="[0, 0, 0]"
 *   [scale]="1"
 *   [rotation]="[0, 0, 0]"
 *   [useDraco]="false"
 * />
 * ```
 */

import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  type OnInit,
  inject,
  DestroyRef,
  effect,
} from '@angular/core';
import { NgtArgs } from 'angular-three';
import { injectGLTF } from 'angular-three-soba/loaders';
import { Box3, Vector3, Color } from 'three';
import type {
  Group,
  Object3D,
  Material,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
} from 'three';
import { Float3dDirective } from '../../directives/float-3d.directive';
import { Performance3dDirective } from '../../directives/performance-3d.directive';
import {
  SpaceFlight3dDirective,
  type SpaceFlightWaypoint,
} from '../../directives/space-flight-3d.directive';
import {
  Rotate3dDirective,
  type RotateConfig,
} from '../../directives/rotate-3d.directive';
import { Colors3D } from '../../config/colors.config';

@Component({
  selector: 'app-gltf-model',
  standalone: true,
  imports: [
    NgtArgs,
    Float3dDirective,
    Performance3dDirective,
    SpaceFlight3dDirective,
    Rotate3dDirective,
  ],
  template: `
    @if (model(); as modelScene) {
    <ngt-primitive
      *args="[modelScene]"
      [parameters]="{
        position: position(),
        scale: computedScale(),
        rotation: rotation(),
        castShadow: castShadow(),
        receiveShadow: receiveShadow()
      }"
      float3d
      [floatConfig]="floatConfig()"
      performance3d
      spaceFlight3d
      [flightPath]="spaceFlightPath()"
      [rotationsPerCycle]="spaceFlightRotations()"
      [autoStart]="spaceFlightAutoStart()"
      [loop]="spaceFlightLoop()"
      rotate3d
      [rotateConfig]="rotateConfig()"
    />
    } @else {
    <!-- Loading state - optional placeholder -->
    @if (showLoadingPlaceholder()) {
    <ngt-mesh [position]="position()">
      <ngt-box-geometry *args="[0.5, 0.5, 0.5]" />
      <ngt-mesh-standard-material [color]="baseColor()" [wireframe]="true" />
    </ngt-mesh>
    } }
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GLTFModelComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  // Model configuration
  readonly modelPath = input.required<string>();
  readonly useDraco = input<boolean>(false);
  readonly useMeshOpt = input<boolean>(false);
  readonly baseColor = input<number>(Colors3D.material.darkGray.hex);
  // Position and transformation
  readonly position = input<readonly [number, number, number]>([0, 0, 0]);
  readonly scale = input<number | readonly [number, number, number]>(1);
  readonly rotation = input<readonly [number, number, number]>([0, 0, 0]);

  // Shadow configuration
  readonly castShadow = input<boolean>(true);
  readonly receiveShadow = input<boolean>(true);

  // Float animation configuration
  readonly floatConfig = input<
    | {
        height?: number;
        speed?: number;
        delay?: number;
        ease?: string;
        autoStart?: boolean;
      }
    | undefined
  >(undefined);

  // Space flight animation configuration
  readonly spaceFlightPath = input<SpaceFlightWaypoint[] | undefined>(
    undefined
  );
  readonly spaceFlightRotations = input<number>(8);
  readonly spaceFlightAutoStart = input<boolean>(true);
  readonly spaceFlightLoop = input<boolean>(true);

  // Rotation animation configuration
  readonly rotateConfig = input<RotateConfig | undefined>(undefined);

  // Loading state
  readonly showLoadingPlaceholder = input<boolean>(false);

  // Auto-center the model
  readonly autoCenter = input<boolean>(false);

  // Material customization
  readonly colorOverride = input<string | number | undefined>(undefined);
  readonly emissiveColor = input<string | number | undefined>(undefined);
  readonly emissiveIntensity = input<number | undefined>(undefined);
  readonly metalness = input<number | undefined>(undefined);
  readonly roughness = input<number | undefined>(undefined);

  // Lifecycle events
  readonly modelLoaded = output<{
    scene: Group;
    position: readonly [number, number, number];
  }>();
  readonly modelError = output<{ error: Error }>();
  readonly modelDestroyed = output<void>();

  // Load GLTF model (private to avoid TypeScript export issues)
  private readonly _gltf = injectGLTF(() => this.modelPath(), {
    useDraco: this.useDraco(),
    useMeshOpt: this.useMeshOpt(),
    onLoad: (data) => {
      if (data?.scene) {
        this.onModelLoaded(data.scene);
      }
    },
  });

  // Expose model for template (computed to match Angular Three pattern)
  protected readonly model = computed(() => {
    const gltf = this._gltf();
    if (!gltf) return null;
    return gltf.scene;
  });

  // Computed scale that handles both number and array inputs
  protected readonly computedScale = computed(() => {
    const scaleValue = this.scale();
    if (typeof scaleValue === 'number') {
      return [scaleValue, scaleValue, scaleValue] as const;
    }
    return scaleValue;
  });

  private isInitialized = false;

  constructor() {
    // React to material changes and reapply them
    effect(() => {
      const scene = this.model();
      if (!scene) return;

      // Trigger material update when any material input changes
      const colorOverride = this.colorOverride();
      const emissiveColor = this.emissiveColor();
      const emissiveIntensity = this.emissiveIntensity();
      const metalness = this.metalness();
      const roughness = this.roughness();

      this.applyMaterialOverrides(scene);
    });
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => {
      this.modelDestroyed.emit();
      this.cleanup();
    });
  }

  private onModelLoaded(scene: Group): void {
    try {
      // Auto-center the model if requested
      if (this.autoCenter()) {
        this.centerModel(scene);
      }

      // Apply material overrides
      this.applyMaterialOverrides(scene);

      // Emit loaded event
      this.modelLoaded.emit({
        scene,
        position: this.position(),
      });

      this.isInitialized = true;
      console.log('[GLTFModel] Model loaded successfully:', this.modelPath());
    } catch (error) {
      console.error('[GLTFModel] Error processing loaded model:', error);
      this.modelError.emit({
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Apply material overrides to all meshes in the scene
   */
  private applyMaterialOverrides(object: Object3D): void {
    object.traverse((child) => {
      if ('material' in child && child.material) {
        const material = child.material as Material;

        // Only modify PBR materials (MeshStandardMaterial, MeshPhysicalMaterial)
        if ('color' in material || 'emissive' in material) {
          const pbrMaterial = material as
            | MeshStandardMaterial
            | MeshPhysicalMaterial;

          // Apply color override
          const colorOverride = this.colorOverride();
          if (colorOverride !== undefined) {
            pbrMaterial.color = new Color(colorOverride);
          }

          // Apply emissive color
          const emissiveColor = this.emissiveColor();
          if (emissiveColor !== undefined) {
            pbrMaterial.emissive = new Color(emissiveColor);
          }

          // Apply emissive intensity
          const emissiveIntensity = this.emissiveIntensity();
          if (emissiveIntensity !== undefined) {
            pbrMaterial.emissiveIntensity = emissiveIntensity;
          }

          // Apply metalness
          const metalness = this.metalness();
          if (metalness !== undefined && 'metalness' in pbrMaterial) {
            pbrMaterial.metalness = metalness;
          }

          // Apply roughness
          const roughness = this.roughness();
          if (roughness !== undefined && 'roughness' in pbrMaterial) {
            pbrMaterial.roughness = roughness;
          }

          // Mark material for update
          pbrMaterial.needsUpdate = true;
        }
      }
    });
  }

  private centerModel(object: Object3D): void {
    // Calculate bounding box and center the model
    const box = new Box3().setFromObject(object);
    const center = box.getCenter(new Vector3());
    object.position.sub(center);
  }

  private cleanup(): void {
    console.log('[GLTFModel] Cleanup completed');
  }

  getScene(): Group | null {
    return this._gltf.scene() ?? null;
  }

  isReady(): boolean {
    return this.isInitialized && !!this._gltf.scene();
  }
}
