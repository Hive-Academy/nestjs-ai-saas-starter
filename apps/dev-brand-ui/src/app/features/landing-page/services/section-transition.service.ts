import { Injectable, signal } from '@angular/core';
import { gsap } from 'gsap';

export interface TransitionConfig {
  duration: number;
  ease: string;
  stagger: number;
  delay: number;
}

export interface SectionTransition {
  from: string;
  to: string;
  type: 'scroll' | 'programmatic' | 'auto-play';
  timestamp: number;
}

export interface NarrativeFlow {
  sectionId: string;
  title: string;
  description: string;
  keyPoints: string[];
  demoActions: string[];
  transitionCue: string;
}

@Injectable({
  providedIn: 'root',
})
export class SectionTransitionService {
  private readonly _currentTransition = signal<SectionTransition | null>(null);
  private readonly _transitionHistory = signal<SectionTransition[]>([]);
  private readonly _isTransitioning = signal(false);

  // Narrative flow configuration
  private readonly narrativeFlows: NarrativeFlow[] = [
    {
      sectionId: 'hero',
      title: 'AI SaaS Platform Introduction',
      description:
        'Welcome to the next generation of AI-powered software development',
      keyPoints: [
        'Enterprise-grade AI orchestration',
        'Vector intelligence with ChromaDB',
        'Graph relationships with Neo4j',
        'Workflow automation with LangGraph',
      ],
      demoActions: [
        'Showcase floating agent constellation',
        'Highlight key platform capabilities',
        'Demonstrate responsive design',
      ],
      transitionCue:
        "Now let's explore the core platform pillars that power this intelligence...",
    },
    {
      sectionId: 'platform-pillars',
      title: 'Platform Architecture Pillars',
      description:
        'Five core pillars that form the foundation of intelligent applications',
      keyPoints: [
        'Orchestration: Multi-agent coordination',
        'Streaming: Real-time data processing',
        'Durability: Persistent state management',
        'Memory Fusion: Context-aware intelligence',
        'Safety Gates: Production-ready safeguards',
      ],
      demoActions: [
        'Interact with 3D platform pillars',
        'Show hover effects and animations',
        'Demonstrate pillar selection and details',
      ],
      transitionCue:
        'See these capabilities in action through our interactive demo theater...',
    },
    {
      sectionId: 'demo-theater',
      title: 'Interactive Demo Theater',
      description:
        'Experience the platform capabilities through live demonstrations',
      keyPoints: [
        'Workflow orchestration demos',
        'Memory system visualizations',
        'Streaming data processing',
        'Safety mechanism showcases',
        'Real-time performance metrics',
      ],
      demoActions: [
        'Play different demo categories',
        'Show cinematic theater presentation',
        'Demonstrate filtering and selection',
      ],
      transitionCue:
        'Discover the rich ecosystem of specialized libraries powering these demos...',
    },
    {
      sectionId: 'ecosystem-explorer',
      title: 'Library Ecosystem Explorer',
      description:
        'Navigate the comprehensive library ecosystem with 3D visualization',
      keyPoints: [
        '14 specialized libraries',
        'Dependency relationships',
        'Core foundation libraries',
        'Advanced AI modules',
        'Integration patterns',
      ],
      demoActions: [
        'Navigate 3D library grid',
        'Show dependency connections',
        'Explore library details',
        'Switch between view modes',
      ],
      transitionCue:
        'Dive deeper into the architectural layers that structure this ecosystem...',
    },
    {
      sectionId: 'architecture-diagram',
      title: 'Architecture Deep Dive',
      description:
        'Explore the layered architecture that enables scalable AI applications',
      keyPoints: [
        '6-layer dependency structure',
        'Applications layer',
        'Orchestration layer',
        'Domain-specific modules',
        'Foundation services',
        'Data flow visualization',
      ],
      demoActions: [
        'Navigate layered architecture',
        'Show component relationships',
        'Explore data flow patterns',
        'Demonstrate layer interactions',
      ],
      transitionCue:
        'This concludes our comprehensive tour of the AI SaaS platform capabilities.',
    },
  ];

