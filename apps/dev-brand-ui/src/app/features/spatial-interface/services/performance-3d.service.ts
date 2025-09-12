import { Injectable, signal, computed, inject } from '@angular/core';
import * as THREE from 'three';
import { ThreeIntegrationService } from '../../../core/services/three-integration.service';

export interface LODLevel {
  distance: number;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  particleCount: number;
  effectsEnabled: boolean;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  renderTime: number;
  triangles: number;
  drawCalls: number;
  memoryUsage: {
    geometries: number;
    textures: number;
    programs: number;
    total: number;
  };
  qualityLevel: 'high' | 'medium' | 'low' | 'minimal';
}

export interface InstancedRenderGroup {
  id: string;
  agentType: 'coordinator' | 'specialist' | 'analyst' | 'creator';
  instances: THREE.InstancedMesh;
  positions: Float32Array;
  colors: Float32Array;
  scales: Float32Array;
  count: number;
  maxInstances: number;
}

/**
 * Performance 3D Service
 * Handles advanced performance optimization for the 3D spatial interface
 * Implements LOD, instanced rendering, and automatic quality scaling
 */
@Injectable({
  providedIn: 'root',
})
export class Performance3DService {
  private readonly threeService = inject(ThreeIntegrationService);

  // Performance monitoring
  private readonly performanceMetrics = signal<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    renderTime: 0,
    triangles: 0,
    drawCalls: 0,
    memoryUsage: {
      geometries: 0,
      textures: 0,
      programs: 0,
      total: 0,
    },
    qualityLevel: 'high',
  });

  private readonly targetFPS = signal(60);
  private readonly isLowPerformanceDevice = signal(false);
  private readonly autoQualityScaling = signal(true);

  // LOD system
  private lodLevels: Map<string, LODLevel[]> = new Map();
  private currentLOD: Map<string, number> = new Map();
  private lodUpdateThreshold = 100; // ms

  // Instanced rendering
  private instancedGroups: Map<string, InstancedRenderGroup> = new Map();
  private instanceMatrices: Map<string, THREE.Matrix4[]> = new Map();

  // Performance monitoring
  private frameCount = 0;
  private lastFrameTime = 0;
  private lastLODUpdate = 0;
  private renderer: THREE.WebGLRenderer | null = null;

  // Memory management
  private geometryPool: Map<string, THREE.BufferGeometry[]> = new Map();
  private materialPool: Map<string, THREE.Material[]> = new Map();
  private textureCache: Map<string, THREE.Texture> = new Map();

  // Public reactive state
  readonly metrics = this.performanceMetrics.asReadonly();
  readonly currentQuality = computed(
    () => this.performanceMetrics().qualityLevel
  );
  readonly isOptimizing = computed(
    () => this.performanceMetrics().fps < this.targetFPS()
  );

  /**
   * Initialize the performance system
   */
  initialize(sceneId: string, targetFps = 60): void {
    const sceneInstance = this.threeService.getScene(sceneId);
    if (!sceneInstance) {
      console.error(`Scene ${sceneId} not found for Performance3DService`);
      return;
    }

    this.renderer = sceneInstance.renderer;
    this.targetFPS.set(targetFps);

    this.detectPerformanceCapabilities();
    this.initializeLODSystem();
    this.initializeInstancedRendering();
    this.startPerformanceMonitoring();

    console.log('Performance3DService initialized');
  }

  /**
   * Create LOD levels for agent geometry
   */
  createAgentLOD(
    agentType: 'coordinator' | 'specialist' | 'analyst' | 'creator',
    baseGeometry: THREE.BufferGeometry,
    baseMaterial: THREE.Material
  ): void {
    const lodLevels: LODLevel[] = [];

    // High quality (close distance)
    lodLevels.push({
      distance: 0,
      geometry: baseGeometry.clone(),
      material: baseMaterial.clone(),
      particleCount: 100,
      effectsEnabled: true,
    });

    // Medium quality (mid distance)
    const mediumGeometry = this.reduceGeometry(baseGeometry, 0.6);
    const mediumMaterial = this.createSimplifiedMaterial(baseMaterial, 0.8);
    lodLevels.push({
      distance: 20,
      geometry: mediumGeometry,
      material: mediumMaterial,
      particleCount: 50,
      effectsEnabled: true,
    });

    // Low quality (far distance)
    const lowGeometry = this.reduceGeometry(baseGeometry, 0.3);
    const lowMaterial = this.createSimplifiedMaterial(baseMaterial, 0.5);
    lodLevels.push({
      distance: 50,
      geometry: lowGeometry,
      material: lowMaterial,
      particleCount: 20,
      effectsEnabled: false,
    });

    // Minimal quality (very far distance)
    const minimalGeometry = new THREE.SphereGeometry(0.2, 8, 6);
    const minimalMaterial = new THREE.MeshBasicMaterial({
      color: (baseMaterial as any).color || 0x888888,
      transparent: true,
      opacity: 0.6,
    });
    lodLevels.push({
      distance: 100,
      geometry: minimalGeometry,
      material: minimalMaterial,
      particleCount: 0,
      effectsEnabled: false,
    });

    this.lodLevels.set(agentType, lodLevels);
  }

  /**
   * Get appropriate LOD level based on distance
   */
  getLODLevel(
    agentType: 'coordinator' | 'specialist' | 'analyst' | 'creator',
    distance: number
  ): LODLevel | null {
    const levels = this.lodLevels.get(agentType);
    if (!levels) return null;

    // Apply quality scaling adjustment
    const qualityMultiplier = this.getQualityMultiplier();
    const adjustedDistance = distance * qualityMultiplier;

    // Find appropriate LOD level
    for (let i = levels.length - 1; i >= 0; i--) {
      if (adjustedDistance >= levels[i].distance) {
        return levels[i];
      }
    }

    return levels[0]; // Return highest quality if nothing matches
  }

  /**
   * Create instanced rendering group for similar agents
   */
  createInstancedGroup(
    agentType: 'coordinator' | 'specialist' | 'analyst' | 'creator',
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    maxInstances = 100
  ): void {
    const instancedMesh = new THREE.InstancedMesh(
      geometry,
      material,
      maxInstances
    );
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const group: InstancedRenderGroup = {
      id: agentType,
      agentType,
      instances: instancedMesh,
      positions: new Float32Array(maxInstances * 3),
      colors: new Float32Array(maxInstances * 3),
      scales: new Float32Array(maxInstances * 3),
      count: 0,
      maxInstances,
    };

    this.instancedGroups.set(agentType, group);
    this.instanceMatrices.set(agentType, []);
  }

  /**
   * Update instanced rendering data
   */
  updateInstancedGroup(
    agentType: 'coordinator' | 'specialist' | 'analyst' | 'creator',
    positions: THREE.Vector3[],
    colors: THREE.Color[],
    scales: THREE.Vector3[]
  ): void {
    const group = this.instancedGroups.get(agentType);
    if (!group || positions.length === 0) return;

    const count = Math.min(positions.length, group.maxInstances);
    group.count = count;

    // Update instance matrices
    const matrices = this.instanceMatrices.get(agentType)!;
    matrices.length = 0;

    for (let i = 0; i < count; i++) {
      const matrix = new THREE.Matrix4();
      matrix.compose(
        positions[i],
        new THREE.Quaternion(),
        scales[i] || new THREE.Vector3(1, 1, 1)
      );
      matrices.push(matrix);

      group.instances.setMatrixAt(i, matrix);

      if (colors[i]) {
        group.instances.setColorAt(i, colors[i]);
      }
    }

    group.instances.count = count;
    group.instances.instanceMatrix.needsUpdate = true;
    if (group.instances.instanceColor) {
      group.instances.instanceColor.needsUpdate = true;
    }
  }

  /**
   * Update performance metrics and adjust quality
   */
  updatePerformanceMetrics(deltaTime: number): void {
    this.frameCount++;
    this.lastFrameTime = deltaTime;

    // Calculate FPS
    const fps = 1000 / deltaTime;

    // Get renderer info
    const rendererInfo = this.renderer?.info;
    const memoryInfo = this.renderer?.info.memory;

    const metrics: PerformanceMetrics = {
      fps: fps,
      frameTime: deltaTime,
      renderTime: rendererInfo?.render.frame || 0,
      triangles: rendererInfo?.render.triangles || 0,
      drawCalls: rendererInfo?.render.calls || 0,
      memoryUsage: {
        geometries: memoryInfo?.geometries || 0,
        textures: memoryInfo?.textures || 0,
        programs: rendererInfo?.programs?.length || 0,
        total: (memoryInfo?.geometries || 0) + (memoryInfo?.textures || 0),
      },
      qualityLevel: this.determineQualityLevel(fps),
    };

    this.performanceMetrics.set(metrics);

    // Auto quality scaling
    if (this.autoQualityScaling()) {
      this.adjustQualityBasedOnPerformance(fps);
    }

    // Memory cleanup if needed
    if (metrics.memoryUsage.total > 500) {
      // 500MB threshold
      this.performMemoryCleanup();
    }
  }

  /**
   * Get geometry from pool or create new one
   */
  getGeometry(
    type: string,
    creator: () => THREE.BufferGeometry
  ): THREE.BufferGeometry {
    let pool = this.geometryPool.get(type);
    if (!pool) {
      pool = [];
      this.geometryPool.set(type, pool);
    }

    if (pool.length > 0) {
      return pool.pop()!;
    }

    return creator();
  }

  /**
   * Return geometry to pool
   */
  returnGeometry(type: string, geometry: THREE.BufferGeometry): void {
    const pool = this.geometryPool.get(type);
    if (pool && pool.length < 10) {
      // Limit pool size
      pool.push(geometry);
    } else {
      geometry.dispose();
    }
  }

  /**
   * Get material from pool or create new one
   */
  getMaterial(type: string, creator: () => THREE.Material): THREE.Material {
    let pool = this.materialPool.get(type);
    if (!pool) {
      pool = [];
      this.materialPool.set(type, pool);
    }

    if (pool.length > 0) {
      return pool.pop()!;
    }

    return creator();
  }

  /**
   * Return material to pool
   */
  returnMaterial(type: string, material: THREE.Material): void {
    const pool = this.materialPool.get(type);
    if (pool && pool.length < 5) {
      // Limit pool size
      pool.push(material);
    } else {
      material.dispose();
    }
  }

  /**
   * Get cached texture or create new one
   */
  getTexture(url: string, creator: () => THREE.Texture): THREE.Texture {
    if (this.textureCache.has(url)) {
      return this.textureCache.get(url)!;
    }

    const texture = creator();
    this.textureCache.set(url, texture);
    return texture;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Dispose LOD geometries and materials
    this.lodLevels.forEach((levels) => {
      levels.forEach((level) => {
        level.geometry.dispose();
        level.material.dispose();
      });
    });
    this.lodLevels.clear();

    // Dispose instanced groups
    this.instancedGroups.forEach((group) => {
      group.instances.dispose();
    });
    this.instancedGroups.clear();

    // Clear pools
    this.geometryPool.forEach((pool) => {
      pool.forEach((geometry) => geometry.dispose());
    });
    this.geometryPool.clear();

    this.materialPool.forEach((pool) => {
      pool.forEach((material) => material.dispose());
    });
    this.materialPool.clear();

    // Clear texture cache
    this.textureCache.forEach((texture) => texture.dispose());
    this.textureCache.clear();
  }

  /**
   * Detect device performance capabilities
   */
  private detectPerformanceCapabilities(): void {
    if (!this.renderer) return;

    const gl = this.renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

    let isLowPerformance = false;

    // Check for mobile devices
    if (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
    ) {
      isLowPerformance = true;
    }

    // Check GPU info if available
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      if (renderer.includes('Intel') || renderer.includes('ARM')) {
        isLowPerformance = true;
      }
    }

    // Check available memory
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory.jsHeapSizeLimit < 2000000000) {
        // Less than 2GB
        isLowPerformance = true;
      }
    }

    this.isLowPerformanceDevice.set(isLowPerformance);
  }

  /**
   * Initialize LOD system
   */
  private initializeLODSystem(): void {
    // LOD levels will be created when agents are added
    this.currentLOD.clear();
    this.lastLODUpdate = performance.now();
  }

  /**
   * Initialize instanced rendering system
   */
  private initializeInstancedRendering(): void {
    // Instanced groups will be created as needed
    this.instancedGroups.clear();
    this.instanceMatrices.clear();
  }

  /**
   * Start performance monitoring loop
   */
  private startPerformanceMonitoring(): void {
    let lastTime = performance.now();

    const monitor = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      this.updatePerformanceMetrics(deltaTime);

      // Schedule next monitoring cycle
      requestAnimationFrame(monitor);
    };

    monitor();
  }

  /**
   * Reduce geometry complexity for LOD
   */
  private reduceGeometry(
    geometry: THREE.BufferGeometry,
    factor: number
  ): THREE.BufferGeometry {
    // Simple vertex reduction by sampling
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const uv = geometry.getAttribute('uv');

    const vertexCount = Math.floor(position.count * factor);
    const step = Math.ceil(position.count / vertexCount);

    const newPositions: number[] = [];
    const newNormals: number[] = [];
    const newUvs: number[] = [];

    for (let i = 0; i < position.count; i += step) {
      for (let j = 0; j < 3; j++) {
        newPositions.push(position.getX(i), position.getY(i), position.getZ(i));
      }
      if (normal) {
        newNormals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
      }
      if (uv) {
        newUvs.push(uv.getX(i), uv.getY(i));
      }
    }

    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(newPositions, 3)
    );
    if (newNormals.length > 0) {
      newGeometry.setAttribute(
        'normal',
        new THREE.Float32BufferAttribute(newNormals, 3)
      );
    }
    if (newUvs.length > 0) {
      newGeometry.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute(newUvs, 2)
      );
    }

    return newGeometry;
  }

  /**
   * Create simplified material for LOD
   */
  private createSimplifiedMaterial(
    baseMaterial: THREE.Material,
    complexity: number
  ): THREE.Material {
    if (baseMaterial instanceof THREE.ShaderMaterial) {
      // Convert complex shader to basic material
      return new THREE.MeshBasicMaterial({
        color:
          (baseMaterial.uniforms.baseColor?.value as THREE.Color) ||
          new THREE.Color(0x888888),
        transparent: true,
        opacity: 0.8 * complexity,
      });
    } else if (baseMaterial instanceof THREE.MeshPhongMaterial) {
      return new THREE.MeshLambertMaterial({
        color: baseMaterial.color,
        transparent: baseMaterial.transparent,
        opacity: baseMaterial.opacity * complexity,
      });
    }

    return baseMaterial.clone();
  }

  /**
   * Get quality multiplier based on current quality level
   */
  private getQualityMultiplier(): number {
    switch (this.performanceMetrics().qualityLevel) {
      case 'high':
        return 1.0;
      case 'medium':
        return 1.5;
      case 'low':
        return 2.0;
      case 'minimal':
        return 3.0;
      default:
        return 1.0;
    }
  }

  /**
   * Determine quality level based on performance
   */
  private determineQualityLevel(
    fps: number
  ): 'high' | 'medium' | 'low' | 'minimal' {
    if (fps >= 55) return 'high';
    if (fps >= 40) return 'medium';
    if (fps >= 25) return 'low';
    return 'minimal';
  }

  /**
   * Adjust quality based on performance
   */
  private adjustQualityBasedOnPerformance(fps: number): void {
    const targetFps = this.targetFPS();

    if (fps < targetFps - 10) {
      // Performance is too low, reduce quality
      this.reduceQuality();
    } else if (
      fps > targetFps + 5 &&
      this.performanceMetrics().qualityLevel !== 'high'
    ) {
      // Performance is good, increase quality
      this.increaseQuality();
    }
  }

  /**
   * Reduce quality level
   */
  private reduceQuality(): void {
    const current = this.performanceMetrics().qualityLevel;
    let newLevel: 'high' | 'medium' | 'low' | 'minimal';

    switch (current) {
      case 'high':
        newLevel = 'medium';
        break;
      case 'medium':
        newLevel = 'low';
        break;
      case 'low':
        newLevel = 'minimal';
        break;
      default:
        return; // Already at minimal
    }

    this.performanceMetrics.update((metrics) => ({
      ...metrics,
      qualityLevel: newLevel,
    }));
    console.log(`Quality reduced to: ${newLevel}`);
  }

  /**
   * Increase quality level
   */
  private increaseQuality(): void {
    const current = this.performanceMetrics().qualityLevel;
    let newLevel: 'high' | 'medium' | 'low' | 'minimal';

    switch (current) {
      case 'minimal':
        newLevel = 'low';
        break;
      case 'low':
        newLevel = 'medium';
        break;
      case 'medium':
        newLevel = 'high';
        break;
      default:
        return; // Already at high
    }

    this.performanceMetrics.update((metrics) => ({
      ...metrics,
      qualityLevel: newLevel,
    }));
    console.log(`Quality increased to: ${newLevel}`);
  }

  /**
   * Perform memory cleanup
   */
  private performMemoryCleanup(): void {
    // Clear excess items from pools
    this.geometryPool.forEach((pool, type) => {
      if (pool.length > 5) {
        const excess = pool.splice(5);
        excess.forEach((geometry) => geometry.dispose());
      }
    });

    this.materialPool.forEach((pool, type) => {
      if (pool.length > 3) {
        const excess = pool.splice(3);
        excess.forEach((material) => material.dispose());
      }
    });

    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }

    console.log('Memory cleanup performed');
  }
}
