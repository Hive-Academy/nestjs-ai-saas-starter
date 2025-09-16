import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import * as THREE from 'three';
import {
  HybridElementConfig,
  HybridElement3D,
  SceneLayoutConfig,
  HybridUIConfig,
  HybridSceneState,
  // LayoutType, // unused
  ContentPriority,
  HybridElementEvents,
} from '../types/hybrid-ui.types';
import { ScalingIntelligenceService } from './scaling-intelligence.service';
import { ContentTextureService } from './content-texture.service';
import { ThreeIntegrationService } from '../../../core/services/three-integration.service';

/**
 * Hybrid UI Service
 * Main service for managing 3D-Web hybrid interface elements
 * Extends the existing Three.js integration with content-first 3D capabilities
 */
@Injectable({
  providedIn: 'root',
})
export class HybridUIService {
  private readonly threeService = inject(ThreeIntegrationService);
  private readonly scalingService = inject(ScalingIntelligenceService);
  private readonly textureService = inject(ContentTextureService);
  // Removed unused ngZone injection
  private readonly destroyRef = inject(DestroyRef);

  // Scene state management
  private readonly hybridScenes = new Map<string, HybridSceneState>();
  private readonly elements = signal(new Map<string, HybridElement3D>());
  private readonly activeElement = signal<string | null>(null);
  private readonly isLoading = signal(false);

  // Performance tracking
  private readonly performance = signal({
    fps: 60,
    elementCount: 0,
    textureMemory: 0,
  });

  // Current layout configuration
  private readonly currentLayout = signal<SceneLayoutConfig>({
    type: 'grid-2d',
    bounds: { width: 20, height: 15, depth: 10 },
    spacing: { horizontal: 3, vertical: 3, depth: 2 },
    alignment: { horizontal: 'center', vertical: 'center' },
    camera: { position: [0, 6, 25], target: [0, 2, -2], fov: 75 },
  });

  // Camera state
  private readonly cameraState = signal({
    position: new THREE.Vector3(0, 6, 25),
    target: new THREE.Vector3(0, 2, -2),
  });

  // Default configuration
  private readonly defaultConfig: HybridUIConfig = {
    scene: {
      enableShadows: true,
      backgroundColor: 0x0a0a0a,
      fog: { color: 0x0a0a0a, near: 30, far: 100 },
    },
    performance: {
      enableLOD: true,
      lodLevels: [1.0, 0.7, 0.4, 0.2],
      enableFrustumCulling: true,
      maxTextureSize: 1024,
      enableInstancedRendering: true,
      targetFrameRate: 60,
    },
    defaults: {
      contentTexture: {
        width: 1024,
        height: 1280,
        dpi: 2,
        backgroundColor: 'rgba(20, 20, 40, 0.95)',
        padding: 40,
        borderRadius: 12,
      },
      elementConfig: {
        priority: ContentPriority.SECONDARY,
        material: {
          opacity: 0.95,
          roughness: 0.05,
          metalness: 0.1,
          clearcoat: 1.0,
          transmission: 0.02,
        },
        interaction: {
          hover: 'scale',
          click: 'focus',
        },
      },
      layout: this.currentLayout(),
    },
  };

  // Public reactive state
  readonly currentElements = this.elements.asReadonly();
  readonly activeElementId = this.activeElement.asReadonly();
  readonly loadingState = this.isLoading.asReadonly();
  readonly performanceMetrics = this.performance.asReadonly();
  readonly layoutConfig = this.currentLayout.asReadonly();
  readonly camera = this.cameraState.asReadonly();

  // Computed properties
  readonly elementCount = computed(() => this.elements().size);
  readonly hasElements = computed(() => this.elements().size > 0);

  constructor() {
    this.setupPerformanceMonitoring();
    this.setupCleanup();
  }

