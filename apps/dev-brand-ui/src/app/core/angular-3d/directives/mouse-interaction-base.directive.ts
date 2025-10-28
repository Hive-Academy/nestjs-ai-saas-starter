/**
 * MouseInteractionDirective (Base Class)
 *
 * Abstract base class for all mouse interaction directives.
 * Provides common functionality for accessing Three.js objects and mouse tracking.
 *
 * Features:
 * - Automatic target object resolution (direct mesh or component wrapper)
 * - Mouse service integration
 * - Lifecycle management
 * - Original state preservation
 *
 * Usage:
 * ```typescript
 * @Directive({ selector: '[myMouseInteraction]' })
 * export class MyMouseInteractionDirective extends MouseInteractionDirective {
 *   protected setupInteraction(): void {
 *     injectBeforeRender(() => {
 *       const x = this.mouseService.smoothMouseX();
 *       const y = this.mouseService.smoothMouseY();
 *       // Apply transformation to this.targetObject
 *     });
 *   }
 * }
 * ```
 */

import {
  Directive,
  ElementRef,
  inject,
  afterNextRender,
  OnDestroy,
} from '@angular/core';
import * as THREE from 'three';
import { MouseInteractionService } from '../services/mouse-interaction.service';

@Directive()
export abstract class MouseInteractionDirective implements OnDestroy {
  protected readonly mouseService = inject(MouseInteractionService);
  protected readonly elementRef = inject(ElementRef);

  protected targetObject: THREE.Object3D | null = null;
  protected originalPosition: THREE.Vector3 | null = null;
  protected originalRotation: THREE.Euler | null = null;
  protected originalScale: THREE.Vector3 | null = null;

  constructor() {
    // Initialize mouse service (reference counted)
    this.mouseService.initialize();

    // Setup after render to ensure Three.js objects are created
    afterNextRender(() => {
      this.initializeTarget();
      if (this.targetObject) {
        this.setupInteraction();
      }
    });
  }

  ngOnDestroy(): void {
    // Decrement mouse service reference count
    this.mouseService.destroy();
  }

  /**
   * Setup the interaction (implemented by subclasses)
   * Called after targetObject is initialized
   */
  protected abstract setupInteraction(): void;

  /**
   * Initialize target Three.js object
   * Handles both direct ngt-mesh and component wrappers (e.g., app-planet)
   */
  protected initializeTarget(): void {
    const element = this.elementRef.nativeElement as any;

    // Case 1: Direct Three.js object (ngt-mesh, ngt-group, etc.)
    if (element instanceof THREE.Object3D) {
      this.targetObject = element;
      console.log(
        '[MouseInteraction] Case 1: Direct THREE.Object3D',
        element.type
      );
    }
    // Case 2: Component wrapper with getMesh() method (e.g., PlanetComponent)
    else if (typeof element.getMesh === 'function') {
      this.targetObject = element.getMesh();
      console.log('[MouseInteraction] Case 2: getMesh() method found');
    }
    // Case 3: Component wrapper with getObject3D() method (future compatibility)
    else if (typeof element.getObject3D === 'function') {
      this.targetObject = element.getObject3D();
      console.log('[MouseInteraction] Case 3: getObject3D() method found');
    }
    // Case 4: Angular component - drill into its children to find Three.js object
    else if (element.children && element.children.length > 0) {
      console.log('[MouseInteraction] Case 4: Searching children...', {
        childrenCount: element.children.length,
        firstChild: element.children[0],
      });

      // Search all children recursively
      this.targetObject = this.findThreeObject(element);
    }

    // Validation
    if (!this.targetObject) {
      console.warn(
        '[MouseInteraction] Could not find Three.js object for element',
        {
          element,
          elementType: element.constructor.name,
          hasChildren: !!element.children,
          childrenCount: element.children?.length,
        }
      );
      return;
    }

    // Store original state for restoration/reference
    this.storeOriginalState();

    console.log('[MouseInteraction] Initialized', {
      directive: this.constructor.name,
      objectType: this.targetObject.type,
      position: this.originalPosition,
    });
  }

  /**
   * Recursively search for Three.js object in element tree
   */
  private findThreeObject(element: any): THREE.Object3D | null {
    // Check if this element is a Three.js object
    if (element instanceof THREE.Object3D) {
      return element;
    }

    // Check children
    if (element.children && element.children.length > 0) {
      for (const child of element.children) {
        const found = this.findThreeObject(child);
        if (found) {
          return found;
        }
      }
    }

    // Check nativeElement (for Angular ElementRef)
    if (element.nativeElement) {
      return this.findThreeObject(element.nativeElement);
    }

    return null;
  }

  /**
   * Store original transform state
   */
  protected storeOriginalState(): void {
    if (!this.targetObject) return;

    this.originalPosition = this.targetObject.position.clone();
    this.originalRotation = this.targetObject.rotation.clone();
    this.originalScale = this.targetObject.scale.clone();
  }

  /**
   * Helper: Calculate depth factor for depth-scaled effects
   * Farther objects (higher Z) get less movement
   */
  protected calculateDepthFactor(baseDistance = 50): number {
    if (!this.originalPosition) return 1;

    const depth = Math.abs(this.originalPosition.z);
    return depth / baseDistance;
  }

  /**
   * Helper: Check if target object is valid
   */
  protected isTargetValid(): boolean {
    return (
      this.targetObject !== null &&
      this.targetObject.position !== undefined &&
      this.targetObject.rotation !== undefined &&
      this.targetObject.scale !== undefined
    );
  }
}
