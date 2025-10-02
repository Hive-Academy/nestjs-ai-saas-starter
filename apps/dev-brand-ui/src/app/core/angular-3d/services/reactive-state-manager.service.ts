/**
 * ReactiveStateManagerService - Enhanced Reactive State Integration
 *
 * Provides advanced reactive state management patterns for Angular Three components.
 * Extends the base Angular3DStateStore with component-specific reactive utilities,
 * event synchronization, and cross-component state coordination.
 */

import {
  Injectable,
  signal,
  computed,
  inject,
  effect,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject } from 'rxjs';
import { map, distinctUntilChanged, debounceTime, filter } from 'rxjs/operators';

import { Angular3DStateStore, type SceneObjectState, type AnimationState } from './angular-3d-state.store';

// Enhanced event types for reactive communication
export interface SceneGraphEvent {
  readonly type: 'node-added' | 'node-removed' | 'node-updated' | 'animation-started' | 'animation-stopped';
  readonly source: string; // component ID
  readonly target?: string; // target component ID
  readonly data: unknown;
  readonly timestamp: number;
}

export interface CrossComponentMessage {
  readonly from: string;
  readonly to: string;
  readonly action: string;
  readonly payload: unknown;
}

// Reactive query interfaces
export interface SceneQuery {
  readonly sceneId?: string;
  readonly objectType?: 'mesh' | 'group' | 'light' | 'camera';
  readonly visible?: boolean;
  readonly hasAnimation?: boolean;
  readonly parent?: string;
}

export interface ComponentRegistration {
  readonly componentId: string;
  readonly componentType: 'scene-node' | 'geometry-node' | 'hybrid-scene' | 'animation-demo';
  readonly sceneObjectId?: string;
  readonly isActive: boolean;
  readonly dependencies: readonly string[];
}

/**
 * Advanced Reactive State Management Service
 *
 * Provides reactive state patterns, component coordination,
 * and cross-component event communication for Angular Three applications.
 */
@Injectable({
  providedIn: 'root',
})
export class ReactiveStateManagerService {
  private readonly stateStore = inject(Angular3DStateStore);
  private readonly destroyRef = inject(DestroyRef);

  // Event streams for reactive communication
  private readonly eventBus$ = new Subject<SceneGraphEvent>();
  private readonly _componentMessages$ = new Subject<CrossComponentMessage>();

  // Component registry for coordination
  private readonly componentRegistry = signal<Record<string, ComponentRegistration>>({});

  // Reactive selectors and computed properties
  readonly activeComponents = computed(() => {
    return Object.values(this.componentRegistry()).filter(comp => comp.isActive);
  });

  readonly sceneObjectsByType = computed(() => {
    const state = this.stateStore.state();
    const activeScene = state.activeSceneId ? state.scenes[state.activeSceneId] : null;

    if (!activeScene) return {};

    const objects = Object.values(activeScene.objects);
    return objects.reduce((acc, obj) => {
      if (!acc[obj.type]) acc[obj.type] = [];
      acc[obj.type].push(obj);
      return acc;
    }, {} as Record<string, SceneObjectState[]>);
  });

  readonly animatedObjects = computed(() => {
    return Object.values(this.stateStore.state().animations)
      .filter(anim => anim.isPlaying)
      .map(anim => anim.target);
  });

  readonly performanceStatus = computed(() => {
    const performance = this.stateStore.state().performance;
    const componentCount = this.activeComponents().length;

    return {
      ...performance,
      componentCount,
      averageLoad: componentCount > 0 ? performance.drawCalls / componentCount : 0,
      isHealthy: performance.fps >= 30 && performance.frameTime < 33.33,
    };
  });

  // Observable streams for reactive subscriptions
  readonly events$ = this.eventBus$.asObservable();
  readonly componentMessages$ = this._componentMessages$.asObservable();

  readonly sceneUpdates$ = this.stateStore.getStateStream().pipe(
    map(state => state.scenes),
    distinctUntilChanged(),
    debounceTime(16) // Throttle to ~60fps
  );

  readonly animationUpdates$ = this.stateStore.getStateStream().pipe(
    map(state => state.animations),
    distinctUntilChanged(),
    debounceTime(32) // Throttle animation updates
  );

