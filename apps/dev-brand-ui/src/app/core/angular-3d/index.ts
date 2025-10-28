// Components - Simplified Angular Three wrappers
export { Scene3DComponent } from './components/scene-3d.component';
export { FloatingSphereComponent } from './components/primitives/floating-sphere.component';
export { ParticleSystemComponent } from './components/primitives/particle-system.component';
export { BackgroundCubeComponent } from './components/primitives/background-cube.component';
export { Text3DComponent } from './components/primitives/text-3d.component';

// Directives - GSAP animation + Mouse interactions
export { Float3dDirective } from './directives/float-3d.directive';

// Mouse Interaction System - Composable element-level directives
export { MouseParallaxDirective } from './directives/mouse-parallax.directive';
export { MouseRotationDirective } from './directives/mouse-rotation.directive';
export { MouseHoverDirective } from './directives/mouse-hover.directive';
export { MouseFixedDirective } from './directives/mouse-fixed.directive';

// Services - Animation & Mouse tracking
export { AnimationService } from './services/animation.service';
export { MouseInteractionService } from './services/mouse-interaction.service';

// Types - Mouse interaction configuration
export type {
  ParallaxConfig,
  RotationConfig,
  HoverConfig,
  NormalizedMousePosition,
  SmoothedMousePosition,
} from './types/mouse-interaction.types';
