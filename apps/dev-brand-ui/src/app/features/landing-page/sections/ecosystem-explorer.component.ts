import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';

@Component({
  selector: 'brand-ecosystem-explorer',
  standalone: true,
  imports: [],
  template: `
    <section
      class="w-full h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 flex flex-col relative overflow-hidden"
    >
      <div class="text-center py-8 px-4 z-10 relative">
        <h2
          class="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent"
        >
          Library Ecosystem
        </h2>
        <p
          class="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed"
        >
          Interactive 3D visualization of our modular architecture with
          {{ libraryCount }} specialized libraries
        </p>
      </div>

      <div class="flex-1 relative">
        <div #ecosystemCanvas class="absolute inset-0"></div>

        <div class="absolute inset-0 pointer-events-none">
          @if (selectedLibrary) {
          <div
            class="absolute top-4 left-4 bg-black/70 backdrop-blur-lg rounded-xl p-6 max-w-sm pointer-events-auto transition-all duration-300"
          >
            <h3 class="text-xl font-semibold text-white mb-2">
              {{ selectedLibrary.name }}
            </h3>
            <p class="text-sm text-white/80 mb-4 leading-relaxed">
              {{ selectedLibrary.description }}
            </p>
            <div class="flex gap-2 mb-4">
              <span
                class="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs border border-purple-500/30"
                >{{ selectedLibrary.type }}</span
              >
              <span
                class="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs border border-blue-500/30"
                >{{ selectedLibrary.dependencies.length }} dependencies</span
              >
            </div>
            <div>
              <h4 class="text-sm font-semibold text-white/90 mb-2">
                Connected Libraries:
              </h4>
              <ul class="space-y-1">
                @for (dep of selectedLibrary.dependencies; track dep) {
                <li class="text-xs text-white/70 pl-2 border-l border-white/20">
                  {{ dep }}
                </li>
                }
              </ul>
            </div>
          </div>
          }

          <div class="absolute bottom-4 right-4 flex gap-2 pointer-events-auto">
            <button
              class="btn-base"
              [class.active]="currentView === 'grid'"
              (click)="switchView('grid')"
            >
              Grid View
            </button>
            <button
              class="btn-base"
              [class.active]="currentView === 'dependency'"
              (click)="switchView('dependency')"
            >
              Dependencies
            </button>
            <button
              class="btn-base"
              [class.active]="currentView === 'layers'"
              (click)="switchView('layers')"
            >
              Layer View
            </button>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .btn-base {
        @apply px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm backdrop-blur-lg transition-all duration-300 hover:bg-white/20 hover:border-white/40;
      }
      .btn-base.active {
        @apply bg-purple-500/30 border-purple-500/50 text-purple-300;
      }
    `,
  ],
})
export class EcosystemExplorerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('ecosystemCanvas', { static: true })
  canvasRef!: ElementRef<HTMLElement>;

  selectedLibrary: any = null;
  currentView = 'grid';
  libraryCount = 14;

  ngAfterViewInit(): void {
    this.initializeScene();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  switchView(view: string): void {
    this.currentView = view;
  }

  private initializeScene(): void {
    // Initialize Three.js scene
  }

  private cleanup(): void {
    // Cleanup Three.js resources
  }
}
