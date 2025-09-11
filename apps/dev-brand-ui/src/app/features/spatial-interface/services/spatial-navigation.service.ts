import { Injectable, signal, computed, inject } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// Using Three.js built-in animation capabilities instead of GSAP for now
// import { GSAP } from 'gsap';
import { ThreeIntegrationService } from '../../../core/services/three-integration.service';

export interface SpatialNavigationConfig {
  sceneId: string;
  enableMomentum: boolean;
  enableKeyboardControls: boolean;
  enableTouchControls: boolean;
  enableCameraStateStorage: boolean;
  momentumDecay: number;
  maxMoveSpeed: number;
  cameraLimits: {
    minDistance: number;
    maxDistance: number;
    minPolarAngle: number;
    maxPolarAngle: number;
  };
  focusTransition: {
    duration: number;
    easing: string;
  };
}

export interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
  zoom: number;
  timestamp: number;
}

export interface NavigationTarget {
  position: THREE.Vector3;
  target: THREE.Vector3;
  distance?: number;
}

/**
 * Spatial Navigation Service
 * Provides enhanced camera controls with momentum, cinematic transitions,
 * and device-optimized interaction for the 3D constellation interface
 */
@Injectable({
  providedIn: 'root',
})
export class SpatialNavigationService {
  private readonly threeService = inject(ThreeIntegrationService);

  // Service state
  private readonly isInitialized = signal(false);
  private readonly isAnimating = signal(false);
  private readonly cameraStates = signal<CameraState[]>([]);

  // Configuration
  private config: SpatialNavigationConfig | null = null;
  private controls: OrbitControls | null = null;
  private camera: THREE.Camera | null = null;
  private container: HTMLElement | null = null;

  // Enhanced navigation state
  private momentum = new THREE.Vector3();
  private keyboardState = new Map<string, boolean>();

  // Touch handling
  private touchStartDistance = 0;
  private touchStartPosition = new THREE.Vector2();

  // Event handler references for cleanup
  private handleKeyDown!: (event: KeyboardEvent) => void;
  private handleKeyUp!: (event: KeyboardEvent) => void;
  private handleTouchStart!: (event: TouchEvent) => void;
  private handleTouchMove!: (event: TouchEvent) => void;
  private handleTouchEnd!: (event: TouchEvent) => void;
  private lastTouchTime = 0;

  // Animation handling
  private animationId: number | null = null;
  private animationStartTime = 0;
  private animationDuration = 0;
  private animationStartPosition = new THREE.Vector3();
  private animationStartTarget = new THREE.Vector3();
  private animationEndPosition = new THREE.Vector3();
  private animationEndTarget = new THREE.Vector3();
  private animationResolver: (() => void) | null = null;

  // Public reactive state
  readonly isNavigating = computed(
    () => this.isAnimating() || this.momentum.length() > 0.001
  );
  readonly currentCameraState = computed(() => {
    const states = this.cameraStates();
    return states.length > 0 ? states[states.length - 1] : null;
  });

  /**
   * Initialize spatial navigation system
   */
  initialize(config: SpatialNavigationConfig): void {
    if (this.isInitialized()) {
      console.warn('SpatialNavigationService already initialized');
      return;
    }

    this.config = config;

    const sceneInstance = this.threeService.getScene(config.sceneId);
    if (!sceneInstance) {
      throw new Error(`Scene ${config.sceneId} not found`);
    }

    this.camera = sceneInstance.camera;
    this.container = sceneInstance.container;

    this.setupEnhancedControls();
    this.setupKeyboardControls();
    this.setupTouchControls();
    this.setupAnimationLoop();
    this.loadCameraState();

    this.isInitialized.set(true);
    console.log('SpatialNavigationService initialized with enhanced controls');
  }

  /**
   * Focus camera on specific target with cinematic transition
   */
  focusOnTarget(target: NavigationTarget): Promise<void> {
    if (!this.camera || !this.config) {
      return Promise.reject('Navigation service not initialized');
    }

    this.isAnimating.set(true);

    return new Promise((resolve) => {
      this.animationStartPosition.copy(this.camera!.position);
      this.animationStartTarget.copy(
        this.controls?.target || new THREE.Vector3()
      );

      // Calculate optimal camera position for target
      this.animationEndPosition.copy(
        this.calculateOptimalCameraPosition(target)
      );
      this.animationEndTarget.copy(target.target);

      this.animationStartTime = Date.now();
      this.animationDuration = this.config?.focusTransition.duration
        ? this.config.focusTransition.duration * 1000
        : 1000; // Convert to milliseconds
      this.animationResolver = () => {
        this.isAnimating.set(false);
        this.saveCameraState();
        resolve();
      };
    });
  }