  readonly currentTransition = this._currentTransition.asReadonly();
  readonly transitionHistory = this._transitionHistory.asReadonly();
  readonly isTransitioning = this._isTransitioning.asReadonly();

  /**
   * Execute smooth transition between sections with narrative timing
   */
  async executeTransition(
    fromSection: string,
    toSection: string,
    type: SectionTransition['type'] = 'scroll',
    config: Partial<TransitionConfig> = {}
  ): Promise<void> {
    if (this._isTransitioning()) {
      return; // Prevent overlapping transitions
    }

    const transitionConfig: TransitionConfig = {
      duration: 1.5,
      ease: 'power2.inOut',
      stagger: 0.1,
      delay: 0,
      ...config,
    };

    const transition: SectionTransition = {
      from: fromSection,
      to: toSection,
      type,
      timestamp: Date.now(),
    };

    this._currentTransition.set(transition);
    this._isTransitioning.set(true);

    try {
      // Execute transition sequence
      await this.performTransitionSequence(
        fromSection,
        toSection,
        transitionConfig
      );

      // Update history
      this._transitionHistory.update((history) => [...history, transition]);
    } finally {
      this._isTransitioning.set(false);
      this._currentTransition.set(null);
    }
  }

  /**
   * Get narrative flow information for a section
   */
  getNarrativeFlow(sectionId: string): NarrativeFlow | null {
    return (
      this.narrativeFlows.find((flow) => flow.sectionId === sectionId) || null
    );
  }

  /**
   * Get all narrative flows for demo scripting
   */
  getAllNarrativeFlows(): NarrativeFlow[] {
    return this.narrativeFlows;
  }

  /**
   * Get timing information for narration synchronization
   */
  getNarrationTimings(): { sectionDurations: number[]; cueTimings: number[] } {
    const baseDuration = 8000; // 8 seconds per section
    const cueDuration = 2000; // 2 seconds for transition cue

    const sectionDurations = this.narrativeFlows.map(() => baseDuration);
    const cueTimings = this.narrativeFlows.map(
      (_, index) =>
        index * (baseDuration + cueDuration) + baseDuration - cueDuration
    );

    return { sectionDurations, cueTimings };
  }

  /**
   * Trigger section-specific demonstration animations
   */
  triggerSectionDemo(sectionId: string): void {
    const sectionElement = document.getElementById(sectionId);
    if (!sectionElement) return;

    const flow = this.getNarrativeFlow(sectionId);
    if (!flow) return;

    // Dispatch demo event with narrative context
    sectionElement.dispatchEvent(
      new CustomEvent('section-demo-trigger', {
        detail: {
          sectionId,
          flow,
          timestamp: Date.now(),
        },
      })
    );

    // Execute section-specific animations
    this.executeSectionDemoAnimations(sectionId, flow);
  }

  private async performTransitionSequence(
    fromSection: string,
    toSection: string,
    config: TransitionConfig
  ): Promise<void> {
    const fromElement = document.getElementById(fromSection);
    const toElement = document.getElementById(toSection);

    if (!fromElement || !toElement) return;

    // Create transition timeline
    const timeline = gsap.timeline();

    // Fade out current section elements
    timeline.to(fromElement.querySelectorAll('.animate-in'), {
      opacity: 0,
      y: -30,
      duration: config.duration * 0.3,
      stagger: config.stagger,
      ease: config.ease,
    });

    // Add brief pause
    timeline.to({}, { duration: config.delay });

    // Scroll to new section
    timeline.to(
      window,
      {
        duration: config.duration,
        scrollTo: {
          y: toElement,
          offsetY: 0,
        },
        ease: config.ease,
      },
      '-=0.2'
    );

    // Fade in new section elements
    timeline.fromTo(
      toElement.querySelectorAll('.animate-in'),
      {
        opacity: 0,
        y: 30,
      },
      {
        opacity: 1,
        y: 0,
        duration: config.duration * 0.4,
        stagger: config.stagger,
        ease: config.ease,
      },
      '-=0.8'
    );

    await timeline;
  }

