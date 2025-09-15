import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';

@Component({
  selector: 'brand-architecture-diagram',
  standalone: true,
  imports: [],
  template: `
    <section
      class="w-full h-screen bg-gradient-to-br from-slate-800 via-blue-900 to-indigo-900 flex flex-col relative overflow-hidden"
    >
      <div class="text-center py-8 px-4 z-10 relative">
        <h2
          class="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent"
        >
          Architecture Deep Dive
        </h2>
        <p
          class="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed"
        >
          Explore our {{ totalLayers }} layered dependency architecture with
          interactive 3D navigation
        </p>
      </div>

      <div class="flex-1 relative">
        <div #architectureCanvas class="absolute inset-0"></div>

        <div class="absolute inset-0 pointer-events-none">
          @if (selectedLayer) {
          <div
            class="absolute top-4 left-4 bg-black/70 backdrop-blur-lg rounded-xl p-6 max-w-md pointer-events-auto transition-all duration-300"
          >
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xl font-semibold text-white">
                {{ selectedLayer.name }}
              </h3>
              <div
                class="px-2 py-1 rounded text-xs font-semibold border"
                [style.background-color]="selectedLayer.color + '40'"
                [style.border-color]="selectedLayer.color"
                [style.color]="selectedLayer.color"
              >
                Layer {{ selectedLayer.level }}
              </div>
            </div>
            <p class="text-sm text-white/80 mb-4 leading-relaxed">
              {{ selectedLayer.description }}
            </p>
            <div class="grid grid-cols-3 gap-4 mb-4">
              <div class="text-center">
                <div class="text-lg font-bold text-white">
                  {{ selectedLayer.components.length }}
                </div>
                <div class="text-xs text-white/60">Components</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-bold text-white">
                  {{ getDependencyCount(selectedLayer) }}
                </div>
                <div class="text-xs text-white/60">Dependencies</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-bold text-white">
                  {{ getComplexityRating(selectedLayer) }}
                </div>
                <div class="text-xs text-white/60">Complexity</div>
              </div>
            </div>
            <div class="mb-4">
              <h4
                class="text-sm font-semibold text-white/90 mb-2 flex items-center gap-2"
              >
                <span>🧩</span>
                Layer Components
              </h4>
              <div class="space-y-2 max-h-32 overflow-y-auto">
                @for (component of selectedLayer.components; track component.id)
                {
                <div
                  class="flex items-center gap-3 p-2 rounded-lg border border-white/10 cursor-pointer transition-all duration-200 hover:bg-white/10"
                  [style.border-color]="component.color"
                  (click)="focusOnComponent(component)"
                  (mouseenter)="highlightComponent(component)"
                  (mouseleave)="resetComponentHighlight()"
                  (keypress.enter)="focusOnComponent(component)"
                  tabindex="0"
                  role="button"
                  [attr.aria-label]="
                    'Focus on ' + component.name + ' component'
                  "
                >
                  <div
                    class="w-8 h-8 rounded flex items-center justify-center text-sm"
                    [style.background-color]="component.color + '20'"
                  >
                    {{ component.icon || '📦' }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-white truncate">
                      {{ component.name }}
                    </div>
                    <div class="text-xs text-white/60">
                      {{ component.type || 'Component' }}
                    </div>
                  </div>
                  <div
                    class="text-xs px-2 py-1 rounded"
                    [class]="getComponentStatus(component)"
                  >
                    {{ getComponentStatusText(component) }}
                  </div>
                </div>
                }
              </div>
            </div>
            @if (selectedLayer.dependencies?.length > 0) {
            <div>
              <h4
                class="text-sm font-semibold text-white/90 mb-2 flex items-center gap-2"
              >
                <span>🔗</span>
                Layer Dependencies
              </h4>
              <div class="space-y-1">
                @for (dep of selectedLayer.dependencies; track dep) {
                <div
                  class="flex items-center gap-2 text-xs text-white/70 cursor-pointer hover:text-white transition-colors"
                  (click)="navigateToLayer(dep)"
                  (keypress)="navigateToLayer(dep)"
                  tabindex="0"
                >
                  <span>↓</span>
                  <span>{{ getLayerName(dep) }}</span>
                  <span class="ml-auto">Level {{ dep }}</span>
                </div>
                }
              </div>
            </div>
            }
          </div>
          }

          <div class="absolute bottom-4 right-4 space-y-4 pointer-events-auto">
            <div class="flex gap-2 bg-black/70 backdrop-blur-lg rounded-xl p-2">
              <button
                class="btn-small"
                [class.active]="currentView === 'layers'"
                (click)="switchView('layers')"
                title="Stacked layer visualization"
              >
                <span class="block">📚</span>
                <span class="block text-[10px]">Layers</span>
              </button>
              <button
                class="btn-small"
                [class.active]="currentView === 'flow'"
                (click)="switchView('flow')"
                title="Data flow between layers"
              >
                <span class="block">🌊</span>
                <span class="block text-[10px]">Flow</span>
              </button>
              <button
                class="btn-small"
                [class.active]="currentView === 'exploded'"
                (click)="switchView('exploded')"
                title="Separated layer components"
              >
                <span class="block">💥</span>
                <span class="block text-[10px]">Exploded</span>
              </button>
            </div>

            <div class="flex gap-2 bg-black/70 backdrop-blur-lg rounded-xl p-2">
              <button
                class="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-xs transition-all duration-300 hover:bg-white/20"
                (click)="resetView()"
                title="Reset camera position"
              >
                <span class="block">🏠</span>
                <span class="block text-[10px]">Reset</span>
              </button>
              <button
                class="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-xs transition-all duration-300 hover:bg-white/20"
                (click)="toggleAnimation()"
                title="Toggle layer animation"
              >
                <span class="block">{{ isAnimating ? '⏸️' : '▶️' }}</span>
                <span class="block text-[10px]">{{
                  isAnimating ? 'Pause' : 'Play'
                }}</span>
              </button>
              <button
                class="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-xs transition-all duration-300 hover:bg-white/20"
                (click)="exportDiagram()"
                title="Export architecture diagram"
              >
                <span class="block">📸</span>
                <span class="block text-[10px]">Export</span>
              </button>
            </div>
          </div>

          <div
            class="absolute bottom-4 left-4 bg-black/50 backdrop-blur-lg rounded-lg px-3 py-2 pointer-events-auto"
          >
            <p class="text-xs text-white/70">
              🖱️ Click and drag to rotate • 🔍 Scroll to zoom • 📱 Touch to
              explore
            </p>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .btn-small {
        @apply px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-xs transition-all duration-300 hover:bg-white/20;
      }
      .btn-small.active {
        @apply bg-cyan-500/30 border-cyan-500/50 text-cyan-300;
      }
    `,
  ],
})
export class ArchitectureDiagramComponent implements AfterViewInit, OnDestroy {
  @ViewChild('architectureCanvas', { static: true })
  canvasRef!: ElementRef<HTMLElement>;

  selectedLayer: any = null;
  currentView = 'layers';
  totalLayers = 6;
  isAnimating = false;

  ngAfterViewInit(): void {
    this.initializeScene();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  switchView(view: string): void {
    this.currentView = view;
  }

  resetView(): void {
    // Reset camera position
  }

  toggleAnimation(): void {
    this.isAnimating = !this.isAnimating;
  }

  exportDiagram(): void {
    // Export diagram functionality
  }

  getDependencyCount(layer: any): number {
    return layer.dependencies?.length || 0;
  }

  getComplexityRating(layer: any): string {
    return layer.complexity || 'Medium';
  }

  getComponentStatus(component: any): string {
    return component.status || 'active';
  }

  getComponentStatusText(component: any): string {
    return component.statusText || 'Active';
  }

  getLayerName(level: number): string {
    return `Layer ${level}`;
  }

  focusOnComponent(component: any): void {
    // Focus on component
  }

  highlightComponent(component: any): void {
    // Highlight component
  }

  resetComponentHighlight(): void {
    // Reset highlight
  }

  navigateToLayer(level: number): void {
    // Navigate to layer
  }

  private initializeScene(): void {
    // Initialize Three.js scene
  }

  private cleanup(): void {
    // Cleanup Three.js resources
  }
}