  /**
   * Move camera to specific position with smooth transition
   */
  moveToPosition(
    position: THREE.Vector3,
    target?: THREE.Vector3,
    duration = 1.0
  ): Promise<void> {
    if (!this.camera || !this.controls) {
      return Promise.reject('Navigation service not initialized');
    }

    this.isAnimating.set(true);

    return new Promise((resolve) => {
      this.animationStartPosition.copy(this.camera!.position);
      this.animationStartTarget.copy(this.controls!.target);

      this.animationEndPosition.copy(position);
      this.animationEndTarget.copy(target || this.controls!.target);

      this.animationStartTime = Date.now();
      this.animationDuration = duration * 1000; // Convert to milliseconds
      this.animationResolver = () => {
        this.isAnimating.set(false);
        this.saveCameraState();
        resolve();
      };
    });
  }

  /**
   * Enable or disable momentum-based movement
   */
  setMomentumEnabled(enabled: boolean): void {
    if (this.config) {
      this.config.enableMomentum = enabled;
      if (!enabled) {
        this.momentum.set(0, 0, 0);
      }
    }
  }

  /**
   * Get current camera distance from target
   */
  getCameraDistance(): number {
    if (!this.camera || !this.controls) return 0;
    return this.camera.position.distanceTo(this.controls.target);
  }

  /**
   * Set camera distance with smooth transition
   */
  setCameraDistance(distance: number, duration = 0.5): Promise<void> {
    if (!this.camera || !this.controls) {
      return Promise.reject('Navigation service not initialized');
    }

    const direction = this.camera.position
      .clone()
      .sub(this.controls.target)
      .normalize();

    const targetPosition = this.controls.target
      .clone()
      .add(direction.multiplyScalar(distance));

    return this.moveToPosition(targetPosition, this.controls.target, duration);
  }

  /**
   * Reset camera to default position
   */
  resetCamera(): Promise<void> {
    const defaultPosition = new THREE.Vector3(0, 5, 15);
    const defaultTarget = new THREE.Vector3(0, 0, 0);
    return this.moveToPosition(defaultPosition, defaultTarget, 1.5);
  }

  /**
   * Get navigation state for debugging
   */
  getNavigationState() {
    return {
      isInitialized: this.isInitialized(),
      isAnimating: this.isAnimating(),
      isNavigating: this.isNavigating(),
      momentum: this.momentum.clone(),
      cameraDistance: this.getCameraDistance(),
      keyboardState: Object.fromEntries(this.keyboardState),
    };
  }

  /**
   * Clean up navigation service
   */
  cleanup(): void {
    this.stopAnimation();
    this.saveCameraState();
    this.removeEventListeners();

    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }

    this.momentum.set(0, 0, 0);
    this.keyboardState.clear();
    this.isInitialized.set(false);