  private executeSectionDemoAnimations(
    sectionId: string,
    flow: NarrativeFlow
  ): void {
    const sectionElement = document.getElementById(sectionId);
    if (!sectionElement) return;

    // Create demo animation sequence based on section type
    const demoTimeline = gsap.timeline();

    switch (sectionId) {
      case 'hero':
        this.animateHeroDemo(demoTimeline, sectionElement);
        break;
      case 'platform-pillars':
        this.animatePillarsDemo(demoTimeline, sectionElement);
        break;
      case 'demo-theater':
        this.animateTheaterDemo(demoTimeline, sectionElement);
        break;
      case 'ecosystem-explorer':
        this.animateEcosystemDemo(demoTimeline, sectionElement);
        break;
      case 'architecture-diagram':
        this.animateArchitectureDemo(demoTimeline, sectionElement);
        break;
    }
  }

  private animateHeroDemo(
    timeline: gsap.core.Timeline,
    element: HTMLElement
  ): void {
    // Subtle pulsing effect on hero elements
    timeline.to(element.querySelector('.hero-title'), {
      scale: 1.02,
      duration: 2,
      yoyo: true,
      repeat: 1,
      ease: 'power2.inOut',
    });
  }

  private animatePillarsDemo(
    timeline: gsap.core.Timeline,
    element: HTMLElement
  ): void {
    // Simulate pillar interaction sequence
    const pillars = element.querySelectorAll('.pillar-item');

    pillars.forEach((pillar, index) => {
      timeline
        .to(
          pillar,
          {
            scale: 1.1,
            duration: 0.5,
            ease: 'back.out(1.7)',
          },
          index * 0.3
        )
        .to(
          pillar,
          {
            scale: 1,
            duration: 0.3,
            ease: 'power2.out',
          },
          '+=0.2'
        );
    });
  }

  private animateTheaterDemo(
    timeline: gsap.core.Timeline,
    element: HTMLElement
  ): void {
    // Simulate demo playback
    const playButton = element.querySelector('.play-button');
    const demoCategories = element.querySelectorAll('.demo-category');

    if (playButton) {
      timeline.to(playButton, {
        scale: 0.9,
        duration: 0.2,
        yoyo: true,
        repeat: 1,
      });
    }

    demoCategories.forEach((category, index) => {
      timeline.to(
        category,
        {
          opacity: index === 0 ? 1 : 0.3,
          duration: 0.5,
        },
        index * 1
      );
    });
  }

  private animateEcosystemDemo(
    timeline: gsap.core.Timeline,
    element: HTMLElement
  ): void {
    // Simulate library exploration
    const viewModeButtons = element.querySelectorAll('.view-mode-btn');

    viewModeButtons.forEach((button, index) => {
      timeline.to(
        button,
        {
          backgroundColor: index === 1 ? '#8a2be2' : 'rgba(138, 43, 226, 0.2)',
          duration: 0.3,
        },
        index * 1.5
      );
    });
  }

  private animateArchitectureDemo(
    timeline: gsap.core.Timeline,
    element: HTMLElement
  ): void {
    // Simulate architecture exploration
    const viewModeButtons = element.querySelectorAll('.view-mode-btn');

    viewModeButtons.forEach((button, index) => {
      timeline.to(
        button,
        {
          opacity: index === 2 ? 1 : 0.5,
          duration: 0.5,
        },
        index * 1.2
      );
    });
  }

  /**
   * Generate demo script for narration
   */
  generateDemoScript(): string {
    let script = '# AI SaaS Platform Demo Script\n\n';

    this.narrativeFlows.forEach((flow, index) => {
      const timing = index * 10; // 10 seconds per section

      script += `## ${index + 1}. ${flow.title} (${timing}s - ${
        timing + 8
      }s)\n\n`;
      script += `**Description:** ${flow.description}\n\n`;
      script += `**Key Points:**\n`;
      flow.keyPoints.forEach((point) => {
        script += `- ${point}\n`;
      });
      script += `\n**Demo Actions:**\n`;
      flow.demoActions.forEach((action) => {
        script += `- ${action}\n`;
      });
      script += `\n**Transition (${timing + 8}s):** ${flow.transitionCue}\n\n`;
      script += '---\n\n';
    });

    return script;
  }
}
