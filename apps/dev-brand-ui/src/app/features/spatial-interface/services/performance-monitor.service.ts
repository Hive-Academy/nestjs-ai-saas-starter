import { Injectable, signal, computed } from '@angular/core';
import * as THREE from 'three';

export interface PerformanceMetrics {
  frameRate: number;
  frameTime: number; // milliseconds
  memoryUsage: number; // MB
  activeEffects: number;
  totalGeometries: number;
  totalTextures: number;
  drawCalls: number;
  isOptimal: boolean;
}

export interface LODConfig {
  enabled: boolean;
  distanceThresholds: {
    high: number; // Full quality < this distance
    medium: number; // Reduced quality < this distance
    low: number; // Minimal quality < this distance
  };
  qualityLevels: {
    high: PerformanceQuality;
    medium: PerformanceQuality;
    low: PerformanceQuality;
  };
}

export interface PerformanceQuality {
  particleCount: number;
  textureSize: number;
  shaderComplexity: 'high' | 'medium' | 'low';
  effectIntensity: number; // 0-1
  updateFrequency: number; // Hz
}

/**
 * Performance Monitor Service
 * Manages frame rate monitoring, LOD optimization, and automatic quality scaling
 * Ensures 60fps performance with visual effects active
 */
@Injectable({
  providedIn: 'root',
})
export class PerformanceMonitorService {
  // Performance tracking
  private frameCount = 0;
  private lastFrameTime = 0;
  private frameTimes: number[] = [];
  private readonly maxFrameTimeHistory = 60; // Track last 60 frames

  // Memory tracking
  private lastMemoryCheck = 0;
  private readonly memoryCheckInterval = 5000; // Check every 5 seconds

  // LOD system
  private readonly lodConfig = signal<LODConfig>({
    enabled: true,
    distanceThresholds: {
      high: 50,
      medium: 100,
      low: 200,
    },
    qualityLevels: {
      high: {
        particleCount: 100,
        textureSize: 512,
        shaderComplexity: 'high',
        effectIntensity: 1.0,
        updateFrequency: 60,
      },
      medium: {
        particleCount: 60,
        textureSize: 256,
        shaderComplexity: 'medium',
        effectIntensity: 0.7,
        updateFrequency: 30,
      },
      low: {
        particleCount: 30,
        textureSize: 128,
        shaderComplexity: 'low',
        effectIntensity: 0.4,
        updateFrequency: 15,
      },
    },
  });

  // Service state
  private readonly isInitialized = signal(false);
  private readonly currentMetrics = signal<PerformanceMetrics>({
    frameRate: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    activeEffects: 0,
    totalGeometries: 0,
    totalTextures: 0,
    drawCalls: 0,
    isOptimal: true,
  });

  // Public reactive state
  readonly performanceMetrics = computed(() => this.currentMetrics());
  readonly isOptimalPerformance = computed(
    () => this.currentMetrics().isOptimal
  );
  readonly currentLODConfig = computed(() => this.lodConfig());
  readonly recommendedQuality = computed(() => this.getRecommendedQuality());

  // Callbacks for quality adjustments
  private qualityAdjustmentCallbacks: Array<
    (quality: PerformanceQuality) => void
  > = [];

  /**
   * Initialize performance monitoring
   */
  initialize(sceneId: string): void {
    if (this.isInitialized()) {
      console.warn('PerformanceMonitorService already initialized');
      return;
    }

    this.setupFrameRateMonitoring(sceneId);
    this.setupMemoryMonitoring();
    this.setupAutomaticQualityAdjustment();
    this.isInitialized.set(true);

    console.log('PerformanceMonitorService initialized');
  }

  /**
   * Register callback for quality adjustments
   */
  registerQualityCallback(
    callback: (quality: PerformanceQuality) => void
  ): void {
    this.qualityAdjustmentCallbacks.push(callback);
  }

  /**
   * Update performance metrics (called from render loop)
   */
  updateMetrics(deltaTime: number, activeEffects: number): void {
    const now = performance.now();

    // Calculate frame rate
    this.frameCount++;
    const frameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Track frame times for averaging
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.maxFrameTimeHistory) {
      this.frameTimes.shift();
    }

    // Calculate average frame rate
    const averageFrameTime =
      this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const frameRate = 1000 / averageFrameTime;

    // Update memory usage periodically
    const memoryUsage = this.shouldCheckMemory()
      ? this.getMemoryUsage()
      : this.currentMetrics().memoryUsage;

    // Get rendering metrics
    const renderingMetrics = this.getRenderingMetrics();

    // Update metrics
    const newMetrics: PerformanceMetrics = {
      frameRate: Math.round(frameRate * 10) / 10,
      frameTime: Math.round(averageFrameTime * 10) / 10,
      memoryUsage,
      activeEffects,
      ...renderingMetrics,
      isOptimal: this.isPerformanceOptimal(frameRate, activeEffects),
    };

