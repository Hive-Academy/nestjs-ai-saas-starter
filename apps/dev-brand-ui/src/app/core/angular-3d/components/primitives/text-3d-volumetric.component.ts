/**
 * Text3DVolumetricComponent - Glowing 3D Text with troika-three-text
 *
 * Renders crisp 3D text using troika's SDF (Signed Distance Field) rendering with
 * material-based emissive glow. This is a DIRECT REPLACEMENT of the previous broken
 * implementation that used custom ShaderMaterial.
 *
 * Key Improvements:
 * - Uses troika Text API directly (NOT NgtsText3D extruded geometry)
 * - MeshStandardMaterial with emissive properties (NOT custom ShaderMaterial)
 * - Proper troika lifecycle (text.sync() after changes, text.dispose() on cleanup)
 * - GPU-efficient glow using material emissive + optional outline
 * - Effect-based reactive updates
 *
 * Features:
 * - Crisp text rendering at any scale (SDF rendering)
 * - Configurable glow color and intensity
 * - Optional pulsing animation
 * - troika built-in outline for enhanced glow
 * - Proper WebGL resource disposal
 *
 * Technical Details:
 * - troika internally uses createDerivedMaterial to patch your base material
 * - Must call text.sync() after configuration changes
 * - Must call text.dispose() on cleanup to release WebGL resources
 * - Emissive properties combined with UnrealBloomPass create volumetric glow effect
 *
 * Usage:
 * ```html
 * <app-text-3d-volumetric
 *   text="NEON"
 *   [position]="[0, 2, 0]"
 *   [fontSize]="1.0"
 *   [glowColor]="0x00ffff"
 *   [glowIntensity]="2.5"
 *   [pulseSpeed]="1.0"
 *   [pulseAmount]="0.3"
 * />
 * ```
 */

import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  effect,
  inject,
  DestroyRef,
  viewChild,
  ElementRef,
} from '@angular/core';
import { extend, injectBeforeRender } from 'angular-three';
import { Text } from 'troika-three-text';
import { MeshStandardMaterial, Color, Group } from 'three';
import { Colors3D } from '../../config/colors.config';

extend({ Group, MeshStandardMaterial });

@Component({
  selector: 'app-text-3d-volumetric',
  standalone: true,
  template: `
    <ngt-group
      #groupRef
      [position]="position()"
      [rotation]="rotation()"
      [scale]="scale()"
    ></ngt-group>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Text3DVolumetricComponent {
  // === INPUTS (preserves existing API + new troika-specific properties) ===
  readonly text = input.required<string>();
  readonly position = input<[number, number, number]>([0, 0, 0]);
  readonly rotation = input<[number, number, number]>([0, 0, 0]);
  readonly scale = input<number>(1);

  // troika text properties
  readonly fontSize = input<number>(1.0);
  readonly anchorX = input<'left' | 'center' | 'right'>('center');
  readonly anchorY = input<'top' | 'middle' | 'bottom'>('middle');
  readonly font = input<string | undefined>(undefined); // Default: Roboto

  // Glow properties (material-based)
  readonly glowColor = input<number>(Colors3D.neon.cyan.hex);
  readonly glowIntensity = input<number>(2.5);

  // troika outline-based glow (enhanced glow effect)
  readonly outlineWidth = input<string>('5%');
  readonly outlineBlur = input<string>('10%');

  // Animation properties
  readonly pulseSpeed = input<number>(0); // 0 = disabled
  readonly pulseAmount = input<number>(0.3);

  // === INTERNAL STATE ===
  readonly groupRef = viewChild<ElementRef<Group>>('groupRef');
  private textMesh?: Text;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // Effect 1: Initial setup - create troika Text, configure material, sync, setup cleanup
    effect((onCleanup) => {
      const group = this.groupRef()?.nativeElement;
      if (!group) return;

      // Direct troika Text instantiation (NOT NgtsText3D)
      this.textMesh = new Text();
      this.textMesh.text = this.text();
      this.textMesh.fontSize = this.fontSize();
      this.textMesh.anchorX = this.anchorX();
      this.textMesh.anchorY = this.anchorY();

      // Apply font if specified
      if (this.font()) {
        this.textMesh.font = this.font();
      }

      // MeshStandardMaterial with emissive (NOT custom ShaderMaterial)
      // troika will internally patch this material using createDerivedMaterial
      this.textMesh.material = new MeshStandardMaterial({
        color: 0xffffff,
        emissive: new Color(this.glowColor()),
        emissiveIntensity: this.glowIntensity(),
        metalness: 0.1,
        roughness: 0.8,
        toneMapped: false, // Prevent tone mapping from reducing glow
      });

      // troika built-in outline for extra glow effect
      this.textMesh.outlineWidth = this.outlineWidth();
      this.textMesh.outlineColor = this.glowColor();
      this.textMesh.outlineBlur = this.outlineBlur();

      // CRITICAL: Sync after configuration
      // This triggers troika's async text layout and material derivation
      this.textMesh.sync();

      group.add(this.textMesh);

      console.log('[Text3DVolumetric] Initialized:', {
        text: this.text(),
        fontSize: this.fontSize(),
        glowColor: new Color(this.glowColor()).getHexString(),
        glowIntensity: this.glowIntensity(),
      });

      // Cleanup function
      onCleanup(() => {
        if (this.textMesh) {
          group.remove(this.textMesh);
          // CRITICAL: Dispose to release WebGL resources
          this.textMesh.dispose();
          this.textMesh = undefined;
          console.log('[Text3DVolumetric] Disposed');
        }
      });
    });

    // Effect 2: Reactive property updates
    effect(() => {
      if (!this.textMesh) return;

      // Update text content
      this.textMesh.text = this.text();
      this.textMesh.fontSize = this.fontSize();

      // Update material emissive properties
      // Note: After sync(), troika replaces material with derived material
      // We need to check if emissive property exists before updating
      const mat = this.textMesh.material as MeshStandardMaterial;
      if (mat && mat.emissive) {
        mat.emissive.set(this.glowColor());
        mat.emissiveIntensity = this.glowIntensity();
      }

      // Update outline properties
      this.textMesh.outlineColor = this.glowColor();
      this.textMesh.outlineWidth = this.outlineWidth();
      this.textMesh.outlineBlur = this.outlineBlur();

      // Re-sync after changes
      this.textMesh.sync();
    });

    // Effect 3: Animation (if enabled)
    const pulseSpeed = this.pulseSpeed();
    if (pulseSpeed > 0) {
      injectBeforeRender(({ clock }) => {
        if (!this.textMesh) return;

        const mat = this.textMesh.material as MeshStandardMaterial;
        if (!mat) return;

        const time = clock.elapsedTime;
        const pulse =
          Math.sin(time * this.pulseSpeed()) * this.pulseAmount() + 1.0;
        mat.emissiveIntensity = this.glowIntensity() * pulse;
      });
    }
  }
}
