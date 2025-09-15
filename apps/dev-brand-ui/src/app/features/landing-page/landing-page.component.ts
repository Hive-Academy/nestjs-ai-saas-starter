import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, signal, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
// Remove service imports for simplified Phase 1
import { ArchitectureDiagramComponent } from './sections/architecture-diagram.component';
import { DemoTheaterComponent } from './sections/demo-theater.component';
import { EcosystemExplorerComponent } from './sections/ecosystem-explorer.component';
import { HeroSectionComponent } from './sections/hero-section.component';
import { PlatformPillarsComponent } from './sections/platform-pillars.component';

@Component({
  selector: 'brand-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeroSectionComponent,
    PlatformPillarsComponent,
    DemoTheaterComponent,
    EcosystemExplorerComponent,
    ArchitectureDiagramComponent
  ],
  template: `
    <div class="landing-page" [class.loaded]="isLoaded()">
      <!-- Hero Section -->
      <section id="hero" class="hero-section">
        <brand-hero-section />
      </section>

      <!-- Platform Pillars Section -->
      <section id="platform-pillars" class="platform-pillars-section">
        <app-platform-pillars />
      </section>

      <!-- Demo Theater Section -->
      <section id="demo-theater" class="demo-theater-section">
        <app-demo-theater />
      </section>

      <!-- Ecosystem Explorer Section -->
      <section id="ecosystem-explorer" class="ecosystem-explorer-section">
        <app-ecosystem-explorer />
      </section>

      <!-- Architecture Deep Dive Section -->
      <section id="architecture-diagram" class="architecture-diagram-section">
        <app-architecture-diagram />
      </section>

      <!-- Navigation to other features -->
      <nav class="feature-navigation">
        <h3>Explore Platform Features</h3>
        <div class="nav-grid">
          <a routerLink="/spatial-interface" class="nav-card">
            <h4>3D Agent Visualization</h4>
            <p>Interactive spatial interface</p>
          </a>
          <a routerLink="/workflow-canvas" class="nav-card">
            <h4>Workflow Canvas</h4>
            <p>Visual workflow designer</p>
          </a>
          <a routerLink="/memory-constellation" class="nav-card">
            <h4>Memory Constellation</h4>
            <p>Distributed memory system</p>
          </a>
          <a routerLink="/chat-interface" class="nav-card">
            <h4>AI Chat Interface</h4>
            <p>Conversational AI experience</p>
          </a>
          <a routerLink="/content-forge" class="nav-card">
            <h4>Content Forge</h4>
            <p>AI-powered content creation</p>
          </a>
        </div>
      </nav>
    </div>
  `,
  styles: [`
    .landing-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #2d2d5f 100%);
      color: #ffffff;
      opacity: 0;
      transition: opacity 0.8s ease-in-out;
    }

    .landing-page.loaded {
      opacity: 1;
    }

    /* Section Base Styles */
    section {
      min-height: 100vh;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .hero-section {
      background: radial-gradient(ellipse at center, rgba(138, 43, 226, 0.15) 0%, transparent 70%);
    }

    .platform-pillars-section {
      background: linear-gradient(90deg, rgba(255, 105, 180, 0.1) 0%, rgba(138, 43, 226, 0.1) 100%);
    }

    .demo-theater-section {
      background: linear-gradient(45deg, rgba(0, 191, 255, 0.1) 0%, rgba(138, 43, 226, 0.1) 100%);
    }

    .ecosystem-explorer-section {
      background: radial-gradient(circle at center, rgba(50, 205, 50, 0.1) 0%, transparent 70%);
    }

    .architecture-diagram-section {
      background: linear-gradient(180deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 105, 180, 0.1) 100%);
    }

    /* Feature Navigation */
    .feature-navigation {
      padding: 4rem 2rem;
      text-align: center;
      background: rgba(0, 0, 0, 0.3);
    }

    .feature-navigation h3 {
      font-size: 2rem;
      margin-bottom: 2rem;
      color: #ffffff;
      text-align: center;
    }

    .nav-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .nav-card {
      display: block;
      padding: 1.5rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      text-decoration: none;
      color: #ffffff;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
    }

    .nav-card:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(138, 43, 226, 0.5);
      transform: translateY(-4px);
      box-shadow: 0 8px 32px rgba(138, 43, 226, 0.3);
    }

    .nav-card h4 {
      margin: 0 0 0.5rem 0;
      font-size: 1.2rem;
      color: #8a2be2;
    }

    .nav-card p {
      margin: 0;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.9rem;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      section {
        padding: 2rem 1rem;
      }

      .nav-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .feature-navigation h3 {
        font-size: 1.5rem;
      }
    }
  `]
})
export class LandingPageComponent implements OnInit, OnDestroy {
  ngOnDestroy(): void {
    throw new Error('Method not implemented.');
  }
  // Component state
  readonly isLoaded = signal(false);
  readonly sections = signal([
    'hero',
    'platform-pillars',
    'demo-theater',
    'ecosystem-explorer',
    'architecture-diagram'
  ]);

  readonly loadingProgress = computed(() => {
    // Calculate loading progress based on loaded sections
    return 100; // For now, return 100% once component initializes
  });

  ngOnInit(): void {
    this.initializeLandingPage();
  }



  private async initializeLandingPage(): Promise<void> {
    try {
      // Mark as loaded for transition effect
      setTimeout(() => {
        this.isLoaded.set(true);
      }, 100);

    } catch (error) {
      console.error('Failed to initialize landing page:', error);
      // Still mark as loaded to show content even if optimization fails
      this.isLoaded.set(true);
    }
  }
}
