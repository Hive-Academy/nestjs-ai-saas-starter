/**
 * TechMarkerComponent - HTML Overlay Marker for 3D Tech Stack Visualization
 *
 * A specialized marker component that renders HTML content in 3D space using ngts-html.
 * Designed to label technology stack elements (LangChain, LangGraph, Neo4j, ChromaDB)
 * with adaptive visibility based on camera distance and occlusion.
 *
 * Features:
 * - Signal-based reactive inputs for position, rotation, label, opacity, and glow
 * - Automatic occlusion detection (hidden when behind objects)
 * - Distance-based visibility (only visible within 15 units of camera)
 * - Smooth transitions with scale and opacity animations
 * - Dynamic glow effect based on glowIntensity input
 * - Semi-transparent backdrop with blur effect
 * - Tech-specific emoji icons
 *
 * Usage:
 * ```html
 * <app-tech-marker
 *   [position]="[-3, 3, 9.5]"
 *   [rotation]="[0, -Math.PI/4, 0]"
 *   label="LangChain"
 *   [opacity]="heroState.markerOpacity()"
 *   [glowIntensity]="heroState.markerGlow()"
 * />
 * ```
 *
 * @example
 * ```typescript
 * // Component usage with signals
 * @Component({
 *   template: `
 *     <app-tech-marker
 *       [position]="markerPosition()"
 *       [rotation]="markerRotation()"
 *       [label]="techName()"
 *       [opacity]="markerOpacity()"
 *       [glowIntensity]="glowLevel()"
 *     />
 *   `
 * })
 * export class MyScene {
 *   markerPosition = signal<[number, number, number]>([-3, 3, 9.5]);
 *   markerRotation = signal<[number, number, number]>([0, -Math.PI/4, 0]);
 *   techName = signal('LangChain');
 *   markerOpacity = signal(1);
 *   glowLevel = signal(0.5);
 * }
 * ```
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { injectBeforeRender, NgtEuler, NgtVector3 } from 'angular-three';
import { NgtsHTML, NgtsHTMLContent } from 'angular-three-soba/misc';
import { Group, Vector3 } from 'three';

/**
 * TechMarker Component
 *
 * Renders an HTML overlay marker in 3D space with occlusion detection,
 * distance-based visibility, and dynamic styling based on glow intensity.
 */
@Component({
  selector: 'app-tech-marker',
  standalone: true,
  imports: [NgtsHTML, NgtsHTMLContent],
  template: `
    <ngt-group #group>
      <ngts-html
        [options]="{
          transform: true,
          occlude: true,
          position: position(),
          rotation: rotation()
        }"
      >
        <div
          [ngtsHTMLContent]="{ containerStyle: containerStyle() }"
          (occluded)="isOccluded.set($event)"
        >
          <div [style]="markerStyle()">
            <span class="tech-icon">{{ techIcon() }}</span>
            <span class="tech-label">{{ label() }}</span>
          </div>
        </div>
      </ngts-html>
    </ngt-group>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechMarkerComponent {
  // Position and rotation inputs
  readonly position = input<NgtVector3>([0, 0, 0]);
  readonly rotation = input<NgtEuler>([0, 0, 0]);

  // Content inputs
  readonly label = input.required<string>();

  // State inputs (from state store)
  readonly opacity = input<number>(1);
  readonly glowIntensity = input<number>(0);

  // ViewChild reference to access the group for distance calculations
  private readonly groupRef = viewChild.required<ElementRef<Group>>('group');

  // Internal state signals
  protected readonly isOccluded = signal(false);
  private readonly isInRange = signal(false);

  // Computed visibility state
  private readonly isVisible = computed(
    () => !this.isOccluded() && this.isInRange()
  );

  /**
   * Get tech-specific emoji icon based on label
   */
  protected readonly techIcon = computed(() => {
    const label = this.label().toLowerCase();
    if (label.includes('langchain')) return '🦜';
    if (label.includes('langgraph')) return '🕸️';
    if (label.includes('neo4j')) return '🔵';
    if (label.includes('chromadb') || label.includes('chroma')) return '🎨';
    return '⚡'; // Default icon
  });

  /**
   * Container style for transitions and visibility
   * Combines visibility logic with opacity from state
   */
  protected readonly containerStyle = computed(() => {
    const visible = this.isVisible();
    const opacityValue = this.opacity();

    return {
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      opacity: visible ? `${opacityValue}` : '0',
      transform: `scale(${visible ? 1 : 0.25})`,
      pointerEvents: visible ? 'auto' : 'none',
    };
  });

  /**
   * Marker content style with glow effect
   */
  protected readonly markerStyle = computed(() => {
    const glow = this.glowIntensity();
    const glowColor = this.getGlowColor();

    // Calculate box-shadow based on glow intensity
    const boxShadow =
      glow > 0
        ? `0 0 ${10 + glow * 20}px ${glowColor},
           0 0 ${20 + glow * 40}px ${glowColor},
           inset 0 0 ${5 + glow * 10}px ${glowColor}`
        : '0 4px 12px rgba(0, 0, 0, 0.3)';

    return {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 16px',
      background: `rgba(0, 0, 0, ${0.7 + glow * 0.2})`,
      backdropFilter: 'blur(8px)',
      border: `1px solid rgba(255, 255, 255, ${0.2 + glow * 0.3})`,
      borderRadius: '8px',
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: '600',
      fontFamily:
        'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      whiteSpace: 'nowrap',
      boxShadow,
      transition: 'all 0.3s ease',
      userSelect: 'none',
    };
  });

  /**
   * Get glow color based on tech label
   */
  private getGlowColor(): string {
    const label = this.label().toLowerCase();
    if (label.includes('langchain')) return 'rgba(59, 130, 246, 0.6)'; // Blue
    if (label.includes('langgraph')) return 'rgba(168, 85, 247, 0.6)'; // Purple
    if (label.includes('neo4j')) return 'rgba(34, 197, 94, 0.6)'; // Green
    if (label.includes('chromadb') || label.includes('chroma'))
      return 'rgba(236, 72, 153, 0.6)'; // Pink
    return 'rgba(255, 255, 255, 0.5)'; // Default white
  }

  constructor() {
    // Setup distance-based visibility check
    const v = new Vector3();

    injectBeforeRender(({ camera }) => {
      // Calculate distance from camera to marker
      const distance = camera.position.distanceTo(
        this.groupRef().nativeElement.getWorldPosition(v)
      );

      // Update range state if changed (15 units threshold for larger scene)
      const inRange = distance <= 15;
      if (inRange !== this.isInRange()) {
        this.isInRange.set(inRange);
      }
    });
  }
}