  readonly performanceUpdates$ = this.stateStore.getStateStream().pipe(
    map(state => state.performance),
    distinctUntilChanged(),
    debounceTime(100) // Performance updates every 100ms
  );

  constructor() {
    this.setupReactiveEffects();
    this.setupEventHandlers();
  }

  // Component registration and lifecycle management
  registerComponent(registration: ComponentRegistration): void {
    this.componentRegistry.update(registry => ({
      ...registry,
      [registration.componentId]: registration
    }));

    this.emitEvent({
      type: 'node-added',
      source: registration.componentId,
      data: registration,
    });
  }

  unregisterComponent(componentId: string): void {
    const registration = this.componentRegistry()[componentId];
    if (registration) {
      this.componentRegistry.update(registry => {
        const { [componentId]: removed, ...remaining } = registry;
        return remaining;
      });

      this.emitEvent({
        type: 'node-removed',
        source: componentId,
        data: registration,
      });

      // Clean up associated scene objects
      if (registration.sceneObjectId) {
        const activeSceneId = this.stateStore.state().activeSceneId;
        if (activeSceneId) {
          this.stateStore.removeSceneObject(activeSceneId, registration.sceneObjectId);
        }
      }
    }
  }

  updateComponent(componentId: string, updates: Partial<ComponentRegistration>): void {
    this.componentRegistry.update(registry => {
      const existing = registry[componentId];
      if (!existing) return registry;

      return {
        ...registry,
        [componentId]: { ...existing, ...updates }
      };
    });
  }

  // Query methods for component coordination
  querySceneObjects(query: SceneQuery): SceneObjectState[] {
    const state = this.stateStore.state();
    const sceneId = query.sceneId || state.activeSceneId;

    if (!sceneId || !state.scenes[sceneId]) return [];

    const objects = Object.values(state.scenes[sceneId].objects);

    return objects.filter(obj => {
      if (query.objectType && obj.type !== query.objectType) return false;
      if (query.visible !== undefined && obj.visible !== query.visible) return false;
      if (query.parent !== undefined && obj.parent !== query.parent) return false;
      if (query.hasAnimation) {
        const hasAnim = Object.values(state.animations).some(anim => anim.target === obj.id);
        if (!hasAnim) return false;
      }
      return true;
    });
  }

  getComponentDependencies(componentId: string): ComponentRegistration[] {
    const component = this.componentRegistry()[componentId];
    if (!component) return [];

    return component.dependencies
      .map(depId => this.componentRegistry()[depId])
      .filter(Boolean);
  }

  getComponentsByType(type: ComponentRegistration['componentType']): ComponentRegistration[] {
    return Object.values(this.componentRegistry()).filter(comp => comp.componentType === type);
  }

  // Event communication methods
  emitEvent(event: Omit<SceneGraphEvent, 'timestamp'>): void {
    this.eventBus$.next({
      ...(event as SceneGraphEvent),
      timestamp: Date.now(),
    });
  }

  sendMessage(message: CrossComponentMessage): void {
    this._componentMessages$.next(message);
  }

  // Reactive utilities for components
  createComponentEffect<T>(
    selector: () => T,
    callback: (value: T) => void,
    options: { debounce?: number; distinctUntilChanged?: boolean } = {}
  ): void {
    let lastValue: T | undefined;

    effect(() => {
      const value = selector();

      if (options.distinctUntilChanged && value === lastValue) return;

      if (options.debounce) {
        setTimeout(() => callback(value), options.debounce);
      } else {
        callback(value);
      }

      lastValue = value;
    });
  }

  // State synchronization utilities
  syncTransformWithStore(
    componentId: string,
    sceneObjectId: string,
    transform: () => { position: readonly [number, number, number], rotation: readonly [number, number, number], scale: readonly [number, number, number] }
  ): void {
    const activeSceneId = this.stateStore.state().activeSceneId;
    if (!activeSceneId) return;

    effect(() => {
      const currentTransform = transform();
      this.stateStore.updateSceneObject(activeSceneId, sceneObjectId, {
        position: currentTransform.position,
        rotation: currentTransform.rotation,
        scale: currentTransform.scale,
      });
    });
  }

