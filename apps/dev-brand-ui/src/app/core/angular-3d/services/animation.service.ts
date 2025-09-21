/**
 * AnimationService - Phase 2 Enhanced
 *
 * Modern Angular service for GSAP animation integration with Angular Three reactive patterns.
 * Follows Angular 20.1.6 best practices with signals, inject() function, and strict TypeScript.
 * Coordinates with Angular Three store for synchronized 3D animations.
 */

import { Injectable, signal, computed, effect } from '@angular/core';
import { gsap } from 'gsap';
import * as THREE from 'three';
import { injectStore } from 'angular-three';

// Animation Configuration Types with strict typing
export interface AnimationConfig {
  readonly type: 'fade' | 'slide' | 'scale' | 'rotate' | 'morph' | 'custom';
  readonly duration: number;
  readonly delay?: number;
  readonly ease?: string;
  readonly repeat?: number;
  readonly yoyo?: boolean;
  readonly autoplay?: boolean;
}

export interface ElementAnimationTarget {
  readonly elementId: string;
  readonly object3D?: THREE.Object3D;
  readonly domElement?: HTMLElement;
  readonly position?: readonly [number, number, number];
  readonly rotation?: readonly [number, number, number];
  readonly scale?: readonly [number, number, number];
  readonly opacity?: number;
}

export interface AnimationTimeline {
  readonly id: string;
  readonly name: string;
  readonly animations: readonly AnimationConfig[];
  readonly targets: readonly ElementAnimationTarget[];
  readonly loop?: boolean;
  readonly paused?: boolean;
}

export interface AnimationState {
  readonly isPlaying: boolean;
  readonly currentTime: number;
  readonly progress: number;
  readonly activeAnimations: readonly string[];
  readonly timelines: readonly AnimationTimeline[];
}

export interface PerformanceMetrics {
  readonly fps: number;
  readonly animationCount: number;
  readonly memoryUsage: number;
  readonly lastUpdateTime: number;
}

/**
 * Phase 2 Enhanced AnimationService with Angular Three Integration
 * Provides reactive animation state management with GSAP timeline integration
 */
@Injectable({
  providedIn: 'root'
})
export class AnimationService {
  // Angular Three store integration with optional injection
  private readonly ngtStore = injectStore({ optional: true });

  // Reactive state management with signals
  private readonly _animationState = signal<AnimationState>({
    isPlaying: false,
    currentTime: 0,
    progress: 0,
    activeAnimations: [],
    timelines: []
  });

  private readonly _performanceMetrics = signal<PerformanceMetrics>({
    fps: 60,
    animationCount: 0,
    memoryUsage: 0,
    lastUpdateTime: performance.now()
  });

  // Private state for GSAP management
  private readonly masterTimeline = gsap.timeline({ paused: true });
  private readonly activeTimelines = new Map<string, gsap.core.Timeline>();
  private readonly animationTargets = new Map<string, ElementAnimationTarget>();
  private performanceMonitor?: ReturnType<typeof setInterval>;

  // Readonly accessors following Angular best practices
  readonly animationState = this._animationState.asReadonly();
  readonly performanceMetrics = this._performanceMetrics.asReadonly();

  // Computed properties for reactive updates
  readonly isAnimating = computed(() => this.animationState().isPlaying);
  readonly animationProgress = computed(() => this.animationState().progress);
  readonly activeAnimationCount = computed(() => this.animationState().activeAnimations.length);

  readonly canPlayAnimations = computed(() => {
    const state = this.animationState();
    return state.timelines.length > 0 && !state.isPlaying;
  });

  readonly animationPerformanceStatus = computed(() => {
    const metrics = this.performanceMetrics();
    return {
      status: metrics.fps >= 55 ? 'excellent' : metrics.fps >= 30 ? 'good' : 'poor',
      recommendation: metrics.animationCount > 10 ? 'reduce-concurrent' : 'optimal'
    } as const;
  });

  constructor() {
    // Initialize GSAP with Angular Three coordinate system
    this.initializeGSAP();

    // Setup reactive effects for Angular Three integration
    this.setupReactiveEffects();

    // Start performance monitoring
    this.startPerformanceMonitoring();
  }

