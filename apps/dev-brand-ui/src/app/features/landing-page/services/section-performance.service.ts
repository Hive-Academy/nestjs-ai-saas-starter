import { inject, Injectable, signal } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { filter } from 'rxjs/operators';
import * as THREE from 'three';

interface GSAPTimeline {
  kill(): void;
}

interface SectionPerformanceMetrics {
  sectionId: string;
  loadTime: number;
  memoryUsage: number;
  frameRate: number;
  threeJsObjects: number;
}

interface ActiveSection {
  id: string;
  renderer?: THREE.WebGLRenderer;
  scene?: THREE.Scene;
  camera?: THREE.Camera;
  animationFrame?: number;
  timeline?: GSAPTimeline;
  loadStartTime: number;
}

@Injectable({
  providedIn: 'root'
})
export class SectionPerformanceService {
  private readonly _activeSection = signal<ActiveSection | null>(null);
  private readonly _performanceMetrics = signal<SectionPerformanceMetrics[]>([]);
  private readonly _isOptimized = signal(true);

  // Memory and performance tracking
  private memoryCheckInterval?: number;
  private frameRateMonitor?: number;

  readonly activeSection = this._activeSection.asReadonly();
  readonly performanceMetrics = this._performanceMetrics.asReadonly();
  readonly isOptimized = this._isOptimized.asReadonly();

  readonly router = inject(Router);
  constructor() {
    this.setupRouteCleanup();
    this.startPerformanceMonitoring();
  }

  /**
   * Register a section when it loads
   */
  registerSection(
    sectionId: string,
    renderer?: THREE.WebGLRenderer,
    scene?: THREE.Scene,
    camera?: THREE.Camera
  ): void {
    // Clean up previous section if exists
    this.cleanupActiveSection();

    // Register new section
    const activeSection: ActiveSection = {
      id: sectionId,
      renderer,
      scene,
      camera,
      loadStartTime: performance.now()
    };

    this._activeSection.set(activeSection);

    // Start monitoring this section
    this.startSectionMonitoring(sectionId);
  }

  /**
   * Register GSAP timeline for cleanup
   */
  registerTimeline(timeline: GSAPTimeline): void {
    const active = this._activeSection();
    if (active) {
      active.timeline = timeline;
      this._activeSection.set({ ...active });
    }
  }

  /**
   * Register animation frame for cleanup
   */
  registerAnimationFrame(frameId: number): void {
    const active = this._activeSection();
    if (active) {
      active.animationFrame = frameId;
      this._activeSection.set({ ...active });
    }
  }

  /**
   * Optimize performance for current section
   */
  optimizeSection(level: 'low' | 'medium' | 'high' = 'medium'): void {
    const active = this._activeSection();
    if (!active?.renderer) return;

    const renderer = active.renderer;

    switch (level) {
      case 'low':
        // Minimal quality for maximum performance
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
        renderer.shadowMap.enabled = false;
        // renderer.a = false;
        break;

      case 'medium':
        // Balanced quality and performance
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        break;

      case 'high':
        // Maximum quality
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        break;
    }

    renderer.compile(active.scene!, active.camera!);
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): SectionPerformanceMetrics | null {
    const active = this._activeSection();
    if (!active) return null;

    const metrics = this._performanceMetrics().find(m => m.sectionId === active.id);
    return metrics || null;
  }

  /**
   * Check if current section is performing well
   */
  isPerformanceGood(): boolean {
    const metrics = this.getCurrentMetrics();
    if (!metrics) return true;

    return (
      metrics.frameRate >= 55 && // Minimum 55 FPS
      metrics.loadTime <= 3000 && // Maximum 3 seconds load time
      metrics.memoryUsage <= 100 // Maximum 100MB memory usage
    );
  }

  private setupRouteCleanup(): void {
    // Clean up when navigating away from landing pages
    this.router.events
      .pipe(filter(event => event instanceof NavigationStart))
      .subscribe((event: NavigationStart) => {
        if (!event.url.includes('/landing/')) {
          this.cleanupActiveSection();
        }
      });
  }