    this.currentMetrics.set(newMetrics);
  }

  /**
   * Get LOD quality level based on camera distance to object
   */
  getLODQuality(
    cameraPosition: THREE.Vector3,
    objectPosition: THREE.Vector3
  ): PerformanceQuality {
    if (!this.lodConfig().enabled) {
      return this.lodConfig().qualityLevels.high;
    }

    const distance = cameraPosition.distanceTo(objectPosition);
    const thresholds = this.lodConfig().distanceThresholds;
    const levels = this.lodConfig().qualityLevels;

    if (distance < thresholds.high) {
      return levels.high;
    } else if (distance < thresholds.medium) {
      return levels.medium;
    } else {
      return levels.low;
    }
  }

  /**
   * Force quality level change
   */
  setQualityLevel(quality: 'high' | 'medium' | 'low'): void {
    const targetQuality = this.lodConfig().qualityLevels[quality];
    this.notifyQualityCallbacks(targetQuality);

    console.log(`Performance quality set to: ${quality}`);
  }

  /**
   * Update LOD configuration
   */
  updateLODConfig(config: Partial<LODConfig>): void {
    const currentConfig = this.lodConfig();
    const newConfig = { ...currentConfig, ...config };
    this.lodConfig.set(newConfig);
  }

  /**
   * Get current performance status
   */
  getPerformanceStatus(): {
    status: 'optimal' | 'degraded' | 'poor';
    recommendation: string;
    metrics: PerformanceMetrics;
  } {
    const metrics = this.currentMetrics();

    let status: 'optimal' | 'degraded' | 'poor';
    let recommendation: string;

    if (metrics.frameRate >= 55) {
      status = 'optimal';
      recommendation =
        'Performance is optimal. All visual effects can run at full quality.';
    } else if (metrics.frameRate >= 30) {
      status = 'degraded';
      recommendation =
        'Performance is below optimal. Consider reducing visual effect quality.';
    } else {
      status = 'poor';
      recommendation =
        'Performance is poor. Automatic quality reduction recommended.';
    }

    return { status, recommendation, metrics };
  }

  /**
   * Cleanup performance monitoring
   */
  cleanup(): void {
    this.qualityAdjustmentCallbacks = [];
    this.frameTimes = [];
    this.isInitialized.set(false);

    console.log('PerformanceMonitorService cleaned up');
  }

  /**
   * Setup frame rate monitoring
   */
  private setupFrameRateMonitoring(sceneId: string): void {
    // Start with current time
    this.lastFrameTime = performance.now();

    // Frame rate monitoring will be driven by updateMetrics calls from render loop
    console.log(`Frame rate monitoring setup for scene: ${sceneId}`);
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring(): void {
    // Check if performance.memory is available
    if ('memory' in performance) {
      this.lastMemoryCheck = Date.now();
      console.log('Memory monitoring enabled');
    } else {
      console.warn(
        'Performance.memory not available, memory monitoring disabled'
      );
    }
  }

  /**
   * Setup automatic quality adjustment
   */
  private setupAutomaticQualityAdjustment(): void {
    // Monitor performance metrics and adjust quality automatically
    setInterval(() => {
      this.checkAndAdjustQuality();
    }, 2000); // Check every 2 seconds
  }

  /**
   * Check if memory usage should be updated
   */
  private shouldCheckMemory(): boolean {
    return Date.now() - this.lastMemoryCheck > this.memoryCheckInterval;
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.lastMemoryCheck = Date.now();
      return Math.round(memory.usedJSHeapSize / 1024 / 1024); // Convert to MB
    }
    return 0;
  }

  /**
   * Get rendering metrics from Three.js
   */
  private getRenderingMetrics(): {
    totalGeometries: number;
    totalTextures: number;
    drawCalls: number;
  } {
    // For now, return mock values. In production, these would come from Three.js renderer info
    return {
      totalGeometries: 0,
      totalTextures: 0,
      drawCalls: 0,
    };
  }

  /**
   * Check if performance is optimal
   */
  private isPerformanceOptimal(
    frameRate: number,
    activeEffects: number
  ): boolean {
    // Consider performance optimal if:
    // - Frame rate is above 55 FPS
    // - OR frame rate is above 45 FPS with few active effects
    return frameRate >= 55 || (frameRate >= 45 && activeEffects <= 5);
  }

  /**
   * Get recommended quality based on current performance
   */
  private getRecommendedQuality(): PerformanceQuality {
    const metrics = this.currentMetrics();
    const levels = this.lodConfig().qualityLevels;

    if (metrics.frameRate >= 55) {
      return levels.high;
    } else if (metrics.frameRate >= 35) {
      return levels.medium;
    } else {
      return levels.low;
    }
  }

  /**
   * Check performance and adjust quality if needed
   */
  private checkAndAdjustQuality(): void {
    if (!this.isInitialized()) return;

    const metrics = this.currentMetrics();
    const currentQuality = this.getRecommendedQuality();

    // Only adjust if performance is not optimal
    if (!metrics.isOptimal) {
      this.notifyQualityCallbacks(currentQuality);

      const qualityName = this.getQualityName(currentQuality);
      console.log(
        `Auto-adjusting quality to: ${qualityName} (FPS: ${metrics.frameRate})`
      );
    }
  }

  /**
   * Notify all registered callbacks of quality change
   */
  private notifyQualityCallbacks(quality: PerformanceQuality): void {
    this.qualityAdjustmentCallbacks.forEach((callback) => {
      try {
        callback(quality);
      } catch (error) {
        console.error('Error in quality adjustment callback:', error);
      }
    });
  }

  /**
   * Get quality level name
   */
  private getQualityName(quality: PerformanceQuality): string {
    const levels = this.lodConfig().qualityLevels;

    if (quality === levels.high) return 'high';
    if (quality === levels.medium) return 'medium';
    if (quality === levels.low) return 'low';

    return 'unknown';
  }
}