  /**
   * Create and register an animation timeline with Angular Three integration
   */
  createTimeline(config: Omit<AnimationTimeline, 'id'>): string {
    const timelineId = `timeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const timeline: AnimationTimeline = {
      id: timelineId,
      ...config
    };

    const gsapTimeline = gsap.timeline({
      paused: true,
      repeat: config.loop ? -1 : 0,
      onUpdate: () => this.updateTimelineProgress(timelineId),
      onComplete: () => this.onTimelineComplete(timelineId),
      onStart: () => this.onTimelineStart(timelineId),
    });

    this.activeTimelines.set(timelineId, gsapTimeline);
    this.updateAnimationState(state => ({
      ...state,
      timelines: [...state.timelines, timeline]
    }));

    return timelineId;
  }

  /**
   * Add animation to timeline with Three.js object integration
   */
  addAnimationToTimeline(
    timelineId: string,
    target: ElementAnimationTarget,
    config: AnimationConfig
  ): void {
    const timeline = this.activeTimelines.get(timelineId);
    if (!timeline) {
      console.warn(`Timeline ${timelineId} not found`);
      return;
    }

    // Register target for tracking
    this.animationTargets.set(target.elementId, target);

    // Create GSAP animation based on type and target
    this.createGSAPAnimation(timeline, target, config);
  }

  /**
   * Play timeline with performance optimization
   */
  playTimeline(timelineId: string): void {
    const timeline = this.activeTimelines.get(timelineId);
    if (!timeline) return;

    timeline.play();
    this.updateAnimationState(state => ({
      ...state,
      isPlaying: true,
      activeAnimations: [...state.activeAnimations, timelineId]
    }));
  }

  /**
   * Pause timeline
   */
  pauseTimeline(timelineId: string): void {
    const timeline = this.activeTimelines.get(timelineId);
    if (!timeline) return;

    timeline.pause();
    this.updateAnimationState(state => ({
      ...state,
      isPlaying: false,
      activeAnimations: state.activeAnimations.filter(id => id !== timelineId)
    }));
  }

  /**
   * Stop and reset timeline
   */
  stopTimeline(timelineId: string): void {
    const timeline = this.activeTimelines.get(timelineId);
    if (!timeline) return;

    timeline.progress(0).pause();
    this.updateAnimationState(state => ({
      ...state,
      isPlaying: false,
      progress: 0,
      activeAnimations: state.activeAnimations.filter(id => id !== timelineId)
    }));
  }

  /**
   * Remove timeline and cleanup resources
   */
  removeTimeline(timelineId: string): void {
    const timeline = this.activeTimelines.get(timelineId);
    if (timeline) {
      timeline.kill();
      this.activeTimelines.delete(timelineId);
    }

    this.updateAnimationState(state => ({
      ...state,
      timelines: state.timelines.filter(t => t.id !== timelineId),
      activeAnimations: state.activeAnimations.filter(id => id !== timelineId)
    }));
  }

  /**
   * Create coordinated animation with Angular Three store
   */
  createCoordinatedAnimation(
    sceneObjects: readonly THREE.Object3D[],
    config: AnimationConfig
  ): string {
    const timelineId = this.createTimeline({
      name: 'Coordinated Scene Animation',
      animations: [config],
      targets: sceneObjects.map((obj, index) => ({
        elementId: `scene-object-${index}`,
        object3D: obj
      }))
    });

    // Add animations for each scene object
    sceneObjects.forEach((obj, index) => {
      this.addAnimationToTimeline(timelineId, {
        elementId: `scene-object-${index}`,
        object3D: obj
      }, config);
    });

    return timelineId;
  }

  /**
   * Get timeline state for debugging
   */
  getTimelineState(timelineId: string): { progress: number; isActive: boolean } | null {
    const timeline = this.activeTimelines.get(timelineId);
    if (!timeline) return null;

    return {
      progress: timeline.progress(),
      isActive: timeline.isActive()
    };
  }

  /**
   * Direct GSAP animation for DOM elements (compatibility method)
   */
  animate(config: {
    element: HTMLElement;
    properties: any;
    duration: number;
    ease?: string;
    delay?: number;
    repeat?: number;
    yoyo?: boolean;
    from?: any;
  }): gsap.core.Tween {
    const tween = config.from
      ? gsap.fromTo(config.element, config.from, {
          ...config.properties,
          duration: config.duration,
          ease: config.ease || 'power2.out',
          delay: config.delay || 0,
          repeat: config.repeat || 0,
          yoyo: config.yoyo || false
        })
      : gsap.to(config.element, {
          ...config.properties,
          duration: config.duration,
          ease: config.ease || 'power2.out',
          delay: config.delay || 0,
          repeat: config.repeat || 0,
          yoyo: config.yoyo || false
        });

    // Track the animation
    this.trackActiveAnimations();
    return tween;
  }

  /**
   * Camera animation (compatibility method)
   */
  animateCamera(config: {
    position: [number, number, number];
    target: [number, number, number];
    duration: number;
  }): void {
    // This would typically work with Angular Three's camera
    // For now, we'll create a basic implementation
    console.log('Camera animation requested:', config);
  }

  /**
   * Kill all animations for a specific element (compatibility method)
   */
  kill(element: HTMLElement): void {
    gsap.killTweensOf(element);
    this.trackActiveAnimations();
  }

  /**
   * Update animation state for tracking
   */
  private trackActiveAnimations(): void {
    const activeAnimations = this.activeTimelines.size > 0 ? Array.from(this.activeTimelines.keys()) : [];

    this._animationState.update(state => ({
      ...state,
      activeAnimations,
      isPlaying: activeAnimations.length > 0
    }));
  }

  /**
   * Cleanup all animations and resources
   */
  dispose(): void {
    // Kill all GSAP timelines
    this.activeTimelines.forEach(timeline => timeline.kill());
    this.activeTimelines.clear();
    this.masterTimeline.kill();

    // Clear targets and stop monitoring
    this.animationTargets.clear();
    this.stopPerformanceMonitoring();

    // Reset state
    this._animationState.set({
      isPlaying: false,
      currentTime: 0,
      progress: 0,
      activeAnimations: [],
      timelines: []
    });
  }

  // Private methods

  private initializeGSAP(): void {
    // Configure GSAP for Angular Three coordinate system
    gsap.defaults({
      ease: "power2.out",
      duration: 1
    });

    // Set up GSAP plugins if needed
    // gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
  }

  private setupReactiveEffects(): void {
    // React to Angular Three store changes if available
    effect(() => {
      if (this.ngtStore) {
        const store = this.ngtStore;
        // Sync animation state with Angular Three scene state
        this.syncWithThreeStore(store);
      }
    });

    // Performance optimization effect
    effect(() => {
      const metrics = this.performanceMetrics();
      if (metrics.fps < 30) {
        this.optimizeAnimations();
      }
    });
  }

  private createGSAPAnimation(
    timeline: gsap.core.Timeline,
    target: ElementAnimationTarget,
    config: AnimationConfig
  ): void {
    const { object3D, domElement: _domElement } = target;
    const duration = config.duration / 1000; // Convert to seconds

    switch (config.type) {
      case 'fade':
        if (object3D && 'material' in object3D && object3D.material) {
          timeline.to((object3D.material as any), {
            opacity: target.opacity ?? 1,
            duration,
            delay: config.delay ? config.delay / 1000 : 0,
            ease: config.ease ?? "power2.out"
          });
        }
        break;

      case 'slide':
        if (object3D && target.position) {
          timeline.to(object3D.position, {
            x: target.position[0],
            y: target.position[1],
            z: target.position[2],
            duration,
            delay: config.delay ? config.delay / 1000 : 0,
            ease: config.ease ?? "power2.out"
          });
        }
        break;

      case 'scale':
        if (object3D && target.scale) {
          timeline.to(object3D.scale, {
            x: target.scale[0],
            y: target.scale[1],
            z: target.scale[2],
            duration,
            delay: config.delay ? config.delay / 1000 : 0,
            ease: config.ease ?? "back.out(1.7)"
          });
        }
        break;

      case 'rotate':
        if (object3D && target.rotation) {
          timeline.to(object3D.rotation, {
            x: target.rotation[0],
            y: target.rotation[1],
            z: target.rotation[2],
            duration,
            delay: config.delay ? config.delay / 1000 : 0,
            ease: config.ease ?? "power2.inOut"
          });
        }
        break;

      default:
        console.warn(`Animation type ${config.type} not implemented`);
    }
  }

  private syncWithThreeStore(store: any): void {
    // Implement synchronization with Angular Three store state
    // This would depend on the specific store structure
  }

  private optimizeAnimations(): void {
    // Implement animation optimization for performance
    const activeCount = this.activeAnimationCount();
    if (activeCount > 5) {
      // Reduce animation quality or pause non-critical animations
      console.warn('High animation load detected, optimizing performance');
    }
  }

  private updateTimelineProgress(timelineId: string): void {
    const timeline = this.activeTimelines.get(timelineId);
    if (!timeline) return;

    this.updateAnimationState(state => ({
      ...state,
      currentTime: performance.now(),
      progress: timeline.progress()
    }));
  }

  private onTimelineStart(timelineId: string): void {
    this.updateAnimationState(state => ({
      ...state,
      isPlaying: true,
      activeAnimations: Array.from(new Set([...state.activeAnimations, timelineId]))
    }));
  }

  private onTimelineComplete(timelineId: string): void {
    this.updateAnimationState(state => ({
      ...state,
      activeAnimations: state.activeAnimations.filter(id => id !== timelineId),
      isPlaying: state.activeAnimations.length > 1
    }));
  }

  private updateAnimationState(updater: (state: AnimationState) => AnimationState): void {
    this._animationState.update(updater);
  }

  private startPerformanceMonitoring(): void {
    let frameCount = 0;
    let lastTime = performance.now();

    this.performanceMonitor = setInterval(() => {
      frameCount++;
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / deltaTime);
        const animationCount = this.activeAnimationCount();
        const memoryUsage = (performance as any).memory
          ? Math.round((performance as any).memory.usedJSHeapSize / 1048576)
          : 0;

        this._performanceMetrics.set({
          fps,
          animationCount,
          memoryUsage,
          lastUpdateTime: currentTime
        });

        frameCount = 0;
        lastTime = currentTime;
      }
    }, 16); // ~60fps monitoring
  }

  private stopPerformanceMonitoring(): void {
    if (this.performanceMonitor) {
      clearInterval(this.performanceMonitor);
      this.performanceMonitor = undefined;
    }
  }
}
