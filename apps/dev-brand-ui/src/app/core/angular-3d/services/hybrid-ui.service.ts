import {
  Injectable,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as THREE from 'three';
import { fromEvent, debounceTime } from 'rxjs';
import { AngularThreeService } from './angular-three.service';
import { TextureFactoryService, TextureLoaderService } from './texture';
import type {
  HybridElementExtended,
  HybridElementConfigExtended,
  HybridUIServiceConfig,
  AnimationConfig,
} from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class HybridUIService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly angularThreeService = inject(AngularThreeService);
  private readonly textureFactory = inject(TextureFactoryService);
  private readonly textureLoader = inject(TextureLoaderService);

  // Scene references (set externally by HybridSceneComponent)
  private readonly _scene = signal<THREE.Scene | null>(null);
  private readonly _camera = signal<THREE.Camera | null>(null);
  private readonly _renderer = signal<THREE.WebGLRenderer | null>(null);

  private readonly config = signal<HybridUIServiceConfig>({
    angularThree: {
      enableShadows: true,
      antialias: true,
      powerPreference: 'high-performance',
    },
    textureService: {
      maxMemory: 256 * 1024 * 1024,
      defaultQuality: 'medium',
      enableCaching: true,
      enableReactiveUpdates: true,
    },
  });

  private readonly elements = new Map<string, HybridElementExtended>();
  private readonly animationTimelines = new Map<string, any>(); // GSAP timeline instances
  private readonly intersectionObserver = signal<IntersectionObserver | null>(
    null
  );
  private readonly resizeObserver = signal<ResizeObserver | null>(null);

  // Reactive state
  private readonly isInitialized = signal(false);
  private readonly activeElements = signal<string[]>([]);
  private readonly performanceMetrics = signal({
    totalElements: 0,
    visibleElements: 0,
    renderTime: 0,
    memoryUsage: 0,
    lastUpdate: Date.now(),
  });

  // Computed properties
  readonly initialized = computed(() => this.isInitialized());
  readonly elementCount = computed(() => this.elements.size);
  readonly visibleElementCount = computed(() => this.activeElements().length);
  readonly performance = computed(() => this.performanceMetrics());

  // Scene management (readonly accessors)
  readonly scene = computed(() => this._scene());
  readonly camera = computed(() => this._camera());
  readonly renderer = computed(() => this._renderer());

  constructor() {
    this.initializeService();
  }

  /**
   * Set scene references from HybridSceneComponent
   * This should be called after NgtCanvas is initialized
   */
  setSceneReferences(
    scene: THREE.Scene | null,
    camera: THREE.Camera | null,
    renderer: THREE.WebGLRenderer | null
  ): void {
    this._scene.set(scene);
    this._camera.set(camera);
    this._renderer.set(renderer);

    // Initialize service if not already done
    if (!this.isInitialized() && scene && camera && renderer) {
      this.finalizeInitialization();
    }
  }

  private initializeService(): void {
    // Setup observers immediately
    this.setupObservers();
    // Note: Performance monitoring setup deferred until scene is available
  }

  private finalizeInitialization(): void {
    // Setup performance monitoring now that we have scene access
    this.setupPerformanceMonitoring();
    this.isInitialized.set(true);
  }

  private setupObservers(): void {
    // Intersection Observer for visibility management
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = this.findElementByDom(entry.target as HTMLElement);
          if (element) {
            this.updateElementVisibility(element, entry.isIntersecting);
          }
        });
      },
      {
        threshold: [0, 0.25, 0.5, 0.75, 1.0],
        rootMargin: '50px',
      }
    );
    this.intersectionObserver.set(intersectionObserver);

    // Resize Observer for responsive updates
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver((entries) => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(() => {
        entries.forEach((entry) => {
          const element = this.findElementByDom(entry.target as HTMLElement);
          if (element) {
            this.updateElementLayout(element);
          }
        });
      }, 250);
    });
    this.resizeObserver.set(resizeObserver);

    // Global resize handler
    fromEvent(window, 'resize')
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.handleGlobalResize();
      });

    this.destroyRef.onDestroy(() => {
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
    });
  }

  private setupPerformanceMonitoring(): void {
    const cleanup = this.angularThreeService.addToRenderLoop((delta, time) => {
      this.updatePerformanceMetrics(delta);
    });

    this.destroyRef.onDestroy(cleanup);
  }

  private updatePerformanceMetrics(delta: number): void {
    const cacheStats = this.textureLoader.getCacheStatistics();

    this.performanceMetrics.update((current) => ({
      totalElements: this.elements.size,
      visibleElements: this.activeElements().length,
      renderTime: delta,
      memoryUsage: cacheStats().sizeMB,
      lastUpdate: Date.now(),
    }));
  }

  /**
   * Create hybrid element with Angular Three integration
   */
  async createHybridElement(
    domElement: HTMLElement,
    config: HybridElementConfigExtended
  ): Promise<HybridElementExtended> {
    if (!this.initialized()) {
      throw new Error('HybridUIService not initialized');
    }

    const id = this.generateElementId();

    // Create Angular Three group
    const ngtGroup = new THREE.Group();
    ngtGroup.name = id;
    ngtGroup.userData = { type: 'hybrid-element', createdAt: Date.now() };

    // Apply Angular Three configuration
    if (config.angularThree) {
      if (config.angularThree.renderOrder !== undefined) {
        ngtGroup.renderOrder = config.angularThree.renderOrder;
      }
      if (config.angularThree.layers !== undefined) {
        ngtGroup.layers.set(config.angularThree.layers);
      }
    }

    // Create placeholder texture for immediate rendering (CORS-safe, no taint!)
    // Use a more visible color so elements aren't invisible during loading
    const placeholderTexture = this.textureFactory.createPlaceholderTexture(
      256,
      256,
      '#6366f1'
    );

    // Create material with placeholder texture
    const material = this.createEnhancedMaterial(placeholderTexture, config);

    // Prepare texture loading config
    const quality = config.content?.quality ?? 'medium';

    // Create geometry based on element dimensions
    const geometry = this.createElementGeometry(domElement);

    // Create optimized mesh
    const ngtMesh = this.angularThreeService.createOptimizedMesh(
      geometry,
      material,
      {
        castShadow: config.angularThree?.castShadow ?? true,
        receiveShadow: config.angularThree?.receiveShadow ?? true,
        renderOrder: config.angularThree?.renderOrder,
        layers: config.angularThree?.layers,
      }
    );

    ngtGroup.add(ngtMesh);

    // Position element
    if (config.position) {
      ngtGroup.position.set(...config.position);
    } else {
      this.positionElementInScene(ngtGroup, domElement, config);
    }

    // Create reactive element state using writable signals
    const elementState = signal({
      isVisible: false,
      isInteracting: false,
      isAnimating: false,
      lodLevel: 0,
      textureQuality: config.content?.quality ?? 'medium',
      memoryUsage: 0,
    });

    const elementPerformance = signal({
      renderTime: 0,
      textureSize: 0,
      triangleCount: geometry.attributes['position']?.count / 3 || 0,
      lastUpdate: Date.now(),
    });

    const needsTextureUpdate = signal(false);

    // Create texture signal
    const textureSignal = signal(placeholderTexture);

    // Create hybrid element
    const hybridElement: HybridElementExtended = {
      id,
      domElement,
      config,
      scaling: this.calculateElementScaling(domElement),
      isVisible: false,
      isInteracting: false,
      ngtGroup,
      ngtMesh,
      ngtMaterial: material,
      state: elementState,
      performance: elementPerformance,
      texture: textureSignal, // Start with placeholder
      needsTextureUpdate,
      animations: new Map(),
    };

    // Load real texture asynchronously using new modular, CORS-safe service
    const cacheKey = this.textureLoader.generateCacheKey(domElement, {
      quality,
    });

    this.textureLoader
      .loadTexture({
        element: domElement,
        cacheKey,
        quality,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          // Update material with real texture (NO TAINT - CORS-safe rendering!)
          material.map = result.texture;
          material.needsUpdate = true;
          // Update texture signal
          textureSignal.set(result.texture);
          console.log(
            `[HybridUIService] ✅ Texture loaded for ${id} (cache:${
              result.fromCache
            }, time:${result.loadTimeMs.toFixed(1)}ms)`
          );
        },
        error: (error) => {
          console.error(
            `[HybridUIService] ❌ Failed to load texture for ${id}:`,
            error
          );
        },
      });

    // Setup animations if configured
    if (config.animations) {
      this.setupElementAnimations(hybridElement);
    }

    // Setup interaction handlers
    this.setupElementInteractions(hybridElement);

    // Start observing element
    this.intersectionObserver()?.observe(domElement);
    this.resizeObserver()?.observe(domElement);

    // Add group to scene
    const scene = this.scene();
    if (scene) {
      scene.add(ngtGroup);
    }

    // Store element
    this.elements.set(id, hybridElement);

    return hybridElement;
  }

  private createEnhancedMaterial(
    texture: THREE.Texture,
    config: HybridElementConfigExtended
  ): THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
    // Use MeshPhysicalMaterial if advanced properties are needed
    const needsPhysicalMaterial =
      config.material?.clearcoat !== undefined ||
      config.material?.transmission !== undefined;

    const material = needsPhysicalMaterial
      ? new THREE.MeshPhysicalMaterial({
          map: texture,
          transparent: true,
          alphaTest: 0.1,
          side: THREE.DoubleSide,
        })
      : new THREE.MeshStandardMaterial({
          map: texture,
          transparent: true,
          alphaTest: 0.1,
          side: THREE.DoubleSide,
        });

    // Apply material properties from config
    if (config.material) {
      if (config.material.opacity !== undefined) {
        material.opacity = config.material.opacity;
      }
      if (config.material.roughness !== undefined) {
        material.roughness = config.material.roughness;
      }
      if (config.material.metalness !== undefined) {
        material.metalness = config.material.metalness;
      }

      // Advanced properties only available on MeshPhysicalMaterial
      if (needsPhysicalMaterial) {
        const physicalMaterial = material as THREE.MeshPhysicalMaterial;
        if (config.material.clearcoat !== undefined) {
          physicalMaterial.clearcoat = config.material.clearcoat;
        }
        if (config.material.transmission !== undefined) {
          physicalMaterial.transmission = config.material.transmission;
        }
      }
    }

    // Shadow configuration
    if (config.angularThree?.castShadow !== false) {
      material.shadowSide = THREE.DoubleSide;
    }

    return material;
  }

  private createElementGeometry(domElement: HTMLElement): THREE.PlaneGeometry {
    const rect = domElement.getBoundingClientRect();
    const width = rect.width / 100; // Scale to reasonable 3D units
    const height = rect.height / 100;

    return new THREE.PlaneGeometry(width, height, 1, 1);
  }

  private positionElementInScene(
    group: THREE.Group,
    domElement: HTMLElement,
    config: HybridElementConfigExtended
  ): void {
    const rect = domElement.getBoundingClientRect();
    const camera = this.camera();

    if (!camera) return;

    // Convert screen coordinates to 3D world coordinates
    const x = (rect.left + rect.width / 2 - window.innerWidth / 2) / 100;
    const y = -(rect.top + rect.height / 2 - window.innerHeight / 2) / 100;
    const z = this.getElementDepth(config.priority);

    group.position.set(x, y, z);
  }

  private getElementDepth(priority: string): number {
    const depths = {
      HERO: -1,
      PRIMARY: -2,
      SECONDARY: -3,
      TERTIARY: -4,
    };
    return depths[priority as keyof typeof depths] || -2;
  }

  private calculateElementScaling(domElement: HTMLElement): any {
    const rect = domElement.getBoundingClientRect();
    return {
      original: { width: rect.width, height: rect.height },
      threejs: { width: rect.width / 100, height: rect.height / 100 },
      scale: 1.0,
    };
  }

  private setupElementAnimations(element: HybridElementExtended): void {
    if (!element.config.animations) return;

    // This would integrate with GSAP when available
    // For now, we'll create placeholder animation setups
    Object.entries(element.config.animations).forEach(
      ([trigger, animConfig]) => {
        if (
          animConfig &&
          typeof animConfig === 'object' &&
          'type' in animConfig
        ) {
          element.animations.set(
            trigger,
            this.createAnimationTimeline(element, animConfig as AnimationConfig)
          );
        }
      }
    );
  }

  private createAnimationTimeline(
    element: HybridElementExtended,
    config: AnimationConfig
  ): any {
    // Placeholder for GSAP timeline creation
    // This would be enhanced when GSAP is properly integrated
    return {
      play: () => this.playAnimation(element, config),
      pause: () => this.pauseAnimation(element),
      reverse: () => this.reverseAnimation(element),
      config,
    };
  }

  private playAnimation(
    element: HybridElementExtended,
    config: AnimationConfig
  ): void {
    element.state.update((state) => ({ ...state, isAnimating: true }));

    // Basic animation implementation using Three.js
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / config.duration, 1);

      if (config.type === 'transform' && element.ngtGroup) {
        this.applyTransformAnimation(
          element.ngtGroup,
          config.properties,
          progress
        );
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.state.update((state) => ({ ...state, isAnimating: false }));
        config.onComplete?.();
      }

      config.onUpdate?.(progress);
    };

    requestAnimationFrame(animate);
  }

  private applyTransformAnimation(
    group: THREE.Group,
    properties: any,
    progress: number
  ): void {
    if (properties.position) {
      const pos = properties.position;
      group.position.lerp(new THREE.Vector3(pos.x, pos.y, pos.z), progress);
    }

    if (properties.rotation) {
      const rot = properties.rotation;
      group.rotation.set(rot.x * progress, rot.y * progress, rot.z * progress);
    }

    if (properties.scale) {
      const scale = typeof properties.scale === 'number' ? properties.scale : 1;
      group.scale.setScalar(scale * progress + (1 - progress));
    }
  }

  private pauseAnimation(element: HybridElementExtended): void {
    element.state.update((state) => ({ ...state, isAnimating: false }));
  }

  private reverseAnimation(element: HybridElementExtended): void {
    // Implementation for reversing animations
  }

  private setupElementInteractions(element: HybridElementExtended): void {
    // Setup mouse/touch interactions
    fromEvent(element.domElement, 'mouseenter')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.handleElementInteraction(element, 'hover', true);
      });

    fromEvent(element.domElement, 'mouseleave')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.handleElementInteraction(element, 'hover', false);
      });

    fromEvent(element.domElement, 'focus')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.handleElementInteraction(element, 'focus', true);
      });

    fromEvent(element.domElement, 'blur')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.handleElementInteraction(element, 'focus', false);
      });
  }

  private handleElementInteraction(
    element: HybridElementExtended,
    type: string,
    active: boolean
  ): void {
    element.state.update((state) => ({
      ...state,
      isInteracting: active,
    }));

    // Trigger appropriate animation
    const animation = element.animations.get(type);
    if (animation) {
      if (active) {
        animation.play();
      } else {
        animation.reverse();
      }
    }
  }

  private findElementByDom(
    domElement: HTMLElement
  ): HybridElementExtended | null {
    for (const element of Array.from(this.elements.values())) {
      if (element.domElement === domElement) {
        return element;
      }
    }
    return null;
  }

  private updateElementVisibility(
    element: HybridElementExtended,
    isVisible: boolean
  ): void {
    element.isVisible = isVisible;
    element.state.update((state) => ({ ...state, isVisible }));

    if (element.ngtGroup) {
      element.ngtGroup.visible = isVisible;
    }

    this.updateActiveElements();
  }

  private updateElementLayout(element: HybridElementExtended): void {
    // Recalculate position and scaling
    if (element.ngtGroup && !element.config.position) {
      this.positionElementInScene(
        element.ngtGroup,
        element.domElement,
        element.config
      );
    }

    // Update scaling information
    element.scaling = this.calculateElementScaling(element.domElement);

    // Mark texture for update
    element.needsTextureUpdate.set(true);
  }

  private handleGlobalResize(): void {
    // Update camera aspect ratio
    const width = window.innerWidth;
    const height = window.innerHeight;
    const camera = this._camera();

    if (camera && 'aspect' in camera) {
      (camera as THREE.PerspectiveCamera).aspect = width / height;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }

    // Update renderer size
    const renderer = this._renderer();
    if (renderer) {
      renderer.setSize(width, height);
    }

    // Update all element positions
    this.elements.forEach((element) => {
      this.updateElementLayout(element);
    });
  }

  private updateActiveElements(): void {
    const activeIds = Array.from(this.elements.values())
      .filter((el) => el.isVisible)
      .map((el) => el.id);

    this.activeElements.set(activeIds);
  }

  private generateElementId(): string {
    return `hybrid-element-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  /**
   * Get hybrid element by ID
   */
  getElement(id: string): HybridElementExtended | null {
    return this.elements.get(id) || null;
  }

  /**
   * Remove hybrid element
   */
  removeElement(id: string): void {
    const element = this.elements.get(id);
    if (!element) return;

    // Stop observing
    this.intersectionObserver()?.unobserve(element.domElement);
    this.resizeObserver()?.unobserve(element.domElement);

    // Remove from scene
    if (element.ngtGroup) {
      const scene = this.scene();
      if (scene) {
        scene.remove(element.ngtGroup);
      }
    }

    // Dispose resources
    if (element.ngtMaterial) {
      element.ngtMaterial.dispose();
    }

    if (element.ngtMesh?.geometry) {
      element.ngtMesh.geometry.dispose();
    }

    // Clear animations
    element.animations.clear();

    // Remove from collection
    this.elements.delete(id);
    this.updateActiveElements();
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<HybridUIServiceConfig>): void {
    this.config.update((current) => ({ ...current, ...newConfig }));

    // Update texture cache config if needed
    if (newConfig.textureService) {
      // Texture quality is now handled per-element during loading
      // Cache configuration could be updated here if needed
      console.log('[HybridUIService] Config updated:', newConfig);
    }
  }

  /**
   * Trigger animation on element
   */
  triggerAnimation(elementId: string, animationType: string): void {
    const element = this.getElement(elementId);
    if (!element) return;

    const animation = element.animations.get(animationType);
    if (animation) {
      animation.play();
    }
  }

  /**
   * Update element configuration
   */
  updateElementConfig(
    elementId: string,
    config: Partial<HybridElementConfigExtended>
  ): void {
    const element = this.getElement(elementId);
    if (!element) return;

    element.config = { ...element.config, ...config };

    // Re-apply configurations that changed
    this.updateElementLayout(element);

    if (config.animations) {
      this.setupElementAnimations(element);
    }
  }

  /**
   * Create scene objects (spheres, cubes, lights) from configuration
   * This supports large decorative 3D objects for hero scenes
   */
  createSceneObjects(
    config: HybridElementConfigExtended['sceneObjects']
  ): THREE.Object3D[] {
    if (!config) return [];

    const objects: THREE.Object3D[] = [];
    const scene = this.scene();

    if (!scene) {
      console.warn('Scene not available for scene objects');
      return [];
    }

    // Create spheres
    if (config.spheres) {
      config.spheres.forEach((sphereConfig, index) => {
        const geometry = new THREE.SphereGeometry(sphereConfig.radius, 32, 32);
        const material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(sphereConfig.color),
          metalness: sphereConfig.metalness ?? 0.3,
          roughness: sphereConfig.roughness ?? 0.1,
          clearcoat: 1.0,
          clearcoatRoughness: 0.1,
          transmission:
            sphereConfig.opacity !== undefined ? 1 - sphereConfig.opacity : 0.1,
          ior: 1.5,
          thickness: 0.5,
        });

        if (sphereConfig.emissive) {
          material.emissive = new THREE.Color(sphereConfig.emissive);
          material.emissiveIntensity = sphereConfig.emissiveIntensity ?? 0.2;
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...sphereConfig.position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.name = `sphere-${index}`;

        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(
          sphereConfig.radius * 1.2,
          16,
          16
        );
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: new THREE.Color(sphereConfig.color),
          transparent: true,
          opacity: 0.2,
          side: THREE.BackSide,
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        mesh.add(glowMesh);

        // Store animation config in userData
        mesh.userData = {
          animation: sphereConfig.animation ?? 'float',
          animationSpeed: sphereConfig.animationSpeed ?? 1.0,
          originalPosition: [...sphereConfig.position],
        };

        scene.add(mesh);
        objects.push(mesh);
      });
    }

    // Create cubes
    if (config.cubes) {
      config.cubes.forEach((cubeConfig, index) => {
        const size = Array.isArray(cubeConfig.size)
          ? cubeConfig.size
          : [cubeConfig.size, cubeConfig.size, cubeConfig.size];

        const geometry = new THREE.BoxGeometry(...size);
        const material = new THREE.MeshLambertMaterial({
          color: new THREE.Color(cubeConfig.color),
          transparent: cubeConfig.opacity !== undefined,
          opacity: cubeConfig.opacity ?? 1.0,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...cubeConfig.position);

        if (cubeConfig.rotation) {
          mesh.rotation.set(...cubeConfig.rotation);
        }

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.name = `cube-${index}`;

        // Store animation config in userData
        mesh.userData = {
          animation: cubeConfig.animation ?? 'rotate',
          animationSpeed: cubeConfig.animationSpeed ?? 1.0,
          originalPosition: [...cubeConfig.position],
          originalRotation: cubeConfig.rotation
            ? [...cubeConfig.rotation]
            : [0, 0, 0],
        };

        scene.add(mesh);
        objects.push(mesh);
      });
    }

    // Create particle system
    if (config.particles) {
      const particleConfig = config.particles;
      const particleCount = particleConfig.count;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);

      const spread = particleConfig.spread || { x: 50, y: 30, z: 30 };
      const sizeRange = particleConfig.sizeRange || [1, 3];
      const colorPalette = particleConfig.colors || [
        '#8a2be2', // Purple
        '#ff69b4', // Pink
        '#00bfff', // Cyan
        '#ffd700', // Gold
      ];

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        // Random positions within spread
        positions[i3] = (Math.random() - 0.5) * spread.x;
        positions[i3 + 1] = (Math.random() - 0.5) * spread.y;
        positions[i3 + 2] = (Math.random() - 0.5) * spread.z - 10;

        // Random colors from palette
        const color = new THREE.Color(
          colorPalette[Math.floor(Math.random() * colorPalette.length)]
        );
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;

        // Random sizes within range
        sizes[i] = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3)
      );
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: particleConfig.opacity ?? 0.6,
        sizeAttenuation: true,
      });

      const particles = new THREE.Points(geometry, material);
      particles.name = 'particles';

      // Store animation config
      particles.userData = {
        animation: particleConfig.animation ?? 'float',
        animationSpeed: particleConfig.animationSpeed ?? 1.0,
      };

      scene.add(particles);
      objects.push(particles);
    }

    // Create lights
    if (config.lights) {
      config.lights.forEach((lightConfig, index) => {
        let light: THREE.Light;

        switch (lightConfig.type) {
          case 'ambient':
            light = new THREE.AmbientLight(
              new THREE.Color(lightConfig.color),
              lightConfig.intensity
            );
            break;

          case 'directional': {
            const dirLight = new THREE.DirectionalLight(
              new THREE.Color(lightConfig.color),
              lightConfig.intensity
            );
            if (lightConfig.position) {
              dirLight.position.set(...lightConfig.position);
            }
            if (lightConfig.target) {
              dirLight.target.position.set(...lightConfig.target);
              scene.add(dirLight.target);
            }
            if (lightConfig.castShadow) {
              dirLight.castShadow = true;
              dirLight.shadow.mapSize.width = 2048;
              dirLight.shadow.mapSize.height = 2048;
            }
            light = dirLight;
            break;
          }

          case 'point':
            light = new THREE.PointLight(
              new THREE.Color(lightConfig.color),
              lightConfig.intensity,
              lightConfig.distance ?? 50,
              lightConfig.decay ?? 2
            );
            if (lightConfig.position) {
              light.position.set(...lightConfig.position);
            }
            if (lightConfig.castShadow) {
              light.castShadow = true;
            }
            break;

          case 'spot': {
            const spotLight = new THREE.SpotLight(
              new THREE.Color(lightConfig.color),
              lightConfig.intensity,
              lightConfig.distance ?? 0,
              Math.PI / 4,
              0.5,
              lightConfig.decay ?? 2
            );
            if (lightConfig.position) {
              spotLight.position.set(...lightConfig.position);
            }
            if (lightConfig.target) {
              spotLight.target.position.set(...lightConfig.target);
              scene.add(spotLight.target);
            }
            if (lightConfig.castShadow) {
              spotLight.castShadow = true;
            }
            light = spotLight;
            break;
          }
        }

        light.name = `light-${lightConfig.type}-${index}`;
        scene.add(light);
        objects.push(light);
      });
    }

    // Setup animations for scene objects
    this.setupSceneObjectAnimations(objects);

    return objects;
  }

  /**
   * Setup animations for scene objects (spheres, cubes)
   */
  private setupSceneObjectAnimations(objects: THREE.Object3D[]): void {
    const cleanup = this.angularThreeService.addToRenderLoop((delta, time) => {
      objects.forEach((object) => {
        const userData = object.userData;
        if (
          !userData ||
          !userData['animation'] ||
          userData['animation'] === 'none'
        )
          return;

        const speed = userData['animationSpeed'] || 1.0;
        const originalPos = userData['originalPosition'] || [0, 0, 0];

        switch (userData['animation']) {
          case 'float': {
            // Gentle floating motion
            if (object instanceof THREE.Points) {
              // Particle system floating
              object.rotation.y = time * 0.0005 * speed;
            } else {
              // Regular object floating
              object.position.y =
                originalPos[1] + Math.sin(time * 0.001 * speed) * 0.3;
              object.rotation.x = Math.sin(time * 0.0005 * speed) * 0.1;
              object.rotation.y = time * 0.0002 * speed;
            }
            break;
          }

          case 'rotate': {
            // Continuous rotation
            const originalRot = userData['originalRotation'] || [0, 0, 0];
            object.rotation.x = originalRot[0] + time * 0.0003 * speed;
            object.rotation.y = originalRot[1] + time * 0.0005 * speed;
            object.rotation.z = originalRot[2] + time * 0.0002 * speed;
            break;
          }

          case 'spiral': {
            // Spiral animation for particles
            if (object instanceof THREE.Points) {
              object.rotation.y = time * 0.001 * speed;
              object.rotation.x = Math.sin(time * 0.0005 * speed) * 0.3;
            }
            break;
          }

          case 'pulse': {
            // Pulsing scale animation
            const pulse = 1 + Math.sin(time * 0.002 * speed) * 0.1;
            object.scale.setScalar(pulse);
            break;
          }
        }
      });
    });

    this.destroyRef.onDestroy(cleanup);
  }

  /**
   * Add arbitrary THREE.Object3D to scene
   * Useful for custom 3D objects not covered by scene objects config
   */
  addObjectToScene(object: THREE.Object3D): void {
    const scene = this.scene();
    if (scene) {
      scene.add(object);
    }
  }

  /**
   * Remove object from scene
   */
  removeObjectFromScene(object: THREE.Object3D): void {
    const scene = this.scene();
    if (scene) {
      scene.remove(object);
    }
  }

  /**
   * Cleanup service resources
   */
  cleanup(): void {
    // Remove all elements
    Array.from(this.elements.keys()).forEach((id) => {
      this.removeElement(id);
    });

    // Cleanup observers
    this.intersectionObserver()?.disconnect();
    this.resizeObserver()?.disconnect();

    // Clear animation timelines
    this.animationTimelines.clear();
  }
}
