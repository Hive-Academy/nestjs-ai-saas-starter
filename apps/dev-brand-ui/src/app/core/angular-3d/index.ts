// Components - Simplified Angular Three wrappers
export { Scene3DComponent } from './components/scene-3d.component';
export { FloatingSphereComponent } from './components/primitives/floating-sphere.component';
export { ParticleSystemComponent } from './components/primitives/particle-system.component';
export { BackgroundCubeComponent } from './components/primitives/background-cube.component';
export { Text3DComponent } from './components/primitives/text-3d.component';
export { SmokeParticleTextComponent } from './components/primitives/smoke-particle-text.component';
export { GlowParticleTextComponent } from './components/primitives/glow-particle-text.component';

// Directives - GSAP animation
export { Float3dDirective } from './directives/float-3d.directive';
export {
  SpaceFlight3dDirective,
  type SpaceFlightWaypoint,
  type SpaceFlightConfig,
} from './directives/space-flight-3d.directive';

// Services - Animation
export { AnimationService } from './services/animation.service';

// Configuration - Colors
export {
  Colors3D,
  cssToHex,
  hexToCss,
  type Color3DHex,
  type Color3DCSS,
} from './config/colors.config';
