import { Component, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="showcase-nav" [class.expanded]="isExpanded()">
      <div class="nav-header">
        <button class="nav-toggle" (click)="toggleNav()">
          <span class="toggle-icon">{{ isExpanded() ? '❮' : '❯' }}</span>
        </button>
        <div class="nav-title" [class.hidden]="!isExpanded()">
          🚀 DevBrand Platform
        </div>
      </div>

      <div class="nav-content">
        <!-- Showcase Routes -->
        <div class="nav-section">
          <div class="section-title" [class.hidden]="!isExpanded()">
            Showcase Experience
          </div>
          @for (item of showcaseItems; track item.path) {
          <a
            class="nav-item"
            [routerLink]="item.path"
            [class.active]="currentRoute() === item.path"
            [title]="item.description"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <div class="nav-info" [class.hidden]="!isExpanded()">
              <div class="nav-label">{{ item.title }}</div>
              <div class="nav-desc">{{ item.description }}</div>
            </div>
          </a>
          }
        </div>

        <!-- Interface Modes -->
        <div class="nav-section">
          <div class="section-title" [class.hidden]="!isExpanded()">
            Interface Modes
          </div>
          @for (item of interfaceItems; track item.path) {
          <a
            class="nav-item"
            [routerLink]="item.path"
            [class.active]="currentRoute() === item.path"
            [title]="item.description"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <div class="nav-info" [class.hidden]="!isExpanded()">
              <div class="nav-label">{{ item.title }}</div>
              <div class="nav-desc">{{ item.description }}</div>
            </div>
          </a>
          }
        </div>
      </div>

      <!-- Footer -->
      <div class="nav-footer">
        <div class="status-indicator" [class.hidden]="!isExpanded()">
          <span class="status-dot online"></span>
          <span class="status-text">All Systems Online</span>
        </div>
        <div class="version-info" [class.hidden]="!isExpanded()">
          v1.0.0-showcase
        </div>
      </div>
    </nav>
  `,
  styles: [
    `
      .showcase-nav {
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        width: 60px;
        background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
        border-right: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
      }

      .showcase-nav.expanded {
        width: 280px;
      }

      .nav-header {
        display: flex;
        align-items: center;
        padding: 16px 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
      }

      .nav-toggle {
        width: 36px;
        height: 36px;
        border: none;
        background: rgba(34, 197, 94, 0.2);
        border-radius: 8px;
        color: #22c55e;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .nav-toggle:hover {
        background: rgba(34, 197, 94, 0.3);
        transform: scale(1.05);
      }

      .toggle-icon {
        font-size: 0.9rem;
        font-weight: 600;
      }

      .nav-title {
        margin-left: 12px;
        font-weight: 700;
        font-size: 1.1rem;
        color: white;
        transition: opacity 0.3s ease;
      }

      .hidden {
        opacity: 0;
        pointer-events: none;
      }

      .nav-content {
        flex: 1;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(34, 197, 94, 0.5) transparent;
      }

      .nav-content::-webkit-scrollbar {
        width: 4px;
      }

      .nav-content::-webkit-scrollbar-thumb {
        background: rgba(34, 197, 94, 0.5);
        border-radius: 2px;
      }

      .nav-section {
        padding: 16px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .section-title {
        padding: 0 16px 8px 16px;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.6);
        letter-spacing: 0.5px;
        transition: opacity 0.3s ease;
      }

      .nav-item {
        display: flex;
        align-items: center;
        padding: 12px 16px;
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
        font-size: 1.2rem;
        min-width: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .nav-info {
        margin-left: 12px;
        flex: 1;
        transition: opacity 0.3s ease;
      }

      .nav-label {
        font-weight: 500;
        font-size: 0.9rem;
        line-height: 1.3;
      }

      .nav-desc {
        font-size: 0.75rem;
        opacity: 0.7;
        line-height: 1.2;
        margin-top: 2px;
      }

      .nav-footer {
        padding: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.2);
      }

      .status-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        transition: opacity 0.3s ease;
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

      .version-info {
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.5);
        text-align: center;
        transition: opacity 0.3s ease;
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .showcase-nav {
          transform: translateX(-100%);
        }

        .showcase-nav.expanded {
          transform: translateX(0);
          width: 100vw;
          background: rgba(30, 41, 59, 0.98);
          backdrop-filter: blur(10px);
        }
      }

      /* Push main content when nav is expanded */
      :global(body) {
        transition: margin-left 0.3s ease;
      }

      :global(body.nav-expanded) {
        margin-left: 280px;
      }

      @media (max-width: 768px) {
        :global(body.nav-expanded) {
          margin-left: 0;
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
      path: '/devbrand-showcase',
      title: 'Platform Overview',
      icon: '🚀',
      description: 'Main dashboard & system health',
      category: 'showcase',
    },
    {
      path: '/multi-agent-patterns',
      title: 'Agent Patterns',
      icon: '🐝',
      description: 'Supervisor & swarm coordination',
      category: 'showcase',
    },
    {
      path: '/library-showcase',
      title: 'Library Ecosystem',
      icon: '📚',
      description: '13 integrated libraries',
      category: 'showcase',
    },
    {
      path: '/developer-experience',
      title: 'Developer DX',
      icon: '⚡',
      description: 'Code transformation showcase',
      category: 'showcase',
    },
  ];

  readonly interfaceItems: NavItem[] = [
    {
      path: '/chat',
      title: 'Chat Studio',
      icon: '💬',
      description: 'Interactive AI conversations',
      category: 'interface',
    },
    {
      path: '/spatial',
      title: 'Agent Constellation',
      icon: '🌌',
      description: '3D agent visualization',
      category: 'interface',
    },
    {
      path: '/canvas',
      title: 'Workflow Canvas',
      icon: '🎨',
      description: 'Visual workflow designer',
      category: 'interface',
    },
    {
      path: '/memory',
      title: 'Memory Constellation',
      icon: '🧠',
      description: 'Context & memory visualization',
      category: 'interface',
    },
    {
      path: '/forge',
      title: 'Content Forge',
      icon: '⚒️',
      description: 'Content creation studio',
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
    const expanded = !this.isExpanded();
    this.isExpanded.set(expanded);

    // Update body class for main content positioning
    if (expanded) {
      document.body.classList.add('nav-expanded');
    } else {
      document.body.classList.remove('nav-expanded');
    }
  }
}