  /**
   * Create a new hybrid 3D scene
   */
  async createHybridScene(
    sceneId: string,
    container: HTMLElement,
    config?: Partial<HybridUIConfig>
  ): Promise<boolean> {
    this.isLoading.set(true);

    try {
      const fullConfig = { ...this.defaultConfig, ...config };

      // Create base Three.js scene
      const sceneInstance = this.threeService.createScene(sceneId, container, {
        enableShadows: fullConfig.scene.enableShadows,
        backgroundColor: fullConfig.scene.backgroundColor,
        cameraFov: fullConfig.defaults.layout.camera.fov,
      });

      if (!sceneInstance) {
        throw new Error(`Failed to create Three.js scene: ${sceneId}`);
      }

      // Setup camera position
      const camPos = fullConfig.defaults.layout.camera.position;
      const camTarget = fullConfig.defaults.layout.camera.target;
      sceneInstance.camera.position.set(...camPos);
      sceneInstance.camera.lookAt(...camTarget);

      // Add fog if configured
      if (fullConfig.scene.fog) {
        sceneInstance.scene.fog = new THREE.Fog(
          fullConfig.scene.fog.color,
          fullConfig.scene.fog.near,
          fullConfig.scene.fog.far
        );
      }

      // Create hybrid scene state
      const hybridState: HybridSceneState = {
        elements: this.elements,
        activeElement: this.activeElement,
        isLoading: this.isLoading,
        performance: this.performance,
        layout: this.currentLayout,
        camera: this.cameraState,
      };

      this.hybridScenes.set(sceneId, hybridState);

      // Activate the scene
      this.threeService.activateScene(sceneId, () => this.renderLoop(sceneId));

      // Update camera state
      this.updateCameraState(sceneInstance.camera);

      this.isLoading.set(false);
      return true;
    } catch (error) {
      console.error('Failed to create hybrid scene:', error);
      this.isLoading.set(false);
      return false;
    }
  }

  /**
   * Add HTML element as 3D object
   */
  async addElement(
    sceneId: string,
    element: HTMLElement,
    config: Partial<HybridElementConfig> = {},
    events?: Partial<HybridElementEvents>
  ): Promise<string | null> {
    const sceneInstance = this.threeService.getScene(sceneId);
    if (!sceneInstance) {
      console.error(`Scene ${sceneId} not found`);
      return null;
    }

    try {
      // Generate unique ID
      const elementId = this.generateElementId();

      // Merge with default configuration
      const fullConfig: HybridElementConfig = {
        ...this.defaultConfig.defaults.elementConfig,
        ...config,
      } as HybridElementConfig;

      // Calculate intelligent scaling
      const allConfigs = Array.from(this.elements().values()).map(
        (e) => e.config
      );
      allConfigs.push(fullConfig);
      const scalingResults =
        this.scalingService.calculateSceneScaling(allConfigs);
      const scaling = scalingResults.get(allConfigs.length - 1)!;

      // Generate content texture
      const textureOptions = {
        ...this.defaultConfig.defaults.contentTexture,
        width: Math.floor(scaling.contentScale * 400),
        height: Math.floor(scaling.contentScale * 500),
      };

      const contentTexture = this.textureService.render(
        element,
        textureOptions
      );

      // Create 3D content object
      const content3D = this.createContentMesh(
        contentTexture,
        scaling,
        fullConfig
      );

      // Create decoration object if configured
      let decoration3D: THREE.Group | undefined;
      if (fullConfig.decoration) {
        decoration3D = this.createDecorationMesh(fullConfig, scaling);
      }

      // Position elements
      const position = fullConfig.position || this.calculatePosition(elementId);
      content3D.position.set(...position);
      if (decoration3D) {
        decoration3D.position.set(
          position[0],
          position[1] + 1,
          position[2] + 2
        );
      }

      // Create hybrid element
      const hybridElement: HybridElement3D = {
        id: elementId,
        domElement: element,
        content3D,
        decoration3D,
        config: fullConfig,
        scaling,
        isVisible: true,
        isInteracting: false,
      };

      // Add to scene
      sceneInstance.scene.add(content3D);
      if (decoration3D) {
        sceneInstance.scene.add(decoration3D);
      }

      // Setup interactions
      this.setupElementInteractions(hybridElement, events);

      // Update state
      const currentElements = new Map(this.elements());
      currentElements.set(elementId, hybridElement);
      this.elements.set(currentElements);

      // Update layout
      this.updateLayout(sceneId);

      // Update performance metrics
      this.updatePerformanceMetrics();

      return elementId;
    } catch (error) {
      console.error('Failed to add hybrid element:', error);
      return null;
    }
  }

