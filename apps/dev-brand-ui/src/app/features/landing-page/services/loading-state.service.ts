import { Injectable, signal, computed } from '@angular/core';
// import { gsap } from 'gsap';

export interface LoadingState {
  isLoading: boolean;
  progress: number;
  stage: string;
  estimatedTime: number;
}

export interface SectionLoadingState {
  sectionId: string;
  isLoaded: boolean;
  loadProgress: number;
  hasError: boolean;
  errorMessage?: string;
}

export interface LoadingStage {
  name: string;
  description: string;
  weight: number; // Relative weight for progress calculation
}

@Injectable({
  providedIn: 'root',
})
export class LoadingStateService {
  private readonly _globalLoadingState = signal<LoadingState>({
    isLoading: true,
    progress: 0,
    stage: 'Initializing',
    estimatedTime: 0,
  });

  private readonly _sectionLoadingStates = signal<SectionLoadingState[]>([]);
  private readonly _loadingStages = signal<LoadingStage[]>([
    {
      name: 'Initializing',
      description: 'Setting up the platform',
      weight: 10,
    },
    {
      name: 'Loading 3D Engine',
      description: 'Preparing Three.js components',
      weight: 20,
    },
    {
      name: 'Loading Hero Section',
      description: 'Agent constellation setup',
      weight: 15,
    },
    {
      name: 'Loading Platform Pillars',
      description: '3D pillar visualization',
      weight: 15,
    },
    {
      name: 'Loading Demo Theater',
      description: 'Interactive demo player',
      weight: 15,
    },
    {
      name: 'Loading Ecosystem Explorer',
      description: 'Library 3D grid',
      weight: 15,
    },
    {
      name: 'Loading Architecture Diagram',
      description: 'Layered architecture view',
      weight: 10,
    },
  ]);

  private loadingStartTime = 0;
  // private stageStartTime = 0;

  readonly globalLoadingState = this._globalLoadingState.asReadonly();
  readonly sectionLoadingStates = this._sectionLoadingStates.asReadonly();
  readonly loadingStages = this._loadingStages.asReadonly();

  readonly isLoading = computed(() => this._globalLoadingState().isLoading);
  readonly loadingProgress = computed(
    () => this._globalLoadingState().progress
  );
  readonly currentStage = computed(() => this._globalLoadingState().stage);

  readonly allSectionsLoaded = computed(() => {
    const sections = this._sectionLoadingStates();
    return sections.length > 0 && sections.every((s) => s.isLoaded);
  });

  readonly hasLoadingErrors = computed(() => {
    return this._sectionLoadingStates().some((s) => s.hasError);
  });

  /**
   * Initialize loading process
   */
  startLoading(): void {
    this.loadingStartTime = performance.now();
    // this.stageStartTime = this.loadingStartTime;

    this._globalLoadingState.set({
      isLoading: true,
      progress: 0,
      stage: 'Initializing',
      estimatedTime: 0,
    });

    // Initialize section loading states
    const sections = [
      'hero',
      'platform-pillars',
      'demo-theater',
      'ecosystem-explorer',
      'architecture-diagram',
    ];
    const sectionStates: SectionLoadingState[] = sections.map((id) => ({
      sectionId: id,
      isLoaded: false,
      loadProgress: 0,
      hasError: false,
    }));

    this._sectionLoadingStates.set(sectionStates);
  }

  /**
   * Update loading stage
   */
  updateStage(stageName: string): void {
    const stages = this._loadingStages();
    const stageIndex = stages.findIndex((s) => s.name === stageName);

    if (stageIndex === -1) return;

    // Calculate progress based on completed stages
    const completedWeight = stages
      .slice(0, stageIndex)
      .reduce((sum, stage) => sum + stage.weight, 0);
    const totalWeight = stages.reduce((sum, stage) => sum + stage.weight, 0);
    const progress = (completedWeight / totalWeight) * 100;

    // Calculate estimated time
    const currentTime = performance.now();
    const elapsedTime = currentTime - this.loadingStartTime;
    const estimatedTotalTime = elapsedTime / (progress / 100);
    const estimatedTimeRemaining = estimatedTotalTime - elapsedTime;

    // this.stageStartTime = currentTime;

    this._globalLoadingState.update((state) => ({
      ...state,
      stage: stageName,
      progress,
      estimatedTime: Math.max(0, estimatedTimeRemaining),
    }));
  }

