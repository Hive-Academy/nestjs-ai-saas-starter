import { Component, inject, signal, DestroyRef } from '@angular/core';

import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface NavItem {
  path: string;
  title: string;
  icon: string;
  description: string;
  category: 'showcase' | 'interface';
}

/**
 * 🧭 SHOWCASE NAVIGATION COMPONENT
 *
 * Global navigation for all showcase routes
 * Provides quick access to all major experiences
 */
@Component({
  selector: 'brand-showcase-navigation',
  standalone: true,
  imports: [RouterModule],
  template: `
    <!-- Floating Navigation Button -->
    <div class="floating-nav" [class.nav-open]="isExpanded()">
      <div class="relative">
        <!-- Main Navigation Button -->
        <button
          class="nav-button"
          (click)="toggleNav()"
          [class.active]="isExpanded()"
        >
          🚀
        </button>

        <!-- Navigation Dropdown -->
        <div class="nav-dropdown" [class.hidden]="!isExpanded()">
          <div class="nav-header">
            <div class="nav-title">🚀 DevBrand Platform</div>
            <div class="nav-subtitle">v1.0.0-showcase</div>
          </div>

          <!-- Showcase Routes -->
          <div class="nav-section">
            <div class="section-title">Showcase Experience</div>
            @for (item of showcaseItems; track item.path) {
            <a
              class="nav-item"
              [routerLink]="item.path"
              [class.active]="currentRoute() === item.path"
              (click)="closeNav()"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              <div class="nav-info">
                <div class="nav-label">{{ item.title }}</div>
                <div class="nav-desc">{{ item.description }}</div>
              </div>
            </a>
            }
          </div>

          <!-- Interface Modes -->
          <div class="nav-section">
            <div class="section-title">Interface Modes</div>
            @for (item of interfaceItems; track item.path) {
            <a
              class="nav-item"
              [routerLink]="item.path"
              [class.active]="currentRoute() === item.path"
              (click)="closeNav()"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              <div class="nav-info">
                <div class="nav-label">{{ item.title }}</div>
                <div class="nav-desc">{{ item.description }}</div>
              </div>
            </a>
            }
          </div>

          <!-- Status Footer -->
          <div class="nav-footer">
            <div class="status-indicator">
              <span class="status-dot"></span>
              <span class="status-text">All Systems Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .floating-nav {
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 1000;
      }

      .relative {
        position: relative;
      }

      .nav-button {
        width: 56px;
        height: 56px;
        border: none;
        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
        border-radius: 50%;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(34, 197, 94, 0.3);
      }

      .nav-button:hover {
        background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
        transform: scale(1.05);
        box-shadow: 0 6px 25px rgba(34, 197, 94, 0.4);
      }

      .nav-button.active {
        background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
        box-shadow: 0 4px 20px rgba(220, 38, 38, 0.3);
      }

      .nav-dropdown {
        position: absolute;
        top: 64px;
        left: 0;
        width: 320px;
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        overflow: hidden;
        transition: all 0.3s ease;
        transform-origin: top left;
      }

      .hidden {
        opacity: 0;
        pointer-events: none;
        transform: scale(0.95);
      }

      .nav-header {
        padding: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(34, 197, 94, 0.05);
      }

      .nav-title {
        font-size: 1.1rem;
        font-weight: 700;
        color: white;
        margin-bottom: 4px;
      }

      .nav-subtitle {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.6);
      }

      .nav-section {
        padding: 16px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .nav-section:last-of-type {
        border-bottom: none;
      }

      .section-title {
        padding: 0 20px 12px 20px;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.6);
        letter-spacing: 0.5px;
      }

      .nav-item {
        display: flex;
        align-items: center;
        padding: 12px 20px;
        text-decoration: none;
        color: rgba(255, 255, 255, 0.8);
        transition: all 0.3s ease;
        border-left: 3px solid transparent;
      }

      .nav-item:hover {
        background: rgba(255, 255, 255, 0.05);
        color: white;
        border-left-color: rgba(34, 197, 94, 0.5);
      }

      .nav-item.active {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
        border-left-color: #22c55e;
        box-shadow: inset 0 0 0 1px rgba(34, 197, 94, 0.2);
      }

      .nav-icon {
        font-size: 1.1rem;
        min-width: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 12px;
      }

      .nav-info {
        flex: 1;
      }

      .nav-label {
        font-weight: 500;
        font-size: 0.9rem;
        line-height: 1.3;
        margin-bottom: 2px;
      }

      .nav-desc {
        font-size: 0.75rem;
        opacity: 0.7;
        line-height: 1.2;
      }

      .nav-footer {
        padding: 16px 20px;
        background: rgba(0, 0, 0, 0.2);
      }

      .status-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #22c55e;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.6;
        }
      }

      .status-text {
        font-size: 0.8rem;
        color: #22c55e;
        font-weight: 500;
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .nav-dropdown {
          width: 280px;
          left: -20px;
          top: 70px;
        }
      }

      @media (max-width: 480px) {
        .floating-nav {
          top: 10px;
          left: 10px;
        }

        .nav-dropdown {
          width: calc(100vw - 40px);
          left: -10px;
        }
      }
    `,
  ],
})
export class ShowcaseNavigationComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly isExpanded = signal(false);
  readonly currentRoute = signal('');

  readonly showcaseItems: NavItem[] = [
    {
      path: '/landing',
      title: 'Landing Page',
      icon: '🏠',
      description: 'Platform landing & overview',
      category: 'showcase',
    },
    {
      path: '/devbrand-poc',
      title: 'DevBrand Workflow POC',
      icon: '🚀',
      description: 'Real-time LangGraph demo',
      category: 'showcase',
    },
  ];

  readonly interfaceItems: NavItem[] = [
    {
      path: '/spatial-interface',
      title: '3D Agent Visualization',
      icon: '🌌',
      description: 'Interactive spatial interface',
      category: 'interface',
    },
    {
      path: '/workflow-canvas',
      title: 'Workflow Canvas',
      icon: '🎨',
      description: 'Visual workflow designer',
      category: 'interface',
    },
    {
      path: '/memory-constellation',
      title: 'Memory Constellation',
      icon: '🧠',
      description: 'Distributed memory system',
      category: 'interface',
    },
    {
      path: '/chat-interface',
      title: 'AI Chat Interface',
      icon: '💬',
      description: 'Conversational AI experience',
      category: 'interface',
    },
    {
      path: '/content-forge',
      title: 'Content Forge',
      icon: '⚒️',
      description: 'AI-powered content creation',
      category: 'interface',
    },
  ];

  constructor() {
    // Track current route
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event: NavigationEnd) => {
        this.currentRoute.set(event.url);
      });

    // Set initial route
    this.currentRoute.set(this.router.url);
  }

  toggleNav() {
    this.isExpanded.update((expanded) => !expanded);
  }

  closeNav() {
    this.isExpanded.set(false);
  }
}
