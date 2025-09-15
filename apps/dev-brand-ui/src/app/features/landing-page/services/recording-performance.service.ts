import { Injectable, signal, computed } from '@angular/core';
import { gsap } from 'gsap';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  renderTime: number;
  frameDrops: number;
  gpuMemory?: number;
}

export interface RecordingQualityConfig {
  targetFps: number;
  particleDensity: number;
  shadowQuality: 'low' | 'medium' | 'high';
  antiAliasing: boolean;
  motionBlur: boolean;
  bloomEffect: boolean;
  enableGpuAcceleration: boolean;
}

export interface OptimizationLevel {
  name: string;
  config: RecordingQualityConfig;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class RecordingPerformanceService {
  private readonly _isRecordingMode = signal(false);
  private readonly _currentMetrics = signal<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    renderTime: 0,
    frameDrops: 0
  });
  private readonly _optimizationLevel = signal<OptimizationLevel>(this.getOptimalConfig());

  // Performance monitoring
  private performanceMonitor?: number;
  private frameCount = 0;
  private lastTime = performance.now();
  private frameDropThreshold = 55; // Consider <55fps as dropped frames

  // Optimization configurations
  private readonly optimizationLevels: OptimizationLevel[] = [
    {
      name: 'Ultra Quality',
      config: {
        targetFps: 60,
        particleDensity: 1.0,
        shadowQuality: 'high',
        antiAliasing: true,
        motionBlur: true,
        bloomEffect: true,
        enableGpuAcceleration: true
      },
      description: 'Maximum visual quality for high-end recording setups'
    },
    {
      name: 'Balanced Quality',
      config: {
        targetFps: 60,
        particleDensity: 0.7,
        shadowQuality: 'medium',
        antiAliasing: true,
        motionBlur: false,
        bloomEffect: true,
        enableGpuAcceleration: true
      },
      description: 'Balanced quality and performance for most recording scenarios'
    },
    {
      name: 'Performance',
      config: {
        targetFps: 60,
        particleDensity: 0.4,
        shadowQuality: 'low',
        antiAliasing: false,
        motionBlur: false,
        bloomEffect: false,
        enableGpuAcceleration: true
      },
      description: 'Optimized for consistent 60fps recording on lower-end hardware'
    },
    {
      name: 'Recording Optimized',
      config: {
        targetFps: 60,
        particleDensity: 0.2,
        shadowQuality: 'low',
        antiAliasing: false,
        motionBlur: false,
        bloomEffect: false,
        enableGpuAcceleration: true
      },
      description: 'Maximum performance for smooth screen recording'
    }
  ];

  readonly isRecordingMode = this._isRecordingMode.asReadonly();
  readonly currentMetrics = this._currentMetrics.asReadonly();
  readonly optimizationLevel = this._optimizationLevel.asReadonly();

  readonly isPerformanceOptimal = computed(() => {
    const metrics = this._currentMetrics();
    const config = this._optimizationLevel().config;
    return metrics.fps >= config.targetFps - 5; // 5fps tolerance
  });

  readonly performanceGrade = computed(() => {
    const fps = this._currentMetrics().fps;
    if (fps >= 58) return 'A';
    if (fps >= 50) return 'B';
    if (fps >= 40) return 'C';
    if (fps >= 30) return 'D';
    return 'F';
  });

  readonly availableOptimizations = this.optimizationLevels;

  /**
   * Enable recording mode with performance optimizations
   */
  enableRecordingMode(levelName?: string): void {
    this._isRecordingMode.set(true);

    if (levelName) {
      this.setOptimizationLevel(levelName);
    }

    this.applyOptimizations();
    this.startPerformanceMonitoring();
  }

  /**
   * Disable recording mode and restore normal settings
   */
  disableRecordingMode(): void {
    this._isRecordingMode.set(false);
    this.stopPerformanceMonitoring();
    this.restoreNormalSettings();
  }

  /**
   * Set optimization level
   */
  setOptimizationLevel(levelName: string): void {
    const level = this.optimizationLevels.find(l => l.name === levelName);
    if (level) {
      this._optimizationLevel.set(level);
      if (this._isRecordingMode()) {
        this.applyOptimizations();
      }
    }
  }

  /**
   * Auto-adjust optimization based on current performance
   */
  autoAdjustOptimization(): void {
    const currentFps = this._currentMetrics().fps;
    const targetFps = this._optimizationLevel().config.targetFps;

    if (currentFps < targetFps - 10) {
      // Performance is poor, move to more optimized level
      const currentIndex = this.optimizationLevels.findIndex(
        l => l.name === this._optimizationLevel().name
      );

      if (currentIndex < this.optimizationLevels.length - 1) {
        this.setOptimizationLevel(this.optimizationLevels[currentIndex + 1].name);
      }
    } else if (currentFps > targetFps + 5) {
      // Performance is good, can move to higher quality
      const currentIndex = this.optimizationLevels.findIndex(
        l => l.name === this._optimizationLevel().name
      );

      if (currentIndex > 0) {
        this.setOptimizationLevel(this.optimizationLevels[currentIndex - 1].name);
      }
    }
  }

  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations(): string[] {
    const metrics = this._currentMetrics();
    const recommendations: string[] = [];

    if (metrics.fps < 50) {
      recommendations.push('Consider reducing particle density');
      recommendations.push('Disable motion blur and bloom effects');
      recommendations.push('Lower shadow quality to improve performance');
    }

    if (metrics.frameDrops > 10) {
      recommendations.push('Enable GPU acceleration if available');
      recommendations.push('Close other applications to free up resources');
    }

    if (metrics.memoryUsage > 80) {
      recommendations.push('Reduce particle count and effect complexity');
      recommendations.push('Consider restarting the browser to clear memory');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is optimal for recording');
    }

    return recommendations;
  }

  /**
   * Export performance report for analysis
   */
  exportPerformanceReport(): string {
    const metrics = this._currentMetrics();
    const config = this._optimizationLevel();

    const report = {
      timestamp: new Date().toISOString(),
      optimizationLevel: config.name,
      configuration: config.config,
      metrics: metrics,
      grade: this.performanceGrade(),
      isOptimal: this.isPerformanceOptimal(),
      recommendations: this.getPerformanceRecommendations()
    };

    return JSON.stringify(report, null, 2);
  }

  private getOptimalConfig(): OptimizationLevel {
    // Detect hardware capabilities and return optimal config
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

    if (!gl) {
      return this.optimizationLevels[3]; // Recording Optimized
    }

    // Check for high-performance GPU indicators
    const renderer = gl.getParameter(gl.RENDERER);
    // const vendor = gl.getParameter(gl.VENDOR);

    if (renderer.includes('RTX') || renderer.includes('GTX 1080') || renderer.includes('RX 6')) {
      return this.optimizationLevels[0]; // Ultra Quality
    } else if (renderer.includes('GTX') || renderer.includes('RX')) {
      return this.optimizationLevels[1]; // Balanced Quality
    } else {
      return this.optimizationLevels?.[2]; // Performance
    }
  }

  private applyOptimizations(): void {
    const config = this._optimizationLevel().config;
    const root = document.documentElement;

    // Apply CSS custom properties for optimization
    root.style.setProperty('--particle-density', config.particleDensity.toString());
    root.style.setProperty('--shadow-quality', config.shadowQuality);
    root.style.setProperty('--anti-aliasing', config.antiAliasing ? 'enabled' : 'disabled');
    root.style.setProperty('--motion-blur', config.motionBlur ? 'enabled' : 'disabled');
    root.style.setProperty('--bloom-effect', config.bloomEffect ? 'enabled' : 'disabled');
    root.style.setProperty('--gpu-acceleration', config.enableGpuAcceleration ? 'enabled' : 'disabled');

    // Apply global optimization classes
    document.body.classList.toggle('recording-optimized', this._isRecordingMode());
    document.body.classList.toggle('performance-mode', config.particleDensity < 0.5);

    // Optimize GSAP settings for recording
    gsap.config({
      force3D: config.enableGpuAcceleration,
      autoSleep: 60,
      // lag: this._isRecordingMode() ? 0.5 : 2, // Reduce lag tolerance during recording
    });
  }

  private restoreNormalSettings(): void {
    const root = document.documentElement;

    // Reset CSS custom properties
    root.style.removeProperty('--particle-density');
    root.style.removeProperty('--shadow-quality');
    root.style.removeProperty('--anti-aliasing');
    root.style.removeProperty('--motion-blur');
    root.style.removeProperty('--bloom-effect');
    root.style.removeProperty('--gpu-acceleration');

    // Remove optimization classes
    document.body.classList.remove('recording-optimized', 'performance-mode');

    // Restore GSAP defaults
    gsap.config({
      force3D: 'auto',
      autoSleep: 60,
      // lag: 2
    });
  }

  private startPerformanceMonitoring(): void {
    this.frameCount = 0;
    this.lastTime = performance.now();

    const monitor = (currentTime: number) => {
      this.frameCount++;
      const deltaTime = currentTime - this.lastTime;

      if (deltaTime >= 1000) {
        const fps = Math.round((this.frameCount * 1000) / deltaTime);
        const frameTime = deltaTime / this.frameCount;
        const frameDrops = fps < this.frameDropThreshold ?
          this._currentMetrics().frameDrops + 1 : this._currentMetrics().frameDrops;

        // Get memory usage if available
        let memoryUsage = 0;
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          memoryUsage = Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100);
        }

        this._currentMetrics.set({
          fps,
          frameTime,
          memoryUsage,
          renderTime: frameTime,
          frameDrops
        });

        // Auto-adjust optimization if performance is poor
        if (fps < this._optimizationLevel().config.targetFps - 10) {
          this.autoAdjustOptimization();
        }

        this.frameCount = 0;
        this.lastTime = currentTime;
      }

      this.performanceMonitor = requestAnimationFrame(monitor);
    };

    this.performanceMonitor = requestAnimationFrame(monitor);
  }

  private stopPerformanceMonitoring(): void {
    if (this.performanceMonitor) {
      cancelAnimationFrame(this.performanceMonitor);
      this.performanceMonitor = undefined;
    }
  }

  destroy(): void {
    this.stopPerformanceMonitoring();
    this.restoreNormalSettings();
  }
}