  private cleanupActiveSection(): void {
    const active = this._activeSection();
    if (!active) return;

    console.log(`🧹 Cleaning up section: ${active.id}`);

    // Cancel animation frame
    if (active.animationFrame) {
      cancelAnimationFrame(active.animationFrame);
    }

    // Kill GSAP timeline
    if (active.timeline) {
      active.timeline.kill();
    }

    // Dispose Three.js resources
    if (active.scene) {
      this.disposeThreeJsScene(active.scene);
    }

    if (active.renderer) {
      active.renderer.dispose();
      active.renderer.forceContextLoss();
    }

    // Clear active section
    this._activeSection.set(null);

    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  private disposeThreeJsScene(scene: THREE.Scene): void {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }

        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => {
              if (material.map) material.map.dispose();
              if (material.normalMap) material.normalMap.dispose();
              if (material.emissiveMap) material.emissiveMap.dispose();
              material.dispose();
            });
          } else {
            if (object.material.map) object.material.map.dispose();
            if (object.material.normalMap) object.material.normalMap.dispose();
            if (object.material.emissiveMap) object.material.emissiveMap.dispose();
            object.material.dispose();
          }
        }
      }
    });

    scene.clear();
  }

  private startSectionMonitoring(sectionId: string): void {
    const startTime = performance.now();
    let frameCount = 0;
    let lastTime = startTime;

    const monitorFrame = (currentTime: number) => {
      frameCount++;
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= 1000) { // Update every second
        const fps = Math.round((frameCount * 1000) / deltaTime);
        const memoryUsage = this.getMemoryUsage();
        const loadTime = currentTime - startTime;

        const metrics: SectionPerformanceMetrics = {
          sectionId,
          loadTime,
          memoryUsage,
          frameRate: fps,
          threeJsObjects: this.countThreeJsObjects()
        };

        this.updateMetrics(metrics);

        frameCount = 0;
        lastTime = currentTime;
      }

      const active = this._activeSection();
      if (active?.id === sectionId) {
        this.frameRateMonitor = requestAnimationFrame(monitorFrame);
      }
    };

    this.frameRateMonitor = requestAnimationFrame(monitorFrame);
  }

  private startPerformanceMonitoring(): void {
    // Monitor memory usage every 5 seconds
    this.memoryCheckInterval = window.setInterval(() => {
      const memoryUsage = this.getMemoryUsage();
      const isOptimized = memoryUsage <= 150; // 150MB threshold

      this._isOptimized.set(isOptimized);

      if (!isOptimized) {
        console.warn(`⚠️ High memory usage detected: ${memoryUsage.toFixed(2)}MB`);
        this.attemptMemoryOptimization();
      }
    }, 5000);
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }
    return 0;
  }

  private countThreeJsObjects(): number {
    const active = this._activeSection();
    if (!active?.scene) return 0;

    let count = 0;
    active.scene.traverse(() => count++);
    return count;
  }

  private updateMetrics(metrics: SectionPerformanceMetrics): void {
    this._performanceMetrics.update(current => {
      const existing = current.findIndex(m => m.sectionId === metrics.sectionId);
      if (existing >= 0) {
        current[existing] = metrics;
        return [...current];
      } else {
        return [...current, metrics];
      }
    });
  }

  private attemptMemoryOptimization(): void {
    const active = this._activeSection();
    if (!active?.renderer) return;

    // Reduce texture resolution
    if (active.scene) {
      active.scene.traverse((object) => {
        if (object instanceof THREE.Mesh && object.material) {
          const material = object.material as THREE.MeshStandardMaterial;
          if (material.map && material.map.image) {
            // Force texture to half resolution
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            const img = material.map.image;

            canvas.width = img.width / 2;
            canvas.height = img.height / 2;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const newTexture = new THREE.CanvasTexture(canvas);
            material.map.dispose();
            material.map = newTexture;
          }
        }
      });
    }

    // Force garbage collection
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  destroy(): void {
    this.cleanupActiveSection();

    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }

    if (this.frameRateMonitor) {
      cancelAnimationFrame(this.frameRateMonitor);
    }
  }
}
