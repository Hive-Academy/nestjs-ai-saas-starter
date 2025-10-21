/**
 * Library Detail Page Component
 *
 * Displays comprehensive information for a single library including:
 * - Features, use cases, examples
 * - Metrics, architecture, installation
 */
import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  signal,
  afterNextRender,
  Injector,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LibraryDataService, Library } from './library-data.service';

let gsap: any;
let ScrollTrigger: any;

@Component({
  selector: 'app-library-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div
      class="min-h-screen bg-gradient-to-br from-gray-900/95 via-black to-gray-900/95 text-white"
    >
      @if (library(); as lib) {
      <!-- Header -->
      <header
        class="relative overflow-hidden bg-gradient-to-br from-{{
          lib.color
        }}-900/30 via-black to-gray-900/30 py-20"
      >
        <div class="container mx-auto px-8 relative z-10">
          <!-- Back Button -->
          <button
            (click)="goBack()"
            class="mb-8 flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <span class="text-2xl">←</span>
            <span>Back to Landing Page</span>
          </button>

          <!-- Hero -->
          <div class="fade-in-element max-w-5xl">
            <div class="flex items-center gap-4 mb-6">
              <span class="text-7xl">{{ lib.icon }}</span>
              <div>
                <div class="flex items-center gap-3 mb-2">
                  <h1
                    class="text-5xl md:text-6xl font-bold bg-gradient-to-r from-{{
                      lib.color
                    }}-400 via-{{ lib.color }}-500 to-{{
                      lib.color
                    }}-600 bg-clip-text text-transparent"
                  >
                    {{ lib.name }}
                  </h1>
                  <span
                    class="px-3 py-1 rounded-full text-xs font-semibold"
                    [ngClass]="{
                      'bg-green-500/20 text-green-400 border border-green-400/30':
                        lib.status === 'production',
                      'bg-blue-500/20 text-blue-400 border border-blue-400/30':
                        lib.status === 'beta',
                      'bg-orange-500/20 text-orange-400 border border-orange-400/30':
                        lib.status === 'alpha'
                    }"
                  >
                    {{ lib.status.toUpperCase() }}
                  </span>
                </div>
                <p class="text-2xl text-{{ lib.color }}-300 mb-3">
                  {{ lib.tagline }}
                </p>
                <p class="text-lg text-white/60">v{{ lib.version }}</p>
              </div>
            </div>
            <p class="text-xl text-white/80 leading-relaxed">
              {{ lib.description }}
            </p>
          </div>
        </div>
      </header>

      <!-- Metrics Bar -->
      <section
        class="bg-black/50 py-8 border-y border-white/10 fade-in-element"
      >
        <div class="container mx-auto px-8">
          <div class="grid md:grid-cols-3 gap-8">
            @for (metric of lib.metrics; track metric.label) {
            <div class="text-center">
              <div class="text-3xl font-bold text-{{ lib.color }}-400 mb-2">
                {{ metric.value }}
              </div>
              <div class="text-sm text-white/70 font-semibold mb-1">
                {{ metric.label }}
              </div>
              @if (metric.description) {
              <div class="text-xs text-white/50">{{ metric.description }}</div>
              }
            </div>
            }
          </div>
        </div>
      </section>

      <!-- Main Content -->
      <div class="container mx-auto px-8 py-16">
        <div class="grid lg:grid-cols-3 gap-12">
          <!-- Left Column: Features & Use Cases -->
          <div class="lg:col-span-2 space-y-12">
            <!-- Features -->
            <section class="fade-in-element">
              <h2 class="text-4xl font-bold mb-8 text-{{ lib.color }}-400">
                ✨ Features
              </h2>
              <div class="grid md:grid-cols-2 gap-6">
                @for (feature of lib.features; track feature.title) {
                <div
                  class="bg-{{
                    lib.color
                  }}-600/20 backdrop-blur-sm border border-{{
                    lib.color
                  }}-400/30 rounded-xl p-6 hover:bg-{{
                    lib.color
                  }}-600/30 hover:-translate-y-1 transition-all duration-300"
                >
                  <div class="flex items-start gap-3 mb-3">
                    @if (feature.icon) {
                    <span class="text-3xl">{{ feature.icon }}</span>
                    }
                    <h3 class="text-xl font-bold text-{{ lib.color }}-300">
                      {{ feature.title }}
                    </h3>
                  </div>
                  <p class="text-white/70">{{ feature.description }}</p>
                </div>
                }
              </div>
            </section>

            <!-- Use Cases -->
            <section class="fade-in-element">
              <h2 class="text-4xl font-bold mb-8 text-{{ lib.color }}-400">
                🎯 Use Cases
              </h2>
              <div class="grid md:grid-cols-2 gap-4">
                @for (useCase of lib.useCases; track useCase) {
                <div
                  class="flex items-center gap-3 bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
                >
                  <span class="text-{{ lib.color }}-400 text-xl">▸</span>
                  <span class="text-white/80">{{ useCase }}</span>
                </div>
                }
              </div>
            </section>

            <!-- Examples -->
            @if (lib.examples && lib.examples.length > 0) {
            <section class="fade-in-element">
              <h2 class="text-4xl font-bold mb-8 text-{{ lib.color }}-400">
                📝 Code Examples
              </h2>
              @for (example of lib.examples; track example.title) {
              <div class="mb-6">
                <h3 class="text-2xl font-bold text-white mb-3">
                  {{ example.title }}
                </h3>
                @if (example.description) {
                <p class="text-white/70 mb-4">{{ example.description }}</p>
                }
                <div
                  class="bg-black/50 rounded-xl p-6 border border-{{
                    lib.color
                  }}-400/30 overflow-x-auto"
                >
                  <pre
                    class="text-sm text-{{ lib.color }}-300"
                  ><code>{{ example.code }}</code></pre>
                </div>
              </div>
              }
            </section>
            }
          </div>

          <!-- Right Column: Quick Info -->
          <div class="space-y-8">
            <!-- Installation -->
            @if (lib.installation) {
            <div
              class="bg-gradient-to-br from-{{
                lib.color
              }}-900/30 to-black border border-{{
                lib.color
              }}-400/30 rounded-xl p-6 fade-in-element"
            >
              <h3 class="text-2xl font-bold mb-4 text-{{ lib.color }}-300">
                📦 Installation
              </h3>
              <div class="bg-black/50 rounded-lg p-4">
                <code class="text-sm text-{{ lib.color }}-400">{{
                  lib.installation
                }}</code>
              </div>
            </div>
            }

            <!-- Architecture -->
            @if (lib.architecture) {
            <div
              class="bg-gradient-to-br from-{{
                lib.color
              }}-900/30 to-black border border-{{
                lib.color
              }}-400/30 rounded-xl p-6 fade-in-element"
            >
              <h3 class="text-2xl font-bold mb-4 text-{{ lib.color }}-300">
                🏗️ Architecture
              </h3>
              <p class="text-white/80">{{ lib.architecture }}</p>
            </div>
            }

            <!-- Category -->
            <div
              class="bg-gradient-to-br from-{{
                lib.color
              }}-900/30 to-black border border-{{
                lib.color
              }}-400/30 rounded-xl p-6 fade-in-element"
            >
              <h3 class="text-2xl font-bold mb-4 text-{{ lib.color }}-300">
                📂 Category
              </h3>
              <p class="text-white/80 capitalize">
                {{ lib.category.replace('-', ' ') }}
              </p>
            </div>

            <!-- Documentation -->
            @if (lib.documentation) {
            <div
              class="bg-gradient-to-br from-{{
                lib.color
              }}-900/30 to-black border border-{{
                lib.color
              }}-400/30 rounded-xl p-6 fade-in-element"
            >
              <h3 class="text-2xl font-bold mb-4 text-{{ lib.color }}-300">
                📚 Documentation
              </h3>
              <a
                [href]="lib.documentation"
                class="text-{{ lib.color }}-400 hover:text-{{
                  lib.color
                }}-300 underline"
              >
                View README →
              </a>
            </div>
            }

            <!-- Related Libraries -->
            <div
              class="bg-gradient-to-br from-{{
                lib.color
              }}-900/30 to-black border border-{{
                lib.color
              }}-400/30 rounded-xl p-6 fade-in-element"
            >
              <h3 class="text-2xl font-bold mb-4 text-{{ lib.color }}-300">
                🔗 Related
              </h3>
              <div class="space-y-3">
                @for (related of getRelatedLibraries(lib); track related.slug) {
                <a
                  [routerLink]="['/library', related.slug]"
                  class="block bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-2xl">{{ related.icon }}</span>
                    <span class="text-white/90">{{ related.name }}</span>
                  </div>
                </a>
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA Section -->
      <section
        class="bg-gradient-to-r from-{{
          lib.color
        }}-900/30 to-black py-16 border-t border-white/10 fade-in-element"
      >
        <div class="container mx-auto px-8 text-center">
          <h2 class="text-4xl font-bold mb-6 text-{{ lib.color }}-300">
            Ready to Get Started?
          </h2>
          <p class="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
            Start building with {{ lib.name }} today and unlock powerful
            capabilities for your AI applications.
          </p>
          <div class="flex gap-4 justify-center">
            <button
              (click)="goBack()"
              class="px-8 py-4 bg-{{ lib.color }}-600 hover:bg-{{
                lib.color
              }}-700 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105"
            >
              Back to Overview
            </button>
            @if (lib.documentation) {
            <a
              [href]="lib.documentation"
              class="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105 border border-white/20"
            >
              View Documentation
            </a>
            }
          </div>
        </div>
      </section>
      } @else {
      <!-- Loading or Not Found -->
      <div class="min-h-screen flex items-center justify-center">
        <div class="text-center">
          <div class="text-6xl mb-6">❓</div>
          <h1 class="text-4xl font-bold mb-4">Library Not Found</h1>
          <p class="text-xl text-white/70 mb-8">
            The requested library could not be found.
          </p>
          <button
            (click)="goBack()"
            class="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all"
          >
            Back to Landing Page
          </button>
        </div>
      </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .fade-in-element {
        opacity: 0;
        transform: translateY(30px);
      }
    `,
  ],
})
export class LibraryDetailPageComponent implements OnInit {
  library = signal<Library | undefined>(undefined);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private libraryData: LibraryDataService,
    private injector: Injector
  ) {
    afterNextRender(
      { write: () => this.initAnimations() },
      { injector: this.injector }
    );
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const slug = params['slug'];
      if (slug) {
        const lib = this.libraryData.getLibraryBySlug(slug);
        this.library.set(lib);

        if (!lib) {
          console.error(`Library not found: ${slug}`);
        }
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/landing']);
  }

  getRelatedLibraries(library: Library): Library[] {
    const allLibs = this.libraryData.getAllLibraries();
    return allLibs
      .filter(
        (lib) => lib.id !== library.id && lib.category === library.category
      )
      .slice(0, 3);
  }

  private async initAnimations(): Promise<void> {
    try {
      if (!gsap) {
        const gsapModule = await import('gsap');
        const scrollTriggerModule = await import('gsap/ScrollTrigger');
        gsap = gsapModule.gsap || gsapModule.default;
        ScrollTrigger =
          scrollTriggerModule.ScrollTrigger || scrollTriggerModule.default;
        gsap.registerPlugin(ScrollTrigger);
      }

      gsap.fromTo(
        '.fade-in-element',
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.15,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.fade-in-element',
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      );
    } catch (error) {
      console.error('GSAP init failed:', error);
    }
  }
}
