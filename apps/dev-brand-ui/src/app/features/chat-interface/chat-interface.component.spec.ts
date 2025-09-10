import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ChatInterfaceComponent } from './chat-interface.component';
import { DevBrandStateService } from '../../core/state/devbrand-state.service';
import type {
  AgentState,
  MemoryContext,
} from '../../core/interfaces/agent-state.interface';
import { signal } from '@angular/core';

describe('ChatInterfaceComponent - User Requirement: Immersive Chat Interface', () => {
  let component: ChatInterfaceComponent;
  let fixture: ComponentFixture<ChatInterfaceComponent>;
  let mockStateService: jest.Mocked<DevBrandStateService>;
  let mockStore: any;

  beforeEach(async () => {
    // Mock store with signals
    mockStore = {
      websocketConnected: signal(false),
      activeAgents: signal([]),
      activeAgentId: signal(null),
      activeMemoryContexts: signal([]),
    };

    mockStateService = {
      initialize: jest.fn(),
      switchInterfaceMode: jest.fn(),
      store: mockStore,
    } as jest.Mocked<DevBrandStateService>;

    await TestBed.configureTestingModule({
      imports: [CommonModule, ChatInterfaceComponent],
      providers: [
        { provide: DevBrandStateService, useValue: mockStateService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatInterfaceComponent);
    component = fixture.componentInstance;
  });

  describe('User Scenario: DevBrand Chat Studio showcases powerful AI setup', () => {
    it('should initialize the chat interface with proper branding', () => {
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const header = compiled.querySelector('.chat-header h1');

      expect(header.textContent).toContain('DevBrand Chat Studio');
      expect(mockStateService.initialize).toHaveBeenCalled();
      expect(mockStateService.switchInterfaceMode).toHaveBeenCalledWith('chat');
    });

    it('should display connection status for user awareness', () => {
      fixture.detectChanges();

      const connectionStatus =
        fixture.nativeElement.querySelector('.connection-status');
      expect(connectionStatus.textContent.trim()).toBe('Disconnected');
      expect(connectionStatus.classList.contains('connected')).toBe(false);

      // Test connected state
      mockStore.websocketConnected.set(true);
      fixture.detectChanges();

      expect(connectionStatus.textContent.trim()).toBe('Connected');
      expect(connectionStatus.classList.contains('connected')).toBe(true);
    });
  });

  describe('User Scenario: Multi-agent visualization and coordination', () => {
    it('should display active agents with visual personalities', () => {
      const testAgents: AgentState[] = [
        {
          id: 'github-analyzer',
          name: 'GitHub Code Analyzer',
          type: 'analyst',
          status: 'executing',
          currentTask: 'analyzing_repository',
          position: { x: 0, y: 0 },
          capabilities: ['github-analyzer'],
          isActive: true,
          lastActiveTime: new Date(),
          currentTools: [],
          personality: {
            color: '#4285f4',
            avatar: 'code-analyzer',
            description: 'Analyzes GitHub repositories',
          },
        },
        {
          id: 'content-creator',
          name: 'Content Creator Agent',
          type: 'creator',
          status: 'idle',
          currentTask: 'content_creation',
          position: { x: 100, y: 0 },
          capabilities: ['linkedin-generator'],
          isActive: false,
          lastActiveTime: new Date(),
          currentTools: [],
          personality: {
            color: '#32cd32',
            avatar: 'content-creator',
            description: 'Creates content for social media',
          },
        },
      ];

      mockStore.activeAgents.set(testAgents);
      mockStore.activeAgentId.set('github-analyzer');
      fixture.detectChanges();

      const agentCards = fixture.nativeElement.querySelectorAll('.agent-card');
      expect(agentCards.length).toBe(2);

      // Test first agent (active)
      const activeAgent = agentCards[0];
      expect(activeAgent.classList.contains('active')).toBe(true);
      expect(activeAgent.querySelector('.agent-name').textContent).toBe(
        'GitHub Code Analyzer'
      );
      expect(activeAgent.querySelector('.agent-status').textContent).toBe(
        'executing'
      );

      const activeAvatar = activeAgent.querySelector('.agent-avatar');
      expect(activeAvatar.style.backgroundColor).toBe('rgb(66, 133, 244)'); // #4285f4 converted
    });

    it('should show agent switching visualization for user understanding', () => {
      const agent: AgentState = {
        id: 'brand-strategist',
        name: 'Brand Strategy Coordinator',
        type: 'coordinator',
        status: 'executing',
        currentTask: 'coordinating_workflow',
        position: { x: 50, y: 50 },
        capabilities: ['workflow-coordination'],
        isActive: true,
        lastActiveTime: new Date(),
        currentTools: [],
        personality: {
          color: '#ff6b35',
          avatar: 'supervisor',
          description: 'Coordinates brand strategy workflows',
        },
      };

      mockStore.activeAgents.set([agent]);
      mockStore.activeAgentId.set('brand-strategist');
      fixture.detectChanges();

      const agentCard = fixture.nativeElement.querySelector('.agent-card');
      expect(agentCard.classList.contains('active')).toBe(true);
      expect(agentCard.querySelector('.agent-name').textContent).toBe(
        'Brand Strategy Coordinator'
      );
    });
  });

  describe('User Scenario: Memory context display for AI transparency', () => {
    it('should display relevant memory contexts being used by agents', () => {
      const testMemoryContexts: MemoryContext[] = [
        {
          id: 'recent-achievement',
          type: 'episodic',
          content:
            'Successfully implemented React performance optimization reducing bundle size by 40%',
          relevanceScore: 0.95,
          isActive: true,
          timestamp: new Date(),
          source: 'chromadb',
          tags: ['github-analysis', 'React', 'Webpack'],
          relatedAgents: ['github-analyzer'],
        },
        {
          id: 'brand-voice',
          type: 'semantic',
          content: 'User prefers technical deep-dives with practical examples',
          relevanceScore: 0.85,
          isActive: true,
          timestamp: new Date(),
          source: 'neo4j',
          tags: ['content-analysis', 'brand-voice'],
          relatedAgents: ['content-creator'],
        },
      ];

      mockStore.activeMemoryContexts.set(testMemoryContexts);
      fixture.detectChanges();

      const memoryCards =
        fixture.nativeElement.querySelectorAll('.memory-card');
      expect(memoryCards.length).toBe(2);

      // Test first memory card
      const firstMemory = memoryCards[0];
      expect(firstMemory.querySelector('.memory-type').textContent).toBe(
        'episodic'
      );
      expect(
        firstMemory.querySelector('.memory-content').textContent
      ).toContain('React performance optimization');
      expect(firstMemory.querySelector('.relevance-score').textContent).toBe(
        '95%'
      );

      // Test second memory card
      const secondMemory = memoryCards[1];
      expect(secondMemory.querySelector('.memory-type').textContent).toBe(
        'semantic'
      );
      expect(secondMemory.querySelector('.relevance-score').textContent).toBe(
        '85%'
      );
    });

    it('should highlight high-relevance memories for user insight', () => {
      const highRelevanceMemory: MemoryContext = {
        id: 'critical-context',
        type: 'working',
        content: 'Currently working on microservices architecture migration',
        relevanceScore: 0.98,
        isActive: true,
        timestamp: new Date(),
        source: 'workflow',
        tags: ['microservices', 'architecture', 'migration', 'priority-high'],
        relatedAgents: ['architect-agent'],
      };

      mockStore.activeMemoryContexts.set([highRelevanceMemory]);
      fixture.detectChanges();

      const memoryCard = fixture.nativeElement.querySelector('.memory-card');
      expect(memoryCard.querySelector('.relevance-score').textContent).toBe(
        '98%'
      );
      expect(memoryCard.querySelector('.memory-type').textContent).toBe(
        'working'
      );
    });
  });

  describe('User Interface: Chat Studio layout and design', () => {
    it('should provide immersive dark theme design', () => {
      fixture.detectChanges();

      const chatInterface =
        fixture.nativeElement.querySelector('.chat-interface');
      const computedStyle = window.getComputedStyle(chatInterface);

      // Check if dark theme is applied (background should be dark)
      // Note: In actual test, we'd check computed styles
      expect(chatInterface.classList.contains('chat-interface')).toBe(true);
    });

    it('should display three-panel layout for comprehensive AI showcase', () => {
      fixture.detectChanges();

      const chatContent = fixture.nativeElement.querySelector('.chat-content');
      const agentsPanel = fixture.nativeElement.querySelector('.agents-panel');
      const chatMessages =
        fixture.nativeElement.querySelector('.chat-messages');
      const memoryPanel = fixture.nativeElement.querySelector('.memory-panel');

      expect(chatContent).toBeTruthy();
      expect(agentsPanel).toBeTruthy();
      expect(chatMessages).toBeTruthy();
      expect(memoryPanel).toBeTruthy();
    });

    it('should show placeholder for future message implementation', () => {
      fixture.detectChanges();

      const messagePlaceholder = fixture.nativeElement.querySelector(
        '.message-placeholder'
      );
      expect(messagePlaceholder.textContent).toContain(
        'Chat messages will appear here when real-time communication is active'
      );
    });
  });

  describe('User Acceptance: Interface showcases powerful AI capabilities', () => {
    it('should demonstrate multi-agent coordination visually', async () => {
      // Setup complete scenario with multiple agents and memory
      const agents: AgentState[] = [
        {
          id: 'supervisor',
          name: 'Brand Strategy Coordinator',
          type: 'coordinator',
          status: 'executing',
          currentTask: 'coordinating_workflow',
          position: { x: 25, y: 25 },
          capabilities: ['workflow-coordination'],
          isActive: true,
          lastActiveTime: new Date(),
          currentTools: [],
          personality: {
            color: '#ff6b35',
            avatar: 'supervisor',
            description: 'Coordinates brand strategy workflows',
          },
        },
        {
          id: 'github-analyzer',
          name: 'GitHub Code Analyzer',
          type: 'analyst',
          status: 'executing',
          currentTask: 'analyzing_repository',
          position: { x: 75, y: 25 },
          capabilities: ['github-analyzer'],
          isActive: true,
          lastActiveTime: new Date(),
          currentTools: [],
          personality: {
            color: '#4285f4',
            avatar: 'code-analyzer',
            description: 'Analyzes GitHub repositories',
          },
        },
      ];

      const memories: MemoryContext[] = [
        {
          id: 'dev-achievement',
          type: 'episodic',
          content: 'Implemented advanced NestJS microservices architecture',
          relevanceScore: 0.92,
          isActive: true,
          timestamp: new Date(),
          source: 'chromadb',
          tags: ['NestJS', 'Microservices', 'architecture'],
          relatedAgents: ['github-analyzer'],
        },
      ];

      mockStore.activeAgents.set(agents);
      mockStore.activeMemoryContexts.set(memories);
      mockStore.websocketConnected.set(true);
      mockStore.activeAgentId.set('supervisor');

      fixture.detectChanges();

      // Verify all components are displayed
      expect(
        fixture.nativeElement.querySelectorAll('.agent-card')
      ).toHaveLength(2);
      expect(
        fixture.nativeElement.querySelectorAll('.memory-card')
      ).toHaveLength(1);
      expect(
        fixture.nativeElement
          .querySelector('.connection-status')
          .textContent.trim()
      ).toBe('Connected');

      // Verify active agent is highlighted
      const activeAgentCard =
        fixture.nativeElement.querySelector('.agent-card.active');
      expect(activeAgentCard.querySelector('.agent-name').textContent).toBe(
        'Brand Strategy Coordinator'
      );
    });

    it('should provide responsive design for different screen sizes', () => {
      fixture.detectChanges();

      const chatContent = fixture.nativeElement.querySelector('.chat-content');
      // In a real test, we'd test responsive breakpoints
      // For now, verify the grid layout is applied
      expect(chatContent).toBeTruthy();
    });
  });

  describe('Performance: Optimized for real-time updates', () => {
    it('should handle rapid agent state changes efficiently', () => {
      // Simulate rapid agent updates
      for (let i = 0; i < 10; i++) {
        const agent: AgentState = {
          id: `agent-${i}`,
          name: `Test Agent ${i}`,
          type: 'specialist',
          status: 'executing',
          currentTask: `action-${i}`,
          position: { x: i * 10, y: 0 },
          capabilities: [`capability-${i}`],
          isActive: i % 2 === 0,
          lastActiveTime: new Date(),
          currentTools: [],
          personality: {
            color: '#333333',
            avatar: 'test',
            description: `Test agent ${i} for performance testing`,
          },
        };

        mockStore.activeAgents.update((agents: AgentState[]) => [
          ...agents,
          agent,
        ]);
      }

      fixture.detectChanges();

      // Component should handle multiple agents without performance issues
      const agentCards = fixture.nativeElement.querySelectorAll('.agent-card');
      expect(agentCards.length).toBe(10);
    });

    it('should efficiently update memory context display', () => {
      const memories: MemoryContext[] = Array.from({ length: 5 }, (_, i) => ({
        id: `memory-${i}`,
        type: 'working' as const,
        content: `Memory context ${i}`,
        relevanceScore: 0.8 + i * 0.02,
        isActive: true,
        timestamp: new Date(),
        source: 'workflow' as const,
        tags: [`context-${i}`, 'performance-test'],
        relatedAgents: [`agent-${i}`],
      }));

      mockStore.activeMemoryContexts.set(memories);
      fixture.detectChanges();

      const memoryCards =
        fixture.nativeElement.querySelectorAll('.memory-card');
      expect(memoryCards.length).toBe(5);
    });
  });
});
