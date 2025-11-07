/**
 * Angular 3D Directives
 *
 * Exports:
 * - Float3dDirective: GSAP floating animations
 * - ScrollAnimationDirective: Individual element scroll animations
 * - HijackedScrollDirective: Container for scroll-jacking sequences
 * - HijackedScrollItemDirective: Individual steps in hijacked scroll
 * - ScrollZoomCoordinatorDirective: Coordinates 3D zoom with page scroll
 * - Rotate3dDirective: GSAP rotation animations
 * - SpaceFlight3dDirective: Space flight path animations
 */

export { Float3dDirective } from './float-3d.directive';
export { ScrollAnimationDirective } from './scroll-animation.directive';
export {
  HijackedScrollDirective,
  type HijackedScrollConfig,
} from './hijacked-scroll.directive';
export {
  HijackedScrollItemDirective,
  type SlideDirection,
  type HijackedScrollItemConfig,
} from './hijacked-scroll-item.directive';
export {
  ScrollZoomCoordinatorDirective,
  type ScrollZoomState,
} from './scroll-zoom-coordinator.directive';
export { Rotate3dDirective } from './rotate-3d.directive';
export { SpaceFlight3dDirective } from './space-flight-3d.directive';