  /**
   * Update section loading progress
   */
  updateSectionProgress(sectionId: string, progress: number): void {
    this._sectionLoadingStates.update((sections) =>
      sections.map((section) =>
        section.sectionId === sectionId
          ? { ...section, loadProgress: Math.min(100, Math.max(0, progress)) }
          : section
      )
    );
  }

  /**
   * Mark section as loaded
   */
  markSectionLoaded(sectionId: string): void {
    this._sectionLoadingStates.update((sections) =>
      sections.map((section) =>
        section.sectionId === sectionId
          ? { ...section, isLoaded: true, loadProgress: 100, hasError: false }
          : section
      )
    );

    this.checkCompletion();
  }

  /**
   * Mark section as failed
   */
  markSectionError(sectionId: string, errorMessage: string): void {
    this._sectionLoadingStates.update((sections) =>
      sections.map((section) =>
        section.sectionId === sectionId
          ? { ...section, hasError: true, errorMessage, loadProgress: 0 }
          : section
      )
    );
  }

  /**
   * Complete loading process
   */
  completeLoading(): void {
    this._globalLoadingState.update((state) => ({
      ...state,
      isLoading: false,
      progress: 100,
      stage: 'Complete',
      estimatedTime: 0,
    }));
  }

  /**
   * Simulate loading progress for development
   */
  simulateLoading(): Promise<void> {
    return new Promise((resolve) => {
      const stages = this._loadingStages();
      let currentStageIndex = 0;

      const progressStage = () => {
        if (currentStageIndex >= stages.length) {
          this.completeLoading();
          resolve();
          return;
        }

        const stage = stages[currentStageIndex];
        this.updateStage(stage.name);

        // Simulate section loading
        const sectionMap: { [key: string]: string } = {
          'Loading Hero Section': 'hero',
          'Loading Platform Pillars': 'platform-pillars',
          'Loading Demo Theater': 'demo-theater',
          'Loading Ecosystem Explorer': 'ecosystem-explorer',
          'Loading Architecture Diagram': 'architecture-diagram',
        };

        const sectionId = sectionMap[stage.name];
        if (sectionId) {
          // Simulate progressive loading
          let progress = 0;
          const progressInterval = setInterval(() => {
            progress += 20;
            this.updateSectionProgress(sectionId, progress);

            if (progress >= 100) {
              clearInterval(progressInterval);
              this.markSectionLoaded(sectionId);
            }
          }, 100);
        }

        currentStageIndex++;
        setTimeout(progressStage, 800 + Math.random() * 400); // 800-1200ms per stage
      };

      progressStage();
    });
  }

  /**
   * Get section loading summary
   */
  getSectionLoadingSummary(): {
    total: number;
    loaded: number;
    failed: number;
    progress: number;
  } {
    const sections = this._sectionLoadingStates();
    const total = sections.length;
    const loaded = sections.filter((s) => s.isLoaded).length;
    const failed = sections.filter((s) => s.hasError).length;
    const progress = total > 0 ? (loaded / total) * 100 : 0;

    return { total, loaded, failed, progress };
  }

  private checkCompletion(): void {
    if (this.allSectionsLoaded()) {
      setTimeout(() => {
        this.completeLoading();
      }, 500); // Small delay for smooth completion
    }
  }

  /**
   * Reset loading state
   */
  reset(): void {
    this._globalLoadingState.set({
      isLoading: false,
      progress: 0,
      stage: 'Ready',
      estimatedTime: 0,
    });

    this._sectionLoadingStates.set([]);
  }

  /**
   * Export loading performance data
   */
  exportLoadingMetrics(): string {
    const currentTime = performance.now();
    const totalLoadTime = currentTime - this.loadingStartTime;

    const metrics = {
      timestamp: new Date().toISOString(),
      totalLoadTime,
      sectionStates: this._sectionLoadingStates(),
      finalState: this._globalLoadingState(),
      summary: this.getSectionLoadingSummary(),
    };

    return JSON.stringify(metrics, null, 2);
  }
}