  /**
   * Remove element from scene
   */
  removeElement(sceneId: string, elementId: string): boolean {
    const sceneInstance = this.threeService.getScene(sceneId);
    const element = this.elements().get(elementId);

    if (!sceneInstance || !element) {
      return false;
    }

    try {
      // Remove from scene
      sceneInstance.scene.remove(element.content3D);
      if (element.decoration3D) {
        sceneInstance.scene.remove(element.decoration3D);
      }

      // Dispose resources
      this.disposeElement(element);

      // Update state
      const currentElements = new Map(this.elements());
      currentElements.delete(elementId);
      this.elements.set(currentElements);

      // Clear active element if it was removed
      if (this.activeElement() === elementId) {
        this.activeElement.set(null);
      }

      // Update layout
      this.updateLayout(sceneId);

      return true;
    } catch (error) {
      console.error('Failed to remove element:', error);
      return false;
    }
  }

  /**
   * Update element configuration
   */
  updateElement(
    elementId: string,
    newConfig: Partial<HybridElementConfig>
  ): boolean {
    const element = this.elements().get(elementId);
    if (!element) return false;

    try {
      // Update configuration
      element.config = { ...element.config, ...newConfig };

      // Recalculate scaling
      const allConfigs = Array.from(this.elements().values()).map(
        (e) => e.config
      );
      const scalingResults =
        this.scalingService.calculateSceneScaling(allConfigs);

      // Find index and update scaling
      const elementIndex = Array.from(this.elements().keys()).indexOf(
        elementId
      );
      if (elementIndex >= 0) {
        const newScaling = scalingResults.get(elementIndex);
        if (newScaling) {
          element.scaling = newScaling;
          this.applyScaling(element);
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to update element:', error);
      return false;
    }
  }

  /**
   * Change scene layout
   */
  updateLayout(sceneId: string, newLayout?: Partial<SceneLayoutConfig>): void {
    if (newLayout) {
      this.currentLayout.set({ ...this.currentLayout(), ...newLayout });
    }

    const layout = this.currentLayout();
    const elements = Array.from(this.elements().values());

    // Recalculate positions based on layout type
    const positions = this.calculateLayoutPositions(elements, layout);

    // Apply new positions
    positions.forEach((position, elementId) => {
      const element = this.elements().get(elementId);
      if (element) {
        element.content3D.position.copy(position);
        if (element.decoration3D) {
          element.decoration3D.position.set(
            position.x,
            position.y + 1,
            position.z + 2
          );
        }
      }
    });

    // Update camera if needed
    const sceneInstance = this.threeService.getScene(sceneId);
    if (sceneInstance && layout.camera) {
      sceneInstance.camera.position.set(...layout.camera.position);
      sceneInstance.camera.lookAt(...layout.camera.target);
      this.updateCameraState(sceneInstance.camera);
    }
  }

  /**
   * Set active element
   */
  setActiveElement(elementId: string | null): void {
    const previousId = this.activeElement();
    this.activeElement.set(elementId);

    // Update visual states
    if (previousId) {
      this.updateElementVisualState(previousId, false);
    }
    if (elementId) {
      this.updateElementVisualState(elementId, true);
    }
  }

  /**
   * Get element by ID
   */
  getElement(elementId: string): HybridElement3D | null {
    return this.elements().get(elementId) || null;
  }

  /**
   * Clean up hybrid scene
   */
  cleanupScene(sceneId: string): void {
    const hybridState = this.hybridScenes.get(sceneId);
    if (!hybridState) return;

    // Remove all elements
    const elementIds = Array.from(this.elements().keys());
    elementIds.forEach((id) => this.removeElement(sceneId, id));

    // Clear texture cache
    this.textureService.clearCache();

    // Remove from Three.js service
    this.threeService.removeScene(sceneId);

    // Clean up state
    this.hybridScenes.delete(sceneId);
    this.elements.set(new Map());
    this.activeElement.set(null);
  }

  /**
   * Get current scene statistics
   */
  getSceneStats(sceneId: string) {
    const elements = this.elements();
    const textureStats = this.textureService.getCacheStats();
    const scalingFactors = this.scalingService.getScalingFactors();

    return {
      elementCount: elements.size,
      activeElement: this.activeElement(),
      performance: this.performance(),
      textureMemory: textureStats.memoryEstimate,
      scalingFactors,
      layout: this.currentLayout(),
    };
  }

  /**
   * Create content mesh from texture
   */
  private createContentMesh(
    texture: THREE.CanvasTexture,
    scaling: any,
    config: HybridElementConfig
  ): THREE.Group {
    const group = new THREE.Group();

    // Main content plane
    const geometry = new THREE.PlaneGeometry(
      scaling.contentScale * 2,
      scaling.contentScale * 2.5
    );

    const material = new THREE.MeshPhysicalMaterial({
      map: texture,
      transparent: true,
      opacity: scaling.contentOpacity,
      roughness: config.material?.roughness || 0.05,
      metalness: config.material?.metalness || 0.1,
      clearcoat: config.material?.clearcoat || 1.0,
      transmission: config.material?.transmission || 0.02,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { type: 'content', elementId: '' };

    group.add(mesh);
    return group;
  }

  /**
   * Create decoration mesh
   */
  private createDecorationMesh(
    config: HybridElementConfig,
    scaling: any
  ): THREE.Group {
    if (!config.decoration) return new THREE.Group();

    const group = new THREE.Group();

    // Create geometry based on type
    let geometry: THREE.BufferGeometry;
    switch (config.decoration.geometry) {
      case 'sphere':
        geometry = new THREE.SphereGeometry(scaling.decorationScale, 32, 32);
        break;
      case 'cube':
        geometry = new THREE.BoxGeometry(
          scaling.decorationScale * 2,
          scaling.decorationScale * 2,
          scaling.decorationScale * 2
        );
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(
          scaling.decorationScale,
          scaling.decorationScale,
          scaling.decorationScale * 2
        );
        break;
      default:
        geometry = new THREE.SphereGeometry(scaling.decorationScale, 16, 16);
    }

    const material = new THREE.MeshPhysicalMaterial({
      color: config.decoration.color || 0x3b82f6,
      transparent: true,
      opacity: scaling.decorationOpacity,
      roughness: 0.1,
      metalness: 0.1,
      clearcoat: 1.0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { type: 'decoration' };

    group.add(mesh);
    return group;
  }

  /**
   * Calculate position for new element
   */
  private calculatePosition(elementId: string): [number, number, number] {
    const elementCount = this.elements().size;
    const layout = this.currentLayout();

    // Simple grid layout for now
    const cols = Math.ceil(Math.sqrt(elementCount));
    const row = Math.floor(elementCount / cols);
    const col = elementCount % cols;

    const x = (col - cols / 2) * layout.spacing.horizontal;
    const y = 0;
    const z =
      (row - Math.floor(elementCount / cols) / 2) * layout.spacing.depth;

    return [x, y, z];
  }

  /**
   * Calculate layout positions for all elements
   */
  private calculateLayoutPositions(
    elements: HybridElement3D[],
    layout: SceneLayoutConfig
  ): Map<string, THREE.Vector3> {
    const positions = new Map<string, THREE.Vector3>();

    switch (layout.type) {
      case 'grid-2d':
        this.calculateGridPositions(elements, layout, positions);
        break;
      case 'orbital':
        this.calculateOrbitalPositions(elements, layout, positions);
        break;
      case 'depth-layers':
        this.calculateDepthLayerPositions(elements, layout, positions);
        break;
      default:
        this.calculateGridPositions(elements, layout, positions);
    }

    return positions;
  }

  /**
   * Calculate grid layout positions
   */
  private calculateGridPositions(
    elements: HybridElement3D[],
    layout: SceneLayoutConfig,
    positions: Map<string, THREE.Vector3>
  ): void {
    const cols = Math.ceil(Math.sqrt(elements.length));

    elements.forEach((element, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      const x = (col - (cols - 1) / 2) * layout.spacing.horizontal;
      const y = 0;
      const z =
        (row - Math.floor(elements.length / cols) / 2) * layout.spacing.depth;

      positions.set(element.id, new THREE.Vector3(x, y, z));
    });
  }

  /**
   * Calculate orbital layout positions
   */
  private calculateOrbitalPositions(
    elements: HybridElement3D[],
    layout: SceneLayoutConfig,
    positions: Map<string, THREE.Vector3>
  ): void {
    const radius = Math.max(layout.bounds.width, layout.bounds.depth) * 0.4;

    elements.forEach((element, index) => {
      const angle = (index / elements.length) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = 0;
      const z = Math.sin(angle) * radius;

      positions.set(element.id, new THREE.Vector3(x, y, z));
    });
  }

  /**
   * Calculate depth layer positions
   */
  private calculateDepthLayerPositions(
    elements: HybridElement3D[],
    layout: SceneLayoutConfig,
    positions: Map<string, THREE.Vector3>
  ): void {
    // Sort by priority for depth layering
    const sortedElements = [...elements].sort(
      (a, b) => b.config.priority - a.config.priority
    );

    sortedElements.forEach((element, index) => {
      const x = 0;
      const y = 0;
      const z = index * layout.spacing.depth;

      positions.set(element.id, new THREE.Vector3(x, y, z));
    });
  }

  /**
   * Setup element interactions
   */
  private setupElementInteractions(
    element: HybridElement3D,
    events?: Partial<HybridElementEvents>
  ): void {
    // Add raycasting data
    element.content3D.userData = {
      ...element.content3D.userData,
      elementId: element.id,
      isInteractable: true,
      events,
    };

    if (element.decoration3D) {
      element.decoration3D.userData = {
        ...element.decoration3D.userData,
        elementId: element.id,
        isInteractable: true,
        events,
      };
    }
  }

  /**
   * Apply scaling to element
   */
  private applyScaling(element: HybridElement3D): void {
    const { scaling } = element;

    // Scale content
    element.content3D.scale.setScalar(scaling.contentScale);

    // Update material opacity
    element.content3D.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof THREE.Material
      ) {
        child.material.opacity = scaling.contentOpacity;
      }
    });

    // Scale decoration
    if (element.decoration3D) {
      element.decoration3D.scale.setScalar(scaling.decorationScale);
      element.decoration3D.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          child.material instanceof THREE.Material
        ) {
          child.material.opacity = scaling.decorationOpacity;
        }
      });
    }
  }

