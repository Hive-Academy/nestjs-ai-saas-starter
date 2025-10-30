/**
 * SVGIconComponent - Declarative Angular Three SVG Icon Loader
 *
 * A reusable component for loading and rendering SVG icons as 3D objects using Three.js SVGLoader.
 * Supports automatic centering, extrusion, and material customization.
 *
 * Features:
 * - Signal-based reactive inputs
 * - SVG path loading with three-stdlib
 * - 2D (flat) or 3D (extruded) rendering
 * - Automatic centering and Y-axis flip
 * - Support for float and performance directives
 * - Configurable material properties
 *
 * Usage:
 * ```html
 * <!-- Flat 2D icon -->
 * <app-svg-icon
 *   [svgPath]="'/assets/icons/star.svg'"
 *   [position]="[0, 0, 0]"
 *   [scale]="0.01"
 *   [color]="0xffd700"
 * />
 *
 * <!-- Extruded 3D icon with animation -->
 * <app-svg-icon
 *   [svgPath]="'/assets/icons/logo.svg'"
 *   [position]="[2, 0, -5]"
 *   [scale]="0.02"
 *   [extrudeDepth]="0.5"
 *   [color]="0x00ff00"
 *   float3d
 *   [floatConfig]="{ height: 0.3, speed: 2 }"
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
  signal,
  effect,
} from '@angular/core';
import { NgtArgs } from 'angular-three';
import { SVGLoader } from 'three-stdlib';
import {
  Group,
  Mesh,
  MeshStandardMaterial,
  ShapeGeometry,
  ExtrudeGeometry,
  type ExtrudeGeometryOptions,
  Box3,
  Vector3,
  Color,
} from 'three';
import { Float3dDirective } from '../../directives/float-3d.directive';
import { Performance3dDirective } from '../../directives/performance-3d.directive';
import {
  SpaceFlight3dDirective,
  type SpaceFlightWaypoint,
} from '../../directives/space-flight-3d.directive';
import { Colors3D } from '../../config/colors.config';

@Component({
  selector: 'app-svg-icon',
  standalone: true,
  imports: [
    NgtArgs,
    Float3dDirective,
    Performance3dDirective,
    SpaceFlight3dDirective,
  ],
  template: `
    @if (svgGroup(); as group) {
    <ngt-primitive
      *args="[group]"
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
    />
    } @else if (isLoading()) {
    <!-- Loading placeholder -->
    @if (showLoadingPlaceholder()) {
    <ngt-mesh [position]="position()">
      <ngt-box-geometry [args]="[0.5, 0.5, 0.1]" />
      <ngt-mesh-standard-material [color]="color()" [wireframe]="true" />
    </ngt-mesh>
    } }
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SVGIconComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly loader = new SVGLoader();

  // SVG configuration
  readonly svgPath = input.required<string>();

  // Position and transformation
  readonly position = input<readonly [number, number, number]>([0, 0, 0]);
  readonly scale = input<number | readonly [number, number, number]>(1);
  readonly rotation = input<readonly [number, number, number]>([0, 0, 0]);

  // SVG-specific options
  readonly extrudeDepth = input<number>(0.1);
  readonly center = input<boolean>(true);
  readonly fillOnly = input<boolean>(true); // Only render filled paths, not strokes
  readonly flipY = input<boolean>(true); // SVG coordinate system is inverted by default
  readonly bevelEnabled = input<boolean>(false);
  readonly bevelThickness = input<number>(0.02);
  readonly bevelSize = input<number>(0.01);

  // Material properties
  readonly color = input<number>(Colors3D.accent.gold.hex);
  readonly colorOverride = input<boolean | undefined>(undefined); // If true, always use color input; if false/undefined, preserve SVG colors
  readonly metalness = input<number>(0.7);
  readonly roughness = input<number>(0.2);
  readonly emissive = input<number>(Colors3D.material.black.hex);
  readonly emissiveIntensity = input<number>(0);
  readonly transparent = input<boolean>(false);
  readonly opacity = input<number>(1.0);

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

  // Loading state
  readonly showLoadingPlaceholder = input<boolean>(false);
  readonly isLoading = signal<boolean>(true);

  // SVG group signal
  readonly svgGroup = signal<Group | null>(null);

  // Lifecycle events
  readonly svgLoaded = output<{
    group: Group;
    position: readonly [number, number, number];
    meshCount: number;
  }>();
  readonly svgError = output<{ error: Error; path: string }>();
  readonly svgDestroyed = output<void>();

  // Computed scale
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
      const group = this.svgGroup();
      if (!group || !this.isInitialized) return;

      // Trigger material update when any material input changes
      const color = this.color();
      const emissive = this.emissive();
      const emissiveIntensity = this.emissiveIntensity();
      const metalness = this.metalness();
      const roughness = this.roughness();
      const transparent = this.transparent();
      const opacity = this.opacity();

      this.applyMaterialUpdates(group);
    });

    // React to SVG path changes
    effect(() => {
      const path = this.svgPath();
      if (this.isInitialized && path) {
        this.reloadSVG();
      }
    });
  }

  ngOnInit(): void {
    this.loadSVG();

    this.destroyRef.onDestroy(() => {
      this.svgDestroyed.emit();
      this.cleanup();
    });
  }

  /**
   * Load SVG from the specified path
   */
  private async loadSVG(): Promise<void> {
    try {
      this.isLoading.set(true);

      const svgPath = this.svgPath();
      const data = await this.loader.loadAsync(svgPath);

      const group = this.createGroupFromSVGData(data);

      this.svgGroup.set(group);
      this.isLoading.set(false);
      this.isInitialized = true;

      this.svgLoaded.emit({
        group,
        position: this.position(),
        meshCount: group.children.length,
      });

      console.log('[SVGIcon] SVG loaded successfully:', svgPath);
    } catch (error) {
      console.error('[SVGIcon] Error loading SVG:', error);
      this.isLoading.set(false);
      this.svgError.emit({
        error: error instanceof Error ? error : new Error(String(error)),
        path: this.svgPath(),
      });
    }
  }

  /**
   * Reload SVG (used when path changes reactively)
   */
  private async reloadSVG(): Promise<void> {
    // Cleanup previous group
    const oldGroup = this.svgGroup();
    if (oldGroup) {
      this.disposeGroup(oldGroup);
    }

    // Load new SVG
    await this.loadSVG();
  }

  /**
   * Create a Three.js Group from SVG data
   * Preserves original SVG colors from the SVG file when colorOverride is not provided
   */
  private createGroupFromSVGData(data: ReturnType<SVGLoader['parse']>): Group {
    const group = new Group();

    const extrudeSettings: ExtrudeGeometryOptions = {
      depth: this.extrudeDepth(),
      bevelEnabled: this.bevelEnabled(),
      bevelThickness: this.bevelThickness(),
      bevelSize: this.bevelSize(),
    };

    // Process SVG paths - each path may have its own color
    data.paths.forEach((path) => {
      const shapes = SVGLoader.createShapes(path);

      shapes.forEach((shape) => {
        let geometry: ShapeGeometry | ExtrudeGeometry;

        if (this.extrudeDepth() > 0) {
          geometry = new ExtrudeGeometry(shape, extrudeSettings);
        } else {
          geometry = new ShapeGeometry(shape);
        }

        // Create material - use SVG's original fill color if available, otherwise use override
        const material = this.createMaterialForPath(path);

        const mesh = new Mesh(geometry, material);
        mesh.castShadow = this.castShadow();
        mesh.receiveShadow = this.receiveShadow();

        group.add(mesh);
      });
    });

    // Center the SVG if requested
    if (this.center()) {
      this.centerGroup(group);
    }

    // Flip Y-axis (SVG coordinate system is inverted)
    if (this.flipY()) {
      group.scale.y = -1;
    }

    return group;
  }

  /**
   * Create material for a specific SVG path
   * Preserves original SVG path color when colorOverride is false/undefined
   */
  private createMaterialForPath(path: any): MeshStandardMaterial {
    let materialColor = this.color();

    // Check if we should preserve original SVG colors
    const shouldPreserveColors = !this.colorOverride();

    // Check if path has a fill color from the SVG
    if (shouldPreserveColors && path.userData?.style?.fill) {
      // Parse SVG color (handles #RRGGBB format)
      const svgColor = path.userData.style.fill;
      if (typeof svgColor === 'string' && svgColor.startsWith('#')) {
        materialColor = parseInt(svgColor.replace('#', '0x'), 16);
      }
    }

    return new MeshStandardMaterial({
      color: materialColor,
      metalness: this.metalness(),
      roughness: this.roughness(),
      emissive: this.emissive(),
      emissiveIntensity: this.emissiveIntensity(),
      transparent: this.transparent(),
      opacity: this.opacity(),
    });
  }

  /**
   * Create material with current settings
   */
  private createMaterial(): MeshStandardMaterial {
    return new MeshStandardMaterial({
      color: this.color(),
      metalness: this.metalness(),
      roughness: this.roughness(),
      emissive: this.emissive(),
      emissiveIntensity: this.emissiveIntensity(),
      transparent: this.transparent(),
      opacity: this.opacity(),
    });
  }

  /**
   * Apply material updates to all meshes in the group
   */
  private applyMaterialUpdates(group: Group): void {
    group.traverse((child) => {
      if (
        child instanceof Mesh &&
        child.material instanceof MeshStandardMaterial
      ) {
        child.material.color = new Color(this.color());
        child.material.emissive = new Color(this.emissive());
        child.material.emissiveIntensity = this.emissiveIntensity();
        child.material.metalness = this.metalness();
        child.material.roughness = this.roughness();
        child.material.transparent = this.transparent();
        child.material.opacity = this.opacity();
        child.material.needsUpdate = true;
      }
    });
  }

  /**
   * Center the group by calculating bounding box
   */
  private centerGroup(group: Group): void {
    const box = new Box3().setFromObject(group);
    const center = box.getCenter(new Vector3());

    // Offset all children
    group.children.forEach((child) => {
      child.position.sub(center);
    });
  }

  /**
   * Dispose of a group and all its resources
   */
  private disposeGroup(group: Group): void {
    group.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry?.dispose();
        if (object.material instanceof MeshStandardMaterial) {
          object.material.dispose();
        }
      }
    });
    group.clear();
  }

  /**
   * Cleanup on component destruction
   */
  private cleanup(): void {
    const group = this.svgGroup();
    if (group) {
      this.disposeGroup(group);
    }
    console.log('[SVGIcon] Cleanup completed');
  }

  /**
   * Get the Three.js Group containing the SVG meshes
   */
  getGroup(): Group | null {
    return this.svgGroup();
  }

  /**
   * Check if the component is ready (loaded and initialized)
   */
  isReady(): boolean {
    return !this.isLoading() && !!this.svgGroup();
  }

  /**
   * Get mesh count for debugging
   */
  getMeshCount(): number {
    return this.svgGroup()?.children.length ?? 0;
  }
}
