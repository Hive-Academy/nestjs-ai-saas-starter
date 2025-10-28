/**
 * MouseFixedDirective - Explicitly Fixed (No Mouse Interaction)
 *
 * Marks an object as intentionally non-interactive with mouse movements.
 * This is a declarative opt-out directive for clarity in templates.
 *
 * While technically this directive does nothing (objects without interaction
 * directives are already fixed), having an explicit `mouseFixed` marker
 * improves code readability and makes intent clear.
 *
 * Benefits:
 * - Documents intent in template (this object SHOULD be fixed)
 * - Prevents accidental addition of interaction directives
 * - Makes interaction patterns visible at a glance
 * - Future-proof for global interaction defaults
 *
 * Usage:
 * ```html
 * <!-- Nebula explicitly marked as non-interactive -->
 * <app-nebula-volumetric mouseFixed />
 *
 * <!-- Background element that should stay still -->
 * <app-gradient-background mouseFixed />
 * ```
 *
 * Without this directive:
 * ```html
 * <!-- Is this object meant to be fixed, or did we forget to add interaction? -->
 * <app-nebula-volumetric />
 * ```
 */

import { Directive } from '@angular/core';

@Directive({
  selector: '[mouseFixed]',
  standalone: true,
})
export class MouseFixedDirective {
  constructor() {
    // This directive is intentionally a no-op marker
    // Its presence in the template serves as documentation
    console.log('[MouseFixed] Object marked as non-interactive');
  }
}