    console.log('SpatialNavigationService cleaned up');
  }

  /**
   * Setup enhanced orbit controls with momentum
   */
  private setupEnhancedControls(): void {
    if (!this.camera || !this.container || !this.config) return;

    this.controls = new OrbitControls(this.camera, this.container);

    // Basic orbit controls configuration
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.autoRotate = false;

    // Apply camera limits
    const limits = this.config.cameraLimits;
    this.controls.minDistance = limits.minDistance;
    this.controls.maxDistance = limits.maxDistance;
    this.controls.minPolarAngle = limits.minPolarAngle;
    this.controls.maxPolarAngle = limits.maxPolarAngle;

    // Set default target
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    // Enhanced momentum handling
    if (this.config.enableMomentum) {
      this.setupMomentumSystem();
    }

    console.log('Enhanced OrbitControls configured');
  }

  /**
   * Setup momentum-based movement system
   */
  private setupMomentumSystem(): void {
    if (!this.controls) return;

    let lastControlsChange = 0;
    let isDragging = false;

    // Track control changes for momentum
    this.controls.addEventListener('change', () => {
      lastControlsChange = Date.now();
      if (isDragging && this.config?.enableMomentum) {
        // Calculate momentum based on recent movement
        const now = Date.now();
        const deltaTime = (now - lastControlsChange) / 1000;

        if (deltaTime > 0) {
          // Simple momentum calculation - can be enhanced
          const speed = Math.min(1 / deltaTime, this.config.maxMoveSpeed);
          this.momentum.multiplyScalar(0.95).addScalar(speed * 0.01);
        }
      }
    });

    this.controls.addEventListener('start', () => {
      isDragging = true;
      this.momentum.set(0, 0, 0);
    });

    this.controls.addEventListener('end', () => {
      isDragging = false;
    });
  }

  /**
   * Setup keyboard navigation controls
   */
  private setupKeyboardControls(): void {
    if (!this.config?.enableKeyboardControls || !this.container) return;

    this.handleKeyDown = (event: KeyboardEvent) => {
      this.keyboardState.set(event.code, true);

      // Prevent default for navigation keys
      if (this.isNavigationKey(event.code)) {
        event.preventDefault();
      }
    };

    this.handleKeyUp = (event: KeyboardEvent) => {
      this.keyboardState.set(event.code, false);
    };

    // Focus container to receive keyboard events
    this.container.tabIndex = 0;
    this.container.addEventListener('keydown', this.handleKeyDown);
    this.container.addEventListener('keyup', this.handleKeyUp);

    console.log('Keyboard navigation controls enabled');
  }

  /**
   * Setup touch gesture controls for mobile/tablet
   */
  private setupTouchControls(): void {
    if (!this.config?.enableTouchControls || !this.container) return;

    this.handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        this.touchStartPosition.set(
          event.touches[0].clientX,
          event.touches[0].clientY
        );
      } else if (event.touches.length === 2) {
        const dx = event.touches[0].clientX - event.touches[1].clientX;
        const dy = event.touches[0].clientY - event.touches[1].clientY;
        this.touchStartDistance = Math.sqrt(dx * dx + dy * dy);
      }
      this.lastTouchTime = Date.now();
    };

    this.handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2 && this.controls) {
        // Pinch-to-zoom gesture
        const dx = event.touches[0].clientX - event.touches[1].clientX;
        const dy = event.touches[0].clientY - event.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (this.touchStartDistance > 0) {
          const scale = distance / this.touchStartDistance;
          const currentDistance = this.getCameraDistance();
          const newDistance = Math.max(
            this.config!.cameraLimits.minDistance,
            Math.min(
              this.config!.cameraLimits.maxDistance,
              currentDistance / scale
            )
          );

          // Apply zoom smoothly
          this.setCameraDistance(newDistance, 0.1);
        }
      }
    };

    this.handleTouchEnd = (event: TouchEvent) => {
      const touchDuration = Date.now() - this.lastTouchTime;

      // Double-tap detection for focus
      if (touchDuration < 300 && event.changedTouches.length === 1) {
        // Could trigger focus on agent if one is under touch point
        // This would integrate with the raycasting system
      }
    };

    this.container.addEventListener('touchstart', this.handleTouchStart);
    this.container.addEventListener('touchmove', this.handleTouchMove);
    this.container.addEventListener('touchend', this.handleTouchEnd);

    console.log('Touch gesture controls enabled');
  }

  /**
   * Setup animation loop for smooth movement and momentum
   */
  private setupAnimationLoop(): void {
    const animate = () => {
      this.updateAnimations();
      this.updateKeyboardMovement();
      this.updateMomentum();
      this.updateControls();

      this.animationId = requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Update animations (camera transitions)
   */
  private updateAnimations(): void {
    if (!this.isAnimating() || !this.camera || !this.controls) return;

    const now = Date.now();
    const elapsed = now - this.animationStartTime;
    const progress = Math.min(elapsed / this.animationDuration, 1);

    // Use smooth easing function (similar to power2.inOut)
    const eased =
      progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Interpolate camera position
    this.camera.position.lerpVectors(
      this.animationStartPosition,
      this.animationEndPosition,
      eased
    );

    // Interpolate camera target
    this.controls.target.lerpVectors(
      this.animationStartTarget,
      this.animationEndTarget,
      eased
    );

    // Check if animation is complete
    if (progress >= 1) {
      this.camera.position.copy(this.animationEndPosition);
      this.controls.target.copy(this.animationEndTarget);

      if (this.animationResolver) {
        const resolver = this.animationResolver;
        this.animationResolver = null;
        resolver();
      }
    }
  }

  /**
   * Update keyboard-based movement
   */
  private updateKeyboardMovement(): void {
    if (!this.config?.enableKeyboardControls || !this.controls) return;

    const moveSpeed = 0.1;

    // Get camera direction vectors
    const camera = this.camera as THREE.PerspectiveCamera;
    const direction = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    camera.getWorldDirection(direction);
    right.crossVectors(direction, up).normalize();

    // Movement controls
    if (this.keyboardState.get('KeyW') || this.keyboardState.get('ArrowUp')) {
      this.controls.target.add(direction.clone().multiplyScalar(moveSpeed));
      camera.position.add(direction.clone().multiplyScalar(moveSpeed));
    }

    if (this.keyboardState.get('KeyS') || this.keyboardState.get('ArrowDown')) {
      this.controls.target.sub(direction.clone().multiplyScalar(moveSpeed));
      camera.position.sub(direction.clone().multiplyScalar(moveSpeed));
    }

    if (this.keyboardState.get('KeyA') || this.keyboardState.get('ArrowLeft')) {
      this.controls.target.sub(right.clone().multiplyScalar(moveSpeed));
      camera.position.sub(right.clone().multiplyScalar(moveSpeed));
    }

    if (
      this.keyboardState.get('KeyD') ||
      this.keyboardState.get('ArrowRight')
    ) {
      this.controls.target.add(right.clone().multiplyScalar(moveSpeed));
      camera.position.add(right.clone().multiplyScalar(moveSpeed));
    }

    // Zoom controls
    if (this.keyboardState.get('KeyQ')) {
      const distance = this.getCameraDistance();
      this.setCameraDistance(
        Math.max(this.config.cameraLimits.minDistance, distance * 0.95),
        0.1
      );
    }

    if (this.keyboardState.get('KeyE')) {
      const distance = this.getCameraDistance();
      this.setCameraDistance(
        Math.min(this.config.cameraLimits.maxDistance, distance * 1.05),
        0.1
      );
    }
  }

  /**
   * Update momentum-based smooth movement
   */
  private updateMomentum(): void {
    if (!this.config?.enableMomentum || this.momentum.length() < 0.001) return;

    // Apply momentum decay
    this.momentum.multiplyScalar(this.config.momentumDecay);

    // Apply momentum to camera (very subtle effect)
    if (this.controls && this.momentum.length() > 0.001) {
      this.controls.target.add(this.momentum.clone().multiplyScalar(0.01));
      this.controls.update();
    }
  }

  /**
   * Update orbit controls
   */
  private updateControls(): void {
    if (this.controls) {
      this.controls.update();
    }
  }

  /**
   * Calculate optimal camera position for focusing on target
   */
  private calculateOptimalCameraPosition(
    target: NavigationTarget
  ): THREE.Vector3 {
    const distance = target.distance || 8; // Default focus distance

    // Get current camera direction or use default
    let direction = new THREE.Vector3(0, 1, 1).normalize();

    if (this.camera) {
      direction = this.camera.position.clone().sub(target.target).normalize();
    }

    return target.target.clone().add(direction.multiplyScalar(distance));
  }

  /**
   * Check if key code is used for navigation
   */
  private isNavigationKey(code: string): boolean {
    const navigationKeys = [
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'KeyQ',
      'KeyE',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
    ];
    return navigationKeys.includes(code);
  }

  /**
   * Save current camera state to local storage
   */
  private saveCameraState(): void {
    if (
      !this.config?.enableCameraStateStorage ||
      !this.camera ||
      !this.controls
    )
      return;

    const state: CameraState = {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
      zoom: this.getCameraDistance(),
      timestamp: Date.now(),
    };

    try {
      const states = this.cameraStates();
      const newStates = [...states, state].slice(-10); // Keep last 10 states
      this.cameraStates.set(newStates);

      localStorage.setItem(
        `spatialNavigation_${this.config.sceneId}`,
        JSON.stringify(state)
      );
    } catch (error) {
      console.warn('Failed to save camera state:', error);
    }
  }

  /**
   * Load camera state from local storage
   */
  private loadCameraState(): void {
    if (
      !this.config?.enableCameraStateStorage ||
      !this.camera ||
      !this.controls
    )
      return;

    try {
      const saved = localStorage.getItem(
        `spatialNavigation_${this.config.sceneId}`
      );
      if (saved) {
        const state: CameraState = JSON.parse(saved);

        // Restore camera position and target
        this.camera.position.copy(state.position);
        this.controls.target.copy(state.target);
        this.controls.update();

        console.log('Camera state restored from storage');
      }
    } catch (error) {
      console.warn('Failed to load camera state:', error);
    }
  }

  /**
   * Stop current animation
   */
  private stopAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.animationResolver) {
      this.animationResolver();
      this.animationResolver = null;
    }

    this.isAnimating.set(false);
  }

  /**
   * Remove all event listeners
   */
  private removeEventListeners(): void {
    if (this.container) {
      // Remove event listeners using stored references
      if (this.handleKeyDown) {
        this.container.removeEventListener('keydown', this.handleKeyDown);
      }
      if (this.handleKeyUp) {
        this.container.removeEventListener('keyup', this.handleKeyUp);
      }
      if (this.handleTouchStart) {
        this.container.removeEventListener('touchstart', this.handleTouchStart);
      }
      if (this.handleTouchMove) {
        this.container.removeEventListener('touchmove', this.handleTouchMove);
      }
      if (this.handleTouchEnd) {
        this.container.removeEventListener('touchend', this.handleTouchEnd);
      }
    }
  }
}
