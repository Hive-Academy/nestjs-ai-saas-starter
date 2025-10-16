import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
} from '@angular/core';

import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { gsap } from 'gsap';

interface SectionRoute {
  path: string;
  title: string;
  index: number;
  id: string;
}

@Component({
  selector: 'brand-landing-page-shell',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div
      class="w-screen h-screen bg-gradient-to-br from-[#0f0f23] via-[#1a1a3e] to-[#2d2d5f] text-white overflow-hidden relative"
    >
      <!-- Loading Screen -->
      @if (isLoading()) {
      <div
        class="absolute inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#0f0f23] via-[#1a1a3e] to-[#2d2d5f]"
      >
        <!-- AI Logo Animation -->
        <div class="relative mb-8">
          <div
            class="w-20 h-20 border-4 border-purple-500/30 rounded-full animate-spin"
          >
            <div
              class="absolute top-1 left-1 w-4 h-4 bg-purple-500 rounded-full animate-pulse"
            ></div>
            <div
              class="absolute top-1 right-1 w-4 h-4 bg-pink-500 rounded-full animate-pulse"
              style="animation-delay: 0.5s"
            ></div>
            <div
              class="absolute bottom-1 left-1 w-4 h-4 bg-sky-500 rounded-full animate-pulse"
              style="animation-delay: 1s"
            ></div>
            <div
              class="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"
              style="animation-delay: 1.5s"
            ></div>
          </div>
          <div
            class="absolute inset-0 w-20 h-20 border-2 border-white/10 rounded-full animate-ping"
          ></div>
        </div>

        <!-- Loading Text -->
        <div class="text-center mb-6">
          <h2
            class="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2"
          >
            Enterprise AI SaaS Starter
          </h2>
          <p class="text-white/70 text-sm">
            Initializing intelligent systems...
          </p>
        </div>

        <!-- Progress Bar -->
        <div class="w-80 max-w-md mx-auto mb-4">
          <div class="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-sky-500 rounded-full transition-all duration-500 ease-out"
              [style.width.%]="loadingProgress()"
            ></div>
          </div>
          <div class="flex justify-between text-xs text-white/50 mt-2">
            <span>{{ loadingProgress() }}% complete</span>
            <span>{{ getCurrentLoadingStep() }}</span>
          </div>
        </div>

        <!-- Loading Steps -->
        <div class="text-center text-white/40 text-xs">
          <div class="flex items-center justify-center gap-4">
            <span [class.text-purple-500]="loadingProgress() >= 20"
              >Vector Intelligence</span
            >
            <span [class.text-pink-500]="loadingProgress() >= 40"
              >Graph Relations</span
            >
            <span [class.text-sky-500]="loadingProgress() >= 60"
              >AI Workflows</span
            >
            <span [class.text-green-500]="loadingProgress() >= 80"
              >3D Visualization</span
            >
            <span [class.text-white]="loadingProgress() >= 100">Ready</span>
          </div>
        </div>
      </div>
      }

      <!-- Navigation Dots -->
      @if (!isLoading()) {
      <nav
        class="fixed right-5 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 opacity-0 animate-fade-in"
        style="animation-delay: 0.5s"
      >
        @for (section of sections(); track section.id) {
        <button
          [class]="getNavigationButtonClasses(section.index)"
          [attr.aria-label]="'Navigate to ' + section.title"
          (click)="navigateToSection(section.path)"
        >
          <span
            class="absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 pointer-events-none transition-all duration-300 group-hover:opacity-100"
          >
            {{ section.title }}
          </span>
        </button>
        }
      </nav>
      }

      <!-- Section Progress -->
      @if (!isLoading()) {
      <div
        class="fixed top-5 left-5 z-50 bg-black/50 backdrop-blur-lg rounded-lg px-4 py-2 text-sm opacity-0 animate-fade-in"
        style="animation-delay: 0.3s"
      >
        <div class="flex items-center gap-3">
          <span class="text-white/70"
            >{{ currentSectionIndex() + 1 }}/{{ sections().length }}</span
          >
          <div class="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
              [style.width.%]="progressPercentage()"
            ></div>
          </div>
        </div>
      </div>
      }

      <!-- Demo Controls -->
      @if (!isLoading()) {
      <div
        class="fixed top-5 right-5 z-50 opacity-0 animate-fade-in"
        style="animation-delay: 0.7s"
      >
        <button
          class="bg-purple-600/80 hover:bg-purple-600 text-white px-4 py-2 rounded-lg backdrop-blur-lg transition-all duration-200"
          (click)="toggleAutoDemo()"
        >
          {{ isAutoDemo() ? '⏸️ Stop Demo' : '▶️ Start Demo' }}
        </button>
      </div>
      }

      <!-- Kiro Branding -->
      @if (!isLoading()) {
      <div
        class="fixed bottom-5 left-5 z-50 opacity-0 animate-fade-in"
        style="animation-delay: 1.2s"
      >
        <div class="flex items-center gap-3 group cursor-pointer">
          <!-- Ghost Logo with Floating Animation -->
          <div class="relative animate-float">
            <img
              src="/kiro-logo.svg"
              alt="Kiro Logo"
              class="w-10 h-10 filter brightness-0 invert opacity-80 group-hover:opacity-100 transition-all duration-500 animate-ghost-glow drop-shadow-lg"
              onError="this.style.display='none'; this.nextElementSibling.style.display='block'"
            />
            <!-- Fallback Ghost Icon if SVG fails to load -->
            <div
              class="w-10 h-10 flex items-center justify-center text-white/80 text-2xl animate-ghost-glow"
              style="display:none"
            >
              👻
            </div>
            <!-- Enhanced Glow Effect -->
            <div
              class="absolute inset-0 w-10 h-10 bg-purple-500/40 rounded-full blur-xl animate-pulse opacity-60 group-hover:opacity-100 transition-opacity duration-500"
            ></div>
            <div
              class="absolute inset-0 w-10 h-10 bg-gradient-radial from-purple-400/20 via-pink-400/10 to-transparent rounded-full animate-pulse"
            ></div>
          </div>

          <!-- Glowing Text -->
          <div
            class="text-base font-medium text-white/70 group-hover:text-white transition-all duration-500"
          >
            <span
              class="bg-gradient-to-r from-purple-300 via-pink-300 to-sky-300 bg-clip-text text-transparent animate-text-glow drop-shadow-lg"
            >
              Built with Kiro
            </span>
            <!-- Text background glow -->
            <div
              class="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-sky-500/10 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            ></div>
          </div>
        </div>
      </div>
      }

      <!-- Keyboard Hint -->
      @if (!isLoading()) {
      <div
        class="fixed bottom-5 right-5 z-50 text-white/50 text-xs opacity-0 animate-fade-in"
        style="animation-delay: 1s"
      >
        <div class="flex items-center gap-2">
          <span>Use</span>
          <kbd class="px-2 py-1 bg-white/10 rounded text-xs">↑↓</kbd>
          <span>or scroll to navigate</span>
        </div>
      </div>
      }

      <!-- Section Content -->
      <main class="w-full h-full relative ">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
      }

      @keyframes fade-in {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .animate-fade-in {
        animation: fade-in 0.6s ease-out forwards;
      }

      /* Navigation dots enhance */
      nav button {
        backdrop-filter: blur(10px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      nav button:hover {
        transform: scale(1.25);
        box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
      }

      /* Progress bar glow effect */
      .progress-glow {
        box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
      }

      /* Ghost floating animation */
      @keyframes float {
        0%,
        100% {
          transform: translateY(0px) rotate(0deg);
        }
        25% {
          transform: translateY(-3px) rotate(1deg);
        }
        50% {
          transform: translateY(-6px) rotate(0deg);
        }
        75% {
          transform: translateY(-3px) rotate(-1deg);
        }
      }

      .animate-float {
        animation: float 3s ease-in-out infinite;
      }

      /* Radial gradient utility */
      .bg-gradient-radial {
        background: radial-gradient(var(--tw-gradient-stops));
      }

      /* Enhanced ghost glow animation */
      @keyframes ghost-glow {
        0%,
        100% {
          filter: brightness(0) invert(1)
            drop-shadow(0 0 12px rgba(168, 85, 247, 0.6))
            drop-shadow(0 0 25px rgba(168, 85, 247, 0.3));
        }
        25% {
          filter: brightness(0) invert(1)
            drop-shadow(0 0 15px rgba(236, 72, 153, 0.7))
            drop-shadow(0 0 30px rgba(236, 72, 153, 0.4));
        }
        50% {
          filter: brightness(0) invert(1)
            drop-shadow(0 0 18px rgba(14, 165, 233, 0.8))
            drop-shadow(0 0 35px rgba(14, 165, 233, 0.5));
        }
        75% {
          filter: brightness(0) invert(1)
            drop-shadow(0 0 15px rgba(168, 85, 247, 0.7))
            drop-shadow(0 0 30px rgba(168, 85, 247, 0.4));
        }
      }

      .animate-ghost-glow {
        animation: ghost-glow 3s ease-in-out infinite;
      }

      /* Enhanced text glow animation */
      @keyframes text-glow {
        0%,
        100% {
          text-shadow: 0 0 10px rgba(168, 85, 247, 0.5),
            0 0 20px rgba(168, 85, 247, 0.3), 0 0 30px rgba(168, 85, 247, 0.1);
        }
        33% {
          text-shadow: 0 0 12px rgba(236, 72, 153, 0.6),
            0 0 25px rgba(236, 72, 153, 0.4), 0 0 35px rgba(236, 72, 153, 0.2);
        }
        66% {
          text-shadow: 0 0 14px rgba(14, 165, 233, 0.7),
            0 0 28px rgba(14, 165, 233, 0.5), 0 0 40px rgba(14, 165, 233, 0.3);
        }
      }

      .animate-text-glow {
        animation: text-glow 2.8s ease-in-out infinite;
      }

      /* Enhanced hover effects for Kiro branding */
      .group:hover .animate-float {
        animation: float 1.5s ease-in-out infinite;
      }

      .group:hover .animate-ghost-glow {
        animation: ghost-glow 2s ease-in-out infinite;
      }

      .group:hover .animate-text-glow {
        animation: text-glow 2s ease-in-out infinite;
      }
    `,
  ],
})
export class LandingPageShellComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);

  // Section management
  readonly sections = signal<SectionRoute[]>([
    { path: '/landing/hero', title: 'Hero', index: 0, id: 'hero' },
    { path: '/landing/platform', title: 'Platform', index: 1, id: 'platform' },
    { path: '/landing/demos', title: 'Demos', index: 2, id: 'demos' },
    {
      path: '/landing/ecosystem',
      title: 'Ecosystem',
      index: 3,
      id: 'ecosystem',
    },
    {
      path: '/landing/architecture',
      title: 'Architecture',
      index: 4,
      id: 'architecture',
    },
  ]);

  readonly currentSectionIndex = signal(0);
  readonly isAutoDemo = signal(false);
  readonly isLoading = signal(true);
  readonly loadingProgress = signal(0);

  readonly progressPercentage = computed(() => {
    const current = this.currentSectionIndex();
    const total = this.sections().length;
    return ((current + 1) / total) * 100;
  });

  // Auto demo state
  private autoDemoTimeout?: number;
  private wheelTimeout?: number;

  ngOnInit(): void {
    this.setupRouterSubscription();
    this.setupKeyboardNavigation();
    this.setupMouseWheelNavigation();
    this.updateCurrentSectionFromRoute();
    this.startLoadingSequence();
  }

  ngOnDestroy(): void {
    this.stopAutoDemo();
    if (this.wheelTimeout) {
      clearTimeout(this.wheelTimeout);
    }
  }

  private setupRouterSubscription(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateCurrentSectionFromRoute();
      });
  }

  private updateCurrentSectionFromRoute(): void {
    const url = this.router.url;
    const sections = this.sections();
    const currentSection = sections.find((section) => url.includes(section.id));

    if (currentSection) {
      this.currentSectionIndex.set(currentSection.index);
    }
  }

  private setupKeyboardNavigation(): void {
    document.addEventListener('keydown', (event) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
        case ' ':
          event.preventDefault();
          this.navigateNext();
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault();
          this.navigatePrevious();
          break;
        case 'Home':
          event.preventDefault();
          this.navigateToSection('/landing/hero');
          break;
        case 'End':
          event.preventDefault();
          this.navigateToSection('/landing/architecture');
          break;
        case 'Enter':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            this.toggleAutoDemo();
          }
          break;
      }
    });
  }

  private setupMouseWheelNavigation(): void {
    document.addEventListener(
      'wheel',
      (event) => {
        if (this.isAutoDemo()) return;

        event.preventDefault();

        if (this.wheelTimeout) {
          clearTimeout(this.wheelTimeout);
        }

        this.wheelTimeout = window.setTimeout(() => {
          const delta = event.deltaY;

          if (delta > 0) {
            this.navigateNext();
          } else if (delta < 0) {
            this.navigatePrevious();
          }
        }, 100);
      },
      { passive: false }
    );
  }

  navigateToSection(path: string): void {
    // Add smooth transition
    gsap.to(document.body, {
      duration: 0.3,
      opacity: 0.9,
      ease: 'power2.inOut',
      onComplete: () => {
        this.router.navigate([path]).then(() => {
          gsap.to(document.body, {
            duration: 0.3,
            opacity: 1,
            ease: 'power2.inOut',
          });
        });
      },
    });
  }

  private navigateNext(): void {
    const current = this.currentSectionIndex();
    const sections = this.sections();
    const nextIndex = (current + 1) % sections.length;
    this.navigateToSection(sections[nextIndex].path);
  }

  private navigatePrevious(): void {
    const current = this.currentSectionIndex();
    const sections = this.sections();
    const prevIndex = current === 0 ? sections.length - 1 : current - 1;
    this.navigateToSection(sections[prevIndex].path);
  }

  async toggleAutoDemo(): Promise<void> {
    if (this.isAutoDemo()) {
      this.stopAutoDemo();
    } else {
      await this.startAutoDemo();
    }
  }

  private async startAutoDemo(): Promise<void> {
    this.isAutoDemo.set(true);
    const sections = this.sections();
    let currentIndex = this.currentSectionIndex();

    const playNext = async () => {
      if (!this.isAutoDemo()) return;

      // Stay on current section for 5 seconds
      await new Promise((resolve) => {
        this.autoDemoTimeout = window.setTimeout(resolve, 5000);
      });

      if (!this.isAutoDemo()) return;

      // Move to next section
      currentIndex = (currentIndex + 1) % sections.length;
      this.navigateToSection(sections[currentIndex].path);

      // Continue if not at the end
      if (currentIndex !== 0) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        playNext();
      } else {
        this.isAutoDemo.set(false);
      }
    };

    playNext();
  }

  private stopAutoDemo(): void {
    this.isAutoDemo.set(false);
    if (this.autoDemoTimeout) {
      clearTimeout(this.autoDemoTimeout);
    }
  }

  private async startLoadingSequence(): Promise<void> {
    const steps = [
      { progress: 20, delay: 300 },
      { progress: 40, delay: 400 },
      { progress: 60, delay: 350 },
      { progress: 80, delay: 450 },
      { progress: 100, delay: 300 },
    ];

    for (const { progress, delay } of steps) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      this.loadingProgress.set(progress);
    }

    // Final delay before showing content
    await new Promise((resolve) => setTimeout(resolve, 500));
    this.isLoading.set(false);
  }

  getCurrentLoadingStep(): string {
    const progress = this.loadingProgress();
    if (progress < 20) return 'Initializing...';
    if (progress < 40) return 'Vector Intelligence';
    if (progress < 60) return 'Graph Relations';
    if (progress < 80) return 'AI Workflows';
    if (progress < 100) return '3D Visualization';
    return 'Ready';
  }

  getNavigationButtonClasses(sectionIndex: number): string {
    const isActive = sectionIndex === this.currentSectionIndex();
    const baseClasses =
      'group relative w-4 h-4 border-2 rounded-full transition-all duration-300 hover:scale-125 focus:outline-none focus:ring-2 focus:ring-white/50';

    if (isActive) {
      return `${baseClasses} bg-white border-white scale-125`;
    } else {
      return `${baseClasses} border-white/50`;
    }
  }
}
