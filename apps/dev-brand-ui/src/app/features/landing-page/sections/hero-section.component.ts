import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';

@Component({
  selector: 'brand-hero-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="hero-container" [class.loaded]="isLoaded()">
      <!-- 3D Scene Placeholder -->
      <div class="scene-container" #sceneContainer>
        <div class="agent-constellation">
          <div
            *ngFor="let agent of heroAgents(); trackBy: trackByAgentId"
            class="agent-node"
            [style.left.px]="agent.screenPosition.x"
            [style.top.px]="agent.screenPosition.y"
            [class.active]="agent.isActive"
            [style.background-color]="agent.color"
          >
            <div class="agent-pulse"></div>
            <div class="agent-label">{{agent.name}}</div>
          </div>
        </div>
      </div>

      <!-- Hero Content Overlay -->
      <div class="hero-content">
        <div class="hero-text" [class.visible]="contentVisible()">
          <h1 class="hero-title">
            <span class="title-line">Enterprise AI</span>
            <span class="title-line highlight">SaaS Starter</span>
          </h1>
          <p class="hero-subtitle">
            Production-ready foundation for AI-powered applications combining
            <span class="tech-highlight">vector search</span>,
            <span class="tech-highlight">graph relationships</span>, and
            <span class="tech-highlight">intelligent workflows</span>
          </p>
          <div class="hero-features">
            <div class="feature-badge">
              <span class="badge-icon">🧠</span>
              <span>Semantic Intelligence</span>
            </div>
            <div class="feature-badge">
              <span class="badge-icon">🕸️</span>
              <span>Relationship Mapping</span>
            </div>
            <div class="feature-badge">
              <span class="badge-icon">⚡</span>
              <span>Intelligent Workflows</span>
            </div>
          </div>
          <div class="hero-actions">
            <button class="primary-btn" (click)="exploreDemo()">
              <span>Explore Live Demo</span>
              <span class="btn-icon">🚀</span>
            </button>
            <button class="secondary-btn" (click)="viewArchitecture()">
              <span>View Architecture</span>
              <span class="btn-icon">🏗️</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Performance Indicator -->
      <div class="performance-indicator" *ngIf="showPerformanceDebug()">
        FPS: {{currentFPS()}} | Agents: {{heroAgents().length}}
      </div>
    </div>
  `,
  styles: [`
  :host(),
    .hero-container {
      position: relative;
      width: 100%;
      height: 100vh;
      overflow: hidden;
      background: radial-gradient(ellipse at center, rgba(138, 43, 226, 0.15) 0%, transparent 70%);
    }

    .scene-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    .agent-constellation {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .agent-node {
      position: absolute;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translate(-50%, -50%);
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
      animation: float 3s ease-in-out infinite;
    }

    .agent-node:hover {
      transform: translate(-50%, -50%) scale(1.2);
      box-shadow: 0 0 30px rgba(255, 255, 255, 0.6);
    }

    .agent-node.active {
      animation: pulse 2s ease-in-out infinite;
    }

    .agent-pulse {
      position: absolute;
      top: -10px;
      left: -10px;
      right: -10px;
      bottom: -10px;
      border: 2px solid currentColor;
      border-radius: 50%;
      opacity: 0.3;
      animation: ping 2s ease-in-out infinite;
    }

    .agent-label {
      position: absolute;
      bottom: -30px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.8rem;
      color: #ffffff;
      text-align: center;
      white-space: nowrap;
      background: rgba(0, 0, 0, 0.7);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .agent-node:hover .agent-label {
      opacity: 1;
    }

    @keyframes float {
      0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
      50% { transform: translate(-50%, -50%) translateY(-10px); }
    }

    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.3); }
      50% { box-shadow: 0 0 40px rgba(255, 255, 255, 0.8); }
    }

    @keyframes ping {
      0% { transform: scale(1); opacity: 0.3; }
      100% { transform: scale(1.5); opacity: 0; }
    }

    .hero-content {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      pointer-events: none;
    }

    .hero-text {
      text-align: center;
      max-width: 800px;
      padding: 2rem;
      opacity: 0;
      transform: translateY(30px);
      transition: all 1.2s ease-out;
      pointer-events: auto;
    }

    .hero-text.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .hero-title {
      font-size: clamp(2.5rem, 5vw, 4rem);
      font-weight: 700;
      margin: 0 0 1.5rem 0;
      line-height: 1.1;
    }

    .title-line {
      display: block;
      background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .title-line.highlight {
      background: linear-gradient(135deg, #8a2be2 0%, #ff69b4 50%, #00bfff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 3s ease-in-out infinite;
    }

    @keyframes shimmer {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.3); }
    }

    .hero-subtitle {
      font-size: clamp(1.1rem, 2.5vw, 1.4rem);
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.85);
      margin: 0 0 2rem 0;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    .tech-highlight {
      color: #8a2be2;
      font-weight: 600;
      text-shadow: 0 0 10px rgba(138, 43, 226, 0.5);
    }

    .hero-features {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin: 2rem 0;
      flex-wrap: wrap;
    }

    .feature-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 25px;
      backdrop-filter: blur(10px);
      font-size: 0.9rem;
      color: #ffffff;
      transition: all 0.3s ease;
    }

    .feature-badge:hover {
      background: rgba(138, 43, 226, 0.2);
      border-color: rgba(138, 43, 226, 0.5);
      transform: translateY(-2px);
    }

    .badge-icon {
      font-size: 1.2rem;
    }

    .hero-actions {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-top: 2.5rem;
      flex-wrap: wrap;
    }

    .primary-btn, .secondary-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 2rem;
      border: none;
      border-radius: 12px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
    }

    .primary-btn {
      background: linear-gradient(135deg, #8a2be2 0%, #ff69b4 100%);
      color: #ffffff;
      box-shadow: 0 4px 20px rgba(138, 43, 226, 0.4);
    }

    .primary-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 30px rgba(138, 43, 226, 0.6);
    }

    .secondary-btn {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .secondary-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }

    .btn-icon {
      font-size: 1.2rem;
    }

    .performance-indicator {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.7);
      color: #00ff00;
      padding: 0.5rem;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.8rem;
      z-index: 3;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .hero-text {
        padding: 1rem;
      }

      .hero-features {
        flex-direction: column;
        align-items: center;
      }

      .hero-actions {
        flex-direction: column;
        align-items: center;
      }

      .primary-btn, .secondary-btn {
        width: 100%;
        max-width: 280px;
        justify-content: center;
      }
    }

    /* Animation delays for staggered entrance */
    .hero-text.visible .hero-title {
      animation: slideUp 0.8s ease-out 0.2s both;
    }

    .hero-text.visible .hero-subtitle {
      animation: slideUp 0.8s ease-out 0.4s both;
    }

    .hero-text.visible .hero-features {
      animation: slideUp 0.8s ease-out 0.6s both;
    }

    .hero-text.visible .hero-actions {
      animation: slideUp 0.8s ease-out 0.8s both;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class HeroSectionComponent implements OnInit {
  @ViewChild('sceneContainer', { static: true }) sceneContainer!: ElementRef;

  // Component state
  readonly isLoaded = signal(false);
  readonly contentVisible = signal(false);
  readonly sceneWidth = signal(window.innerWidth);
  readonly sceneHeight = signal(window.innerHeight);
  readonly currentFPS = signal(60);
  readonly showPerformanceDebug = signal(false); // Set to true for development

  // Hero-specific agent configuration with screen positions
  readonly heroAgents = signal([
    {
      id: 'hero-central',
      name: 'Central Intelligence',
      type: 'coordinator',
      position: { x: 0, y: 0, z: 0 },
      screenPosition: { x: window.innerWidth * 0.5, y: window.innerHeight * 0.4 },
      scale: 1.5,
      isActive: true,
      color: '#8a2be2'
    },
    {
      id: 'hero-memory',
      name: 'Memory Agent',
      type: 'memory',
      position: { x: -3, y: 2, z: -2 },
      screenPosition: { x: window.innerWidth * 0.25, y: window.innerHeight * 0.25 },
      scale: 1.0,
      isActive: true,
      color: '#ff69b4'
    },
    {
      id: 'hero-workflow',
      name: 'Workflow Agent',
      type: 'workflow',
      position: { x: 3, y: -1, z: -2 },
      screenPosition: { x: window.innerWidth * 0.75, y: window.innerHeight * 0.55 },
      scale: 1.0,
      isActive: true,
      color: '#00bfff'
    },
    {
      id: 'hero-analytics',
      name: 'Analytics Agent',
      type: 'analytics',
      position: { x: -2, y: -2, z: 1 },
      screenPosition: { x: window.innerWidth * 0.2, y: window.innerHeight * 0.65 },
      scale: 1.0,
      isActive: true,
      color: '#32cd32'
    },
    {
      id: 'hero-integration',
      name: 'Integration Agent',
      type: 'integration',
      position: { x: 2, y: 2, z: 1 },
      screenPosition: { x: window.innerWidth * 0.8, y: window.innerHeight * 0.3 },
      scale: 1.0,
      isActive: true,
      color: '#ffd700'
    }
  ]);

  ngOnInit(): void {
    this.initializeHeroSection();
    this.setupResponsiveHandling();
  }


  private async initializeHeroSection(): Promise<void> {
    try {
      // Mark as loaded
      this.isLoaded.set(true);

      // Show content with delay for cinematic effect
      setTimeout(() => {
        this.contentVisible.set(true);
      }, 800);

    } catch (error) {
      console.error('Failed to initialize hero section:', error);
      this.isLoaded.set(true);
      this.contentVisible.set(true);
    }
  }

  private setupResponsiveHandling(): void {
    const handleResize = () => {
      this.sceneWidth.set(window.innerWidth);
      this.sceneHeight.set(window.innerHeight);
      this.updateAgentPositions();
    };

    window.addEventListener('resize', handleResize);
  }

  private updateAgentPositions(): void {
    // Update screen positions based on new window size
    const agents = this.heroAgents();
    const updatedAgents = agents.map(agent => ({
      ...agent,
      screenPosition: {
        x: window.innerWidth * (agent.screenPosition.x / this.sceneWidth()),
        y: window.innerHeight * (agent.screenPosition.y / this.sceneHeight())
      }
    }));
    this.heroAgents.set(updatedAgents);
  }

  trackByAgentId(index: number, agent: any): string {
    return agent.id;
  }

  exploreDemo(): void {
    // Scroll to demo theater section
    document.getElementById('demo-theater')?.scrollIntoView({
      behavior: 'smooth'
    });
  }

  viewArchitecture(): void {
    // Scroll to architecture diagram section
    document.getElementById('architecture-diagram')?.scrollIntoView({
      behavior: 'smooth'
    });
  }
}
