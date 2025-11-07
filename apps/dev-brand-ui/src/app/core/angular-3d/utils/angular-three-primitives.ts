/**
 * Angular Three Primitives Registration
 *
 * This file registers THREE.js classes with Angular Three's extend() function,
 * making them available as ngt-* elements in component templates.
 *
 * Usage:
 * 1. Import this file in your component or at app level
 * 2. Call registerAngularThreePrimitives() before using ngt-* elements
 * 3. Use CUSTOM_ELEMENTS_SCHEMA in component metadata
 *
 * @example
 * ```typescript
 * import { registerAngularThreePrimitives } from './utils/angular-three-primitives';
 *
 * // Call once at app initialization
 * registerAngularThreePrimitives();
 *
 * // Then use in templates:
 * <ngt-mesh [position]="[0, 0, 0]">
 *   <ngt-sphere-geometry [args]="[1, 32, 32]" />
 *   <ngt-mesh-standard-material [color]="0xff0000" />
 * </ngt-mesh>
 * ```
 */

import { extend } from 'angular-three';
import * as THREE from 'three';

/**
 * Track if primitives have been registered to avoid duplicate registration
 */
let primitivesRegistered = false;

/**
 * Register THREE.js classes with Angular Three
 *
 * This function should be called once at application initialization
 * or before first use of Angular Three primitives.
 *
 * Registered classes become available as ngt-* elements:
 * - THREE.Mesh → ngt-mesh
 * - THREE.SphereGeometry → ngt-sphere-geometry
 * - THREE.BoxGeometry → ngt-box-geometry
 * - THREE.MeshStandardMaterial → ngt-mesh-standard-material
 * - etc.
 */
export function registerAngularThreePrimitives(): void {
  if (primitivesRegistered) {
    // console.log('[Angular Three] Primitives already registered, skipping');
    return;
  }

  // console.log('[Angular Three] Registering THREE.js primitives...');

  // Register core objects
  extend({
    // Object3D and hierarchy
    Object3D: THREE.Object3D,
    Group: THREE.Group,
    Scene: THREE.Scene,

    // Mesh and geometry
    Mesh: THREE.Mesh,
    InstancedMesh: THREE.InstancedMesh,
    SkinnedMesh: THREE.SkinnedMesh,

    // Base geometry classes
    BufferGeometry: THREE.BufferGeometry,
    BufferAttribute: THREE.BufferAttribute,

    // Primitive geometries
    SphereGeometry: THREE.SphereGeometry,
    BoxGeometry: THREE.BoxGeometry,
    CylinderGeometry: THREE.CylinderGeometry,
    TorusGeometry: THREE.TorusGeometry,
    PlaneGeometry: THREE.PlaneGeometry,
    CircleGeometry: THREE.CircleGeometry,
    ConeGeometry: THREE.ConeGeometry,
    RingGeometry: THREE.RingGeometry,
    TubeGeometry: THREE.TubeGeometry,
    IcosahedronGeometry: THREE.IcosahedronGeometry,
    OctahedronGeometry: THREE.OctahedronGeometry,
    TetrahedronGeometry: THREE.TetrahedronGeometry,
    DodecahedronGeometry: THREE.DodecahedronGeometry,

    // Materials
    MeshStandardMaterial: THREE.MeshStandardMaterial,
    MeshPhysicalMaterial: THREE.MeshPhysicalMaterial,
    MeshBasicMaterial: THREE.MeshBasicMaterial,
    MeshLambertMaterial: THREE.MeshLambertMaterial,
    MeshPhongMaterial: THREE.MeshPhongMaterial,
    MeshToonMaterial: THREE.MeshToonMaterial,
    MeshNormalMaterial: THREE.MeshNormalMaterial,
    MeshMatcapMaterial: THREE.MeshMatcapMaterial,
    PointsMaterial: THREE.PointsMaterial,
    LineBasicMaterial: THREE.LineBasicMaterial,
    LineDashedMaterial: THREE.LineDashedMaterial,
    ShaderMaterial: THREE.ShaderMaterial,
    RawShaderMaterial: THREE.RawShaderMaterial,

    // Lights
    AmbientLight: THREE.AmbientLight,
    DirectionalLight: THREE.DirectionalLight,
    PointLight: THREE.PointLight,
    SpotLight: THREE.SpotLight,
    HemisphereLight: THREE.HemisphereLight,
    RectAreaLight: THREE.RectAreaLight,
    Fog: THREE.Fog,
    FogExp2: THREE.FogExp2,
    // Cameras
    PerspectiveCamera: THREE.PerspectiveCamera,
    OrthographicCamera: THREE.OrthographicCamera,

    // Helpers (useful for debugging)
    AxesHelper: THREE.AxesHelper,
    GridHelper: THREE.GridHelper,
    DirectionalLightHelper: THREE.DirectionalLightHelper,
    PointLightHelper: THREE.PointLightHelper,
    SpotLightHelper: THREE.SpotLightHelper,
    BoxHelper: THREE.BoxHelper,

    // Points and Lines
    Points: THREE.Points,
    Line: THREE.Line,
    LineLoop: THREE.LineLoop,
    LineSegments: THREE.LineSegments,

    // Sprites
    Sprite: THREE.Sprite,
    SpriteMaterial: THREE.SpriteMaterial,

    // Texture and maps
    Texture: THREE.Texture,
    CanvasTexture: THREE.CanvasTexture,
    VideoTexture: THREE.VideoTexture,
    DataTexture: THREE.DataTexture,
    CubeTexture: THREE.CubeTexture,
  });

  primitivesRegistered = true;
  console.log('[Angular Three] ✓ THREE.js primitives registered successfully');
}

/**
 * Check if primitives have been registered
 */
export function arePrimitivesRegistered(): boolean {
  return primitivesRegistered;
}

/**
 * Reset registration state (useful for testing)
 */
export function resetPrimitivesRegistration(): void {
  primitivesRegistered = false;
  console.log('[Angular Three] Primitives registration reset');
}
