import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { InterfaceMode } from '../interfaces/agent-state.interface';

export interface InterfaceModeStoreState {
  // Interface Mode Management
  currentMode: InterfaceMode;
  previousMode: InterfaceMode | null;
  transitionProgress: number;
  isTransitioning: boolean;
  availableModes: InterfaceMode[];

  // 3D Scene State
  sceneInitialized: boolean;
  renderLoopActive: boolean;

  // Performance Monitoring
  frameRate: number;
  memoryUsage: number;
  lastPerformanceCheck: Date | null;
}

const initialState: InterfaceModeStoreState = {
  currentMode: 'chat',
  previousMode: null,
  transitionProgress: 0,
  isTransitioning: false,
  availableModes: ['chat', 'spatial', 'canvas', 'memory', 'forge'],
  sceneInitialized: false,
  renderLoopActive: false,
  frameRate: 60,
  memoryUsage: 0,
  lastPerformanceCheck: null,
};

/**
 * Interface Mode Store
 * Manages transitions between different interface modes with performance monitoring
 * Supports the DevBrand revolutionary UX vision
 */
export const InterfaceModeStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    // Interface mode checks
    isChatMode: computed(() => store.currentMode() === 'chat'),
    isSpatialMode: computed(() => store.currentMode() === 'spatial'),
    isCanvasMode: computed(() => store.currentMode() === 'canvas'),
    isMemoryMode: computed(() => store.currentMode() === 'memory'),
    isForgeMode: computed(() => store.currentMode() === 'forge'),

    // 3D mode check
    requires3D: computed(() =>
      ['spatial', 'memory', 'forge'].includes(store.currentMode())
    ),

    // Performance status
    performanceGood: computed(
      () => store.frameRate() >= 30 && store.memoryUsage() < 100
    ),

    // Transition state
    canTransition: computed(
      () => !store.isTransitioning() && store.transitionProgress() === 0
    ),

    // Mode availability
    modeConfig: computed(() => ({
      chat: {
        name: 'Chat Studio',
        description: 'Real-time agent communication',
        icon: 'chat',
        requires3D: false,
        primaryColor: '#3B82F6',
      },
      spatial: {
        name: 'Agent Constellation',
        description: '3D spatial agent interaction',
        icon: 'scatter_plot',
        requires3D: true,
        primaryColor: '#8B5CF6',
      },
      canvas: {
        name: 'Workflow Canvas',
        description: 'Living workflow visualization',
        icon: 'account_tree',
        requires3D: false,
        primaryColor: '#10B981',
      },
      memory: {
        name: 'Memory Constellation',
        description: 'Brand DNA visualization',
        icon: 'psychology',
        requires3D: true,
        primaryColor: '#F59E0B',
      },
      forge: {
        name: 'Content Forge',
        description: 'Collaborative content creation',
        icon: 'build',
        requires3D: true,
        primaryColor: '#EF4444',
      },
    })),
  })),
  withMethods((store, router = inject(Router)) => ({
    /**
     * Switch to a different interface mode
     */
    switchMode: (targetMode: InterfaceMode) => {
      if (!store.canTransition()) {
        console.warn('Cannot switch mode: transition in progress');
        return;
      }

      if (!store.availableModes().includes(targetMode)) {
        console.warn(`Mode ${targetMode} not available`);
        return;
      }

      const currentMode = store.currentMode();
      if (currentMode === targetMode) {
        return; // Already in target mode
      }

      // Start transition
      patchState(store, {
        previousMode: currentMode,
        isTransitioning: true,
        transitionProgress: 0,
      });

      // Navigate to new route
      router.navigate([`/${targetMode}`]);

      // Simulate transition progress (in real implementation, this would be tied to actual transition animations)
      const progressInterval = setInterval(() => {
        const currentProgress = store.transitionProgress();
        const newProgress = Math.min(currentProgress + 10, 100);

        patchState(store, {
          transitionProgress: newProgress,
        });

        if (newProgress >= 100) {
          clearInterval(progressInterval);
          patchState(store, {
            currentMode: targetMode,
            isTransitioning: false,
            transitionProgress: 0,
          });
        }
      }, 50); // 500ms total transition
    },

    /**
     * Initialize 3D scene
     */
    initializeScene: () => {
      if (store.sceneInitialized()) {
        return;
      }

      patchState(store, {
        sceneInitialized: true,
        renderLoopActive: true,
        lastPerformanceCheck: new Date(),
      });
    },

    /**
     * Cleanup 3D scene
     */
    cleanupScene: () => {
      patchState(store, {
        sceneInitialized: false,
        renderLoopActive: false,
      });
    },

    /**
     * Update performance metrics
     */
    updatePerformance: (frameRate: number, memoryUsage: number) => {
      patchState(store, {
        frameRate,
        memoryUsage,
        lastPerformanceCheck: new Date(),
      });
    },

    /**
     * Reset transition state (for error recovery)
     */
    resetTransition: () => {
      patchState(store, {
        isTransitioning: false,
        transitionProgress: 0,
      });
    },

    /**
     * Set available modes (dynamic availability based on system capabilities)
     */
    setAvailableModes: (modes: InterfaceMode[]) => {
      patchState(store, {
        availableModes: modes,
      });
    },

    /**
     * Force mode without transition (for direct navigation)
     */
    setModeDirectly: (mode: InterfaceMode) => {
      patchState(store, {
        currentMode: mode,
        previousMode: store.currentMode(),
        isTransitioning: false,
        transitionProgress: 0,
      });
    },
  }))
);