  syncAnimationWithStore(
    componentId: string,
    animationId: string,
    animationState: () => { isPlaying: boolean, currentTime: number, duration: number }
  ): void {
    effect(() => {
      const state = animationState();
      this.stateStore.updateAnimation(animationId, {
        isPlaying: state.isPlaying,
        currentTime: state.currentTime,
        duration: state.duration,
      });
    });
  }

  // Observable factories for reactive streams
  createObjectStream(objectId: string): Observable<SceneObjectState | null> {
    return this.sceneUpdates$.pipe(
      map(scenes => {
        for (const scene of Object.values(scenes)) {
          if (scene.objects[objectId]) {
            return scene.objects[objectId];
          }
        }
        return null;
      }),
      distinctUntilChanged()
    );
  }

  createAnimationStream(animationId: string): Observable<AnimationState | null> {
    return this.animationUpdates$.pipe(
      map(animations => animations[animationId] || null),
      distinctUntilChanged()
    );
  }

  createComponentMessagesStream(componentId: string): Observable<CrossComponentMessage> {
    return this.componentMessages$.pipe(
      filter(message => message.to === componentId || message.to === '*')
    );
  }

  // Performance monitoring utilities
  trackComponentPerformance(
    componentId: string,
    metrics: () => { renderTime?: number; memoryUsage?: number; complexity?: number }
  ): void {
    effect(() => {
      const componentMetrics = metrics();

      // Emit performance event for monitoring
      this.emitEvent({
        type: 'node-updated',
        source: componentId,
        data: { type: 'performance', metrics: componentMetrics },
      });
    });
  }

  // Cleanup and resource management
  cleanup(): void {
    this.componentRegistry.set({});
    this.eventBus$.complete();
    this._componentMessages$.complete();
  }

  private setupReactiveEffects(): void {
    // Monitor component registry changes
    effect(() => {
      const components = this.activeComponents();

      // Emit global component count updates
      this.emitEvent({
        type: 'node-updated',
        source: 'reactive-state-manager',
        data: { type: 'component-count', count: components.length },
      });
    });

    // Monitor performance and emit warnings
    effect(() => {
      const performance = this.performanceStatus();

      if (!performance.isHealthy) {
        this.emitEvent({
          type: 'node-updated',
          source: 'reactive-state-manager',
          data: {
            type: 'performance-warning',
            fps: performance.fps,
            frameTime: performance.frameTime,
            componentCount: performance.componentCount
          },
        });
      }
    });
  }

  private setupEventHandlers(): void {
    // Handle component lifecycle events
    this.events$.pipe(
      takeUntilDestroyed(this.destroyRef),
      filter(event => event.type === 'node-added' || event.type === 'node-removed')
    ).subscribe(event => {
      // Additional cleanup or initialization based on component lifecycle
      if (event.type === 'node-removed') {
        // Perform any cross-component cleanup
        this.cleanupComponentDependencies(event.source);
      }
    });

    // Handle animation events
    this.events$.pipe(
      takeUntilDestroyed(this.destroyRef),
      filter(event => event.type === 'animation-started' || event.type === 'animation-stopped')
    ).subscribe(event => {
      // Coordinate animation states across components
      this.coordinateAnimations(event);
    });
  }

  private cleanupComponentDependencies(componentId: string): void {
    // Remove component from other components' dependency lists
    this.componentRegistry.update(registry => {
      const updated = { ...registry };

      Object.keys(updated).forEach(id => {
        if (updated[id].dependencies.includes(componentId)) {
          updated[id] = {
            ...updated[id],
            dependencies: updated[id].dependencies.filter(dep => dep !== componentId)
          };
        }
      });

      return updated;
    });
  }

  private coordinateAnimations(event: SceneGraphEvent): void {
    // Implement cross-component animation coordination logic
    const relatedComponents = this.getComponentsByType('geometry-node')
      .filter(comp => comp.isActive);

    // Could implement things like:
    // - Animation sequencing based on event.data
    // - Performance-based animation throttling
    // - Cross-component animation synchronization
    console.log(`Animation coordination for event: ${event.type} from ${event.source} - affecting ${relatedComponents.length} components`);
  }
}
