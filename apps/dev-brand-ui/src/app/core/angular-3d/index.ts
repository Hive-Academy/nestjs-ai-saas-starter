// Components - Simplified Angular Three wrappers
export { Scene3DComponent } from './components/scene-3d.component';
export { FloatingSphereComponent } from './components/primitives/floating-sphere.component';
export { HybridTextMeshComponent } from './components/primitives/hybrid-text-mesh.component';
export { ParticleSystemComponent } from './components/primitives/particle-system.component';
export { BackgroundCubeComponent } from './components/primitives/background-cube.component';

// Directives - Keeping valuable GSAP animation support
export { Float3dDirective } from './directives/float-3d.directive';
export { MouseParallax3dDirective } from './directives/mouse-parallax-3d.directive';

// Services - Animation and texture rendering
export { AnimationService } from './services/animation.service';
export { DOMTextureRendererService } from './services/texture/dom-texture-renderer.service';
export { TextureFactoryService } from './services/texture/texture-factory.service';
