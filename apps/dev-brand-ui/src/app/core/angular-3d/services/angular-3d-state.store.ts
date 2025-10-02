/**
 * Angular Three State Management Store
 *
 * Centralized reactive state management for Angular Three applications.
 * Uses Angular signals for reactive state and integrates with Angular Three store.
 * Follows Angular best practices with injectable services and signal-based patterns.
 */

import {
  Injectable,
  signal,
  computed,
  effect,
} from '@angular/core';
// import { takeUntilDestroyed } from '@angular/core/rxjs-interop'; // Commented out as unused
import * as THREE from 'three';
import { injectStore } from 'angular-three';
import { BehaviorSubject, Observable } from 'rxjs';

// State interfaces
export interface SceneState {
  readonly id: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly backgroundColor: number;
  readonly fog?: {
    type: 'linear' | 'exponential';
    color: number;
    near: number;
    far: number;
    density?: number;
  };
  readonly environment?: string;
  readonly objects: Record<string, SceneObjectState>;
}

export interface SceneObjectState {
  readonly id: string;
  readonly name: string;
  readonly type: 'mesh' | 'group' | 'light' | 'camera';
  readonly visible: boolean;
  readonly position: readonly [number, number, number];
  readonly rotation: readonly [number, number, number];
  readonly scale: readonly [number, number, number];
  readonly parent?: string;
  readonly children: readonly string[];
  readonly userData: Record<string, unknown>;
}

export interface CameraState {
  readonly type: 'perspective' | 'orthographic';
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  readonly fov?: number;
  readonly zoom: number;
  readonly near: number;
  readonly far: number;
  readonly isControlsEnabled: boolean;
}

export interface LightState {
  readonly id: string;
  readonly type: 'ambient' | 'directional' | 'point' | 'spot' | 'hemisphere';
  readonly color: number;
  readonly intensity: number;
  readonly position?: readonly [number, number, number];
  readonly target?: readonly [number, number, number];
  readonly castShadow: boolean;
}

export interface MaterialState {
  readonly id: string;
  readonly type: 'basic' | 'standard' | 'physical' | 'lambert' | 'phong';
  readonly color: number;
  readonly opacity: number;
  readonly transparent: boolean;
  readonly wireframe: boolean;
  readonly roughness?: number;
  readonly metalness?: number;
  readonly emissive?: number;
  readonly map?: string; // texture ID
}

export interface AnimationState {
  readonly id: string;
  readonly target: string; // object ID
  readonly isPlaying: boolean;
  readonly duration: number;
  readonly currentTime: number;
  readonly loop: boolean;
  readonly timeScale: number;
}

export interface PerformanceState {
  readonly fps: number;
  readonly frameTime: number;
  readonly memoryUsage: number;
  readonly drawCalls: number;
  readonly triangles: number;
  readonly geometries: number;
  readonly textures: number;
}

// Main application state interface
export interface Angular3DAppState {
  readonly scenes: Record<string, SceneState>;
  readonly activeSceneId: string | null;
  readonly camera: CameraState;
  readonly lights: Record<string, LightState>;
  readonly materials: Record<string, MaterialState>;
  readonly animations: Record<string, AnimationState>;
  readonly performance: PerformanceState;
  readonly isDebugMode: boolean;
}

// Initial state
const initialState: Angular3DAppState = {
  scenes: {},
  activeSceneId: null,
  camera: {
    type: 'perspective',
    position: [0, 0, 5],
    target: [0, 0, 0],
    fov: 75,
    zoom: 1,
    near: 0.1,
    far: 1000,
    isControlsEnabled: true,
  },
  lights: {},
  materials: {},
  animations: {},
  performance: {
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
  },
  isDebugMode: false,
};

/**
 * Angular Three Reactive State Store
 *
 * Centralized state management for Angular Three applications.
 * Provides reactive state management with Angular signals and
 * integrates with Angular Three's NgtStore.
 */
@Injectable({
  providedIn: 'root',
})
export class Angular3DStateStore {
  private readonly ngtStore = injectStore({ optional: true });
  // private readonly destroyRef = inject(DestroyRef); // Commented out as unused

