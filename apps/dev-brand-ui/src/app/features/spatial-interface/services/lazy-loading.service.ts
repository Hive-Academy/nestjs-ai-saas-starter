import { Injectable } from '@angular/core';
import { BehaviorSubject, from, Observable, of } from 'rxjs';
import { map, shareReplay, catchError, tap } from 'rxjs/operators';

export interface LazyModule {
  name: string;
  loader: () => Promise<any>;
  isLoaded: boolean;
  loadTime?: number;
}

/**
 * Lazy Loading Service
 * Manages dynamic imports and module loading for performance optimization
 */
@Injectable({
  providedIn: 'root',
})
export class LazyLoadingService {
  private loadedModules = new Map<string, any>();
  private loadingStatus = new Map<string, BehaviorSubject<boolean>>();

  // Performance metrics
  private loadingMetrics = new Map<
    string,
    { startTime: number; endTime?: number }
  >();

  /**
   * Register available lazy modules
   */
  private readonly availableModules: LazyModule[] = [
    {
      name: 'orbitControls',
      loader: () => import('three/examples/jsm/controls/OrbitControls.js'),
      isLoaded: false,
    },
    {
      name: 'postProcessing',
      loader: () =>
        import('three/examples/jsm/postprocessing/EffectComposer.js'),
      isLoaded: false,
    },
    {
      name: 'gltfLoader',
      loader: () => import('three/examples/jsm/loaders/GLTFLoader.js'),
      isLoaded: false,
    },
    {
      name: 'statsJs',
      loader: () => import('three/examples/jsm/libs/stats.module.js'),
      isLoaded: false,
    },
    {
      name: 'datGui',
      loader: () => import('three/examples/jsm/libs/lil-gui.module.min.js'),
      isLoaded: false,
    },
  ];

  /**
   * Load a module lazily
   */
  loadModule<T = any>(moduleName: string): Observable<T> {
    // Return cached module if already loaded
    if (this.loadedModules.has(moduleName)) {
      return of(this.loadedModules.get(moduleName));
    }

    // Return existing observable if currently loading
    if (this.loadingStatus.has(moduleName)) {
      const status$ = this.loadingStatus.get(moduleName)!;
      return status$.pipe(
        map(() => this.loadedModules.get(moduleName)),
        shareReplay(1)
      );
    }

    const module = this.availableModules.find((m) => m.name === moduleName);
    if (!module) {
      throw new Error(`Module '${moduleName}' not found in available modules`);
    }

    // Create loading status observable
    const loadingSubject = new BehaviorSubject<boolean>(false);
    this.loadingStatus.set(moduleName, loadingSubject);

    // Start loading metrics
    this.loadingMetrics.set(moduleName, { startTime: performance.now() });

    return from(module.loader()).pipe(
      tap(() => {
        // Update loading metrics
        const metrics = this.loadingMetrics.get(moduleName);
        if (metrics) {
          metrics.endTime = performance.now();
          module.loadTime = metrics.endTime - metrics.startTime;
        }
      }),
      map((loadedModule) => {
        // Cache the loaded module
        this.loadedModules.set(moduleName, loadedModule);
        module.isLoaded = true;

        // Update loading status
        loadingSubject.next(true);
        loadingSubject.complete();
        this.loadingStatus.delete(moduleName);

        return loadedModule as T;
      }),
      catchError((error) => {
        console.error(`Failed to load module '${moduleName}':`, error);

        // Clean up loading status
        loadingSubject.error(error);
        this.loadingStatus.delete(moduleName);

        throw error;
      }),
      shareReplay(1)
    );
  }

  /**
   * Check if a module is loaded
   */
  isModuleLoaded(moduleName: string): boolean {
    return this.loadedModules.has(moduleName);
  }

  /**
   * Check if a module is currently loading
   */
  isModuleLoading(moduleName: string): boolean {
    return this.loadingStatus.has(moduleName);
  }

  /**
   * Get loading status observable for a module
   */
  getLoadingStatus(moduleName: string): Observable<boolean> {
    const status$ = this.loadingStatus.get(moduleName);
    return status$
      ? status$.asObservable()
      : of(this.isModuleLoaded(moduleName));
  }

  /**
   * Preload modules that are likely to be needed
   */
  preloadModules(moduleNames: string[]): Observable<any[]> {
    const preloadObservables = moduleNames.map((name) =>
      this.loadModule(name).pipe(
        catchError((error) => {
          console.warn(`Preload failed for module '${name}':`, error);
          return of(null); // Continue with other modules
        })
      )
    );

    return from(Promise.all(preloadObservables.map((obs) => obs.toPromise())));
  }

  /**
   * Get performance metrics for loaded modules
   */
  getLoadingMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {};

    this.availableModules.forEach((module) => {
      if (module.loadTime !== undefined) {
        metrics[module.name] = module.loadTime;
      }
    });

    return metrics;
  }

  /**
   * Clear cached modules (useful for development/testing)
   */
  clearCache(): void {
    this.loadedModules.clear();
    this.loadingStatus.forEach((subject) => subject.complete());
    this.loadingStatus.clear();
    this.loadingMetrics.clear();

    // Reset module states
    this.availableModules.forEach((module) => {
      module.isLoaded = false;
      module.loadTime = undefined;
    });
  }

  /**
   * Get list of available modules
   */
  getAvailableModules(): LazyModule[] {
    return [...this.availableModules];
  }

  /**
   * Get memory usage estimate
   */
  getMemoryUsage(): { loadedModules: number; estimatedMemoryMB: number } {
    const loadedCount = this.loadedModules.size;
    const estimatedMemoryMB = loadedCount * 0.5; // Rough estimate: 500KB per module

    return {
      loadedModules: loadedCount,
      estimatedMemoryMB: Math.round(estimatedMemoryMB * 100) / 100,
    };
  }
}