  /**
   * Update element visual state
   */
  private updateElementVisualState(elementId: string, isActive: boolean): void {
    const element = this.elements().get(elementId);
    if (!element) return;

    const targetScale = isActive ? 1.15 : 1.0;
    const targetOpacity = isActive ? 1.0 : element.scaling.contentOpacity;

    // Animate using GSAP or similar
    // For now, direct assignment
    element.content3D.scale.setScalar(
      targetScale * element.scaling.contentScale
    );

    element.content3D.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof THREE.Material
      ) {
        child.material.opacity = targetOpacity;
      }
    });
  }

  /**
   * Main render loop
   */
  private renderLoop(sceneId: string): void {
    const elements = this.elements();
    const time = performance.now() * 0.001;

    // Animate elements
    elements.forEach((element) => {
      this.animateElement(element, time);
    });
  }

  /**
   * Animate individual element
   */
  private animateElement(element: HybridElement3D, time: number): void {
    // Gentle floating animation
    const baseY = element.content3D.position.y;
    element.content3D.position.y = baseY + Math.sin(time * 0.8) * 0.1;

    // Subtle rotation
    element.content3D.rotation.z = Math.sin(time * 0.4) * 0.02;

    // Decoration animation
    if (element.decoration3D && element.config.decoration?.animation) {
      switch (element.config.decoration.animation) {
        case 'rotate':
          element.decoration3D.rotation.y = time * 0.5;
          break;
        case 'float':
          element.decoration3D.position.y += Math.sin(time * 1.2) * 0.02;
          break;
        case 'pulse': {
          const scale = 1 + Math.sin(time * 2) * 0.1;
          element.decoration3D.scale.setScalar(
            scale * element.scaling.decorationScale
          );
          break;
        }
      }
    }
  }

  /**
   * Dispose element resources
   */
  private disposeElement(element: HybridElement3D): void {
    // Dispose geometries and materials
    element.content3D.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    if (element.decoration3D) {
      element.decoration3D.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
  }

  /**
   * Update camera state signal
   */
  private updateCameraState(camera: THREE.PerspectiveCamera): void {
    this.cameraState.set({
      position: camera.position.clone(),
      target: new THREE.Vector3(0, 0, 0), // Would need to track actual target
    });
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    const elementCount = this.elements().size;
    const textureStats = this.textureService.getCacheStats();

    this.performance.set({
      fps: 60, // Would get from actual performance monitoring
      elementCount,
      textureMemory: textureStats.memoryEstimate,
    });
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Monitor viewport changes
    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const { width, height } = entry.contentRect;
        this.scalingService.updateViewportScaling(width, height);
      });
    });

    // Observe document body for viewport changes
    resizeObserver.observe(document.body);
  }

  /**
   * Setup cleanup
   */
  private setupCleanup(): void {
    this.destroyRef.onDestroy(() => {
      // Clean up all scenes
      const sceneIds = Array.from(this.hybridScenes.keys());
      sceneIds.forEach((id) => this.cleanupScene(id));

      // Clear texture cache
      this.textureService.clearCache();
    });
  }

  /**
   * Generate unique element ID
   */
  private generateElementId(): string {
    return `hybrid-element-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }
}