  // Core state signals
  private readonly _state = signal<Angular3DAppState>(initialState);
  private readonly _lastUpdateTime = signal<number>(Date.now());

  // State update subject for reactive streams
  private readonly stateUpdates$ = new BehaviorSubject<Angular3DAppState>(initialState);

  // Public readonly state accessors
  readonly state = this._state.asReadonly();
  readonly lastUpdateTime = this._lastUpdateTime.asReadonly();

  // Computed selectors for common state slices
  readonly activeScene = computed(() => {
    const state = this._state();
    const activeId = state.activeSceneId;
    return activeId ? state.scenes[activeId] : null;
  });

  readonly sceneObjects = computed(() => {
    const scene = this.activeScene();
    return scene ? Object.values(scene.objects) : [];
  });

  readonly activeLights = computed(() => {
    return Object.values(this._state().lights);
  });

  readonly activeMaterials = computed(() => {
    return Object.values(this._state().materials);
  });

  readonly playingAnimations = computed(() => {
    return Object.values(this._state().animations).filter(anim => anim.isPlaying);
  });

  readonly isDebugMode = computed(() => this._state().isDebugMode);

  readonly performance = computed(() => this._state().performance);

  // Angular Three integration computed properties
  readonly ngtScene = computed(() => this.ngtStore?.get('scene') || null);
  readonly ngtCamera = computed(() => this.ngtStore?.get('camera') || null);
  readonly ngtRenderer = computed(() => this.ngtStore?.get('gl') || null);

  constructor() {
    // Set up reactive effects for Angular Three integration
    this.setupAngularThreeSync();

    // Set up performance monitoring
    this.setupPerformanceMonitoring();
  }

  // State update methods with immutable updates
  updateScene(sceneId: string, updates: Partial<Omit<SceneState, 'id'>>) {
    this._state.update(state => ({
      ...state,
      scenes: {
        ...state.scenes,
        [sceneId]: {
          ...state.scenes[sceneId],
          ...updates,
          id: sceneId,
        }
      }
    }));
    this.notifyStateChange();
  }

  addSceneObject(sceneId: string, objectState: SceneObjectState) {
    this._state.update(state => ({
      ...state,
      scenes: {
        ...state.scenes,
        [sceneId]: {
          ...state.scenes[sceneId],
          objects: {
            ...state.scenes[sceneId]?.objects || {},
            [objectState.id]: objectState
          }
        }
      }
    }));
    this.notifyStateChange();
  }

  updateSceneObject(sceneId: string, objectId: string, updates: Partial<Omit<SceneObjectState, 'id'>>) {
    this._state.update(state => {
      const scene = state.scenes[sceneId];
      if (!scene || !scene.objects[objectId]) return state;

      return {
        ...state,
        scenes: {
          ...state.scenes,
          [sceneId]: {
            ...scene,
            objects: {
              ...scene.objects,
              [objectId]: {
                ...scene.objects[objectId],
                ...updates,
                id: objectId,
              }
            }
          }
        }
      };
    });
    this.notifyStateChange();
  }

  removeSceneObject(sceneId: string, objectId: string) {
    this._state.update(state => {
      const scene = state.scenes[sceneId];
      if (!scene || !scene.objects[objectId]) return state;

      const { [objectId]: removed, ...remainingObjects } = scene.objects;

      return {
        ...state,
        scenes: {
          ...state.scenes,
          [sceneId]: {
            ...scene,
            objects: remainingObjects
          }
        }
      };
    });
    this.notifyStateChange();
  }

  updateCamera(updates: Partial<CameraState>) {
    this._state.update(state => ({
      ...state,
      camera: { ...state.camera, ...updates }
    }));
    this.notifyStateChange();
  }

  addLight(lightState: LightState) {
    this._state.update(state => ({
      ...state,
      lights: {
        ...state.lights,
        [lightState.id]: lightState
      }
    }));
    this.notifyStateChange();
  }

  updateLight(lightId: string, updates: Partial<Omit<LightState, 'id'>>) {
    this._state.update(state => {
      if (!state.lights[lightId]) return state;

      return {
        ...state,
        lights: {
          ...state.lights,
          [lightId]: {
            ...state.lights[lightId],
            ...updates,
            id: lightId,
          }
        }
      };
    });
    this.notifyStateChange();
  }

  removeLight(lightId: string) {
    this._state.update(state => {
      const { [lightId]: removed, ...remainingLights } = state.lights;
      return {
        ...state,
        lights: remainingLights
      };
    });
    this.notifyStateChange();
  }

  addMaterial(materialState: MaterialState) {
    this._state.update(state => ({
      ...state,
      materials: {
        ...state.materials,
        [materialState.id]: materialState
      }
    }));
    this.notifyStateChange();
  }

  updateMaterial(materialId: string, updates: Partial<Omit<MaterialState, 'id'>>) {
    this._state.update(state => {
      if (!state.materials[materialId]) return state;

      return {
        ...state,
        materials: {
          ...state.materials,
          [materialId]: {
            ...state.materials[materialId],
            ...updates,
            id: materialId,
          }
        }
      };
    });
    this.notifyStateChange();
  }

  addAnimation(animationState: AnimationState) {
    this._state.update(state => ({
      ...state,
      animations: {
        ...state.animations,
        [animationState.id]: animationState
      }
    }));
    this.notifyStateChange();
  }

  updateAnimation(animationId: string, updates: Partial<Omit<AnimationState, 'id'>>) {
    this._state.update(state => {
      if (!state.animations[animationId]) return state;

      return {
        ...state,
        animations: {
          ...state.animations,
          [animationId]: {
            ...state.animations[animationId],
            ...updates,
            id: animationId,
          }
        }
      };
    });
    this.notifyStateChange();
  }

  updatePerformance(updates: Partial<PerformanceState>) {
    this._state.update(state => ({
      ...state,
      performance: { ...state.performance, ...updates }
    }));
    // Don't notify for performance updates to avoid spam
  }

  setActiveScene(sceneId: string | null) {
    this._state.update(state => ({
      ...state,
      activeSceneId: sceneId
    }));
    this.notifyStateChange();
  }

  toggleDebugMode() {
    this._state.update(state => ({
      ...state,
      isDebugMode: !state.isDebugMode
    }));
    this.notifyStateChange();
  }

  // Observable stream for reactive subscriptions
  getStateStream(): Observable<Angular3DAppState> {
    return this.stateUpdates$.asObservable();
  }

  // Utility methods
  createScene(id: string, name: string, config?: Partial<SceneState>): SceneState {
    const sceneState: SceneState = {
      id,
      name,
      isActive: false,
      backgroundColor: 0x000000,
      objects: {},
      ...config,
    };

    this._state.update(state => ({
      ...state,
      scenes: {
        ...state.scenes,
        [id]: sceneState
      }
    }));

    this.notifyStateChange();
    return sceneState;
  }

  // Reset state to initial
  reset() {
    this._state.set(initialState);
    this.notifyStateChange();
  }

  private notifyStateChange() {
    this._lastUpdateTime.set(Date.now());
    this.stateUpdates$.next(this._state());
  }

  private setupAngularThreeSync() {
    // Sync Angular Three store changes with our state
    effect(() => {
      const ngtScene = this.ngtScene();
      const ngtCamera = this.ngtCamera();

      if (ngtScene && ngtCamera) {
        // Update camera state from Angular Three
        if (ngtCamera instanceof THREE.PerspectiveCamera) {
          this.updateCamera({
            type: 'perspective',
            position: [ngtCamera.position.x, ngtCamera.position.y, ngtCamera.position.z],
            fov: ngtCamera.fov,
            near: ngtCamera.near,
            far: ngtCamera.far,
          });
        }
      }
    }, { allowSignalWrites: true });
  }

  private setupPerformanceMonitoring() {
    let frameCount = 0;
    let lastTime = performance.now();

    const updatePerformanceStats = () => {
      frameCount++;
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= 1000) { // Update every second
        const fps = Math.round((frameCount * 1000) / deltaTime);
        const frameTime = deltaTime / frameCount;

        this.updatePerformance({
          fps,
          frameTime,
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        });

        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(updatePerformanceStats);
    };

    requestAnimationFrame(updatePerformanceStats);
  }
}
