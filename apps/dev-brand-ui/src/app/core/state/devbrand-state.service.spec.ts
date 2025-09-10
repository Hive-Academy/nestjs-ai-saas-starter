import { TestBed } from '@angular/core/testing';
import { DevBrandStateService, DevBrandStore } from './devbrand-state.service';
import { AgentCommunicationService } from '../services/agent-communication.service';
import { InterfaceModeStore } from './interface-mode.store';
import type { AgentState, MemoryContext } from '../interfaces/agent-state.interface';
import { of } from 'rxjs';

describe('DevBrandStateService - User Requirement: Multi-Agent State Coordination', () => {
  let service: DevBrandStateService;
  let store: InstanceType<typeof DevBrandStore>;
  let mockAgentCommunication: jest.Mocked<AgentCommunicationService>;
  let mockInterfaceModeStore: jest.Mocked<InterfaceModeStore>;

  beforeEach(() => {
    mockAgentCommunication = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      switchAgent: jest.fn(),
      executeTool: jest.fn(),
      agentUpdates$: of(),
      memoryUpdates$: of(),
      isConnected: jest.fn().mockReturnValue(true),
    } as jest.Mocked<AgentCommunicationService>;

    mockInterfaceModeStore = {
      switchMode: jest.fn(),
    } as jest.Mocked<InterfaceModeStore>;

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AgentCommunicationService,
          useValue: mockAgentCommunication,
        },
        { provide: InterfaceModeStore, useValue: mockInterfaceModeStore },
      ],
    });

    service = TestBed.inject(DevBrandStateService);
    store = TestBed.inject(DevBrandStore);
  });

  describe('User Scenario: DevBrand Chat Studio showcase with multi-agent coordination', () => {
    it('should initialize with empty state ready for agent interactions', () => {
      expect(store.agents()).toEqual({});
      expect(store.activeAgentId()).toBeNull();
      expect(store.websocketConnected()).toBe(false);
      expect(store.memoryContexts()).toEqual([]);
    });

    it('should coordinate agent state across the immersive interface', () => {
      const githubAgent: AgentState = {
        id: 'github-analyzer',
        name: 'GitHub Code Analyzer',
        type: 'analyst',
        status: 'active',
        isActive: true,
        personality: {
          color: '#4285f4',
          avatar: 'code-analyzer',
        },
        currentAction: 'analyzing_repository',
        tools: ['github-analyzer', 'achievement-extractor'],
        metadata: {},
      };

      store.addAgent(githubAgent);
      expect(store.agents()['github-analyzer']).toEqual(githubAgent);
      expect(store.availableAgents()).toHaveLength(1);
    });

    it('should manage active agents for real-time visualization', () => {
      const agents: AgentState[] = [
        {
          id: 'supervisor',
          name: 'Brand Strategy Coordinator',
          type: 'coordinator',
          status: 'active',
          isActive: true,
          personality: { color: '#ff6b35', avatar: 'supervisor' },
          currentAction: 'coordinating_workflow',
          tools: [],
          metadata: {},
        },
        {
          id: 'content-creator',
          name: 'Content Creator Agent',
          type: 'creator',
          status: 'idle',
          isActive: false,
          personality: { color: '#32cd32', avatar: 'content-creator' },
          currentAction: null,
          tools: ['linkedin-generator', 'devto-generator'],
          metadata: {},
        },
      ];

      agents.forEach((agent) => store.addAgent(agent));

      expect(store.activeAgents()).toHaveLength(1);
      expect(store.activeAgents()[0].id).toBe('supervisor');
    });
  });

  describe('User Scenario: Memory context display for AI transparency', () => {
    it('should track and display relevant memory contexts', () => {
      const memoryContexts: MemoryContext[] = [
        {
          id: 'recent-achievement',
          type: 'episodic',
          content:
            'Successfully implemented React performance optimization reducing bundle size by 40%',
          relevanceScore: 0.95,
          isActive: true,
          timestamp: new Date(),
          metadata: {
            source: 'github-analysis',
            technologies: ['React', 'Webpack'],
          },
        },
        {
          id: 'brand-voice',
          type: 'semantic',
          content: 'User prefers technical deep-dives with practical examples',
          relevanceScore: 0.85,
          isActive: true,
          timestamp: new Date(),
          metadata: {
            source: 'content-analysis',
            contentType: 'brand-preference',
          },
        },
      ];

      store.updateMemoryContexts(memoryContexts);

      expect(store.memoryContexts()).toHaveLength(2);
      expect(store.activeMemoryContexts()).toHaveLength(2);
      expect(store.highRelevanceMemories()).toHaveLength(2);
      expect(store.activeMemoryCount()).toBe(2);
    });

    it('should categorize memory by type for UI organization', () => {
      const episodicMemory: MemoryContext = {
        id: 'ep-1',
        type: 'episodic',
        content: 'Recent coding achievement',
        relevanceScore: 0.8,
        isActive: true,
        timestamp: new Date(),
        metadata: {},
      };

      const semanticMemory: MemoryContext = {
        id: 'sem-1',
        type: 'semantic',
        content: 'JavaScript best practices knowledge',
        relevanceScore: 0.7,
        isActive: true,
        timestamp: new Date(),
        metadata: {},
      };

      store.updateMemoryContexts([episodicMemory, semanticMemory]);

      const categorized = store.memoryByType();
      expect(categorized.episodic).toHaveLength(1);
      expect(categorized.semantic).toHaveLength(1);
      expect(categorized.procedural).toHaveLength(0);
      expect(categorized.working).toHaveLength(0);
    });
  });

  describe('User Scenario: Agent switching and workflow coordination', () => {
    it('should handle agent switching for different tasks', () => {
      const githubAgentId = 'github-analyzer';

      service.switchAgent(githubAgentId);

      expect(mockAgentCommunication.switchAgent).toHaveBeenCalledWith(
        githubAgentId
      );
      expect(store.activeAgentId()).toBe(githubAgentId);
    });

    it('should coordinate interface mode changes with 3D scenes', () => {
      service.switchInterfaceMode('spatial');

      expect(mockInterfaceModeStore.switchMode).toHaveBeenCalledWith('spatial');
    });

    it('should support tool execution through active agents', () => {
      const toolName = 'github-analyzer';
      const parameters = { username: 'testdev', timeframe: 'week' };

      service.executeTool(toolName, parameters);

      expect(mockAgentCommunication.executeTool).toHaveBeenCalledWith(
        toolName,
        parameters
      );
    });
  });

  describe('User Acceptance: System health and connection status', () => {
    it('should track connection status for user feedback', () => {
      store.setConnectionStatus(true);
      expect(store.websocketConnected()).toBe(true);
      expect(store.systemHealthy()).toBe(true);
    });

    it('should handle error states gracefully', () => {
      // Simulate connection issues
      store.setConnectionStatus(false);
      store.incrementErrorCount();
      store.incrementErrorCount();

      expect(store.websocketConnected()).toBe(false);
      expect(store.errorCount()).toBe(2);
      expect(store.systemHealthy()).toBe(false);
    });

    it('should support error recovery', () => {
      store.incrementErrorCount();
      store.incrementErrorCount();
      expect(store.errorCount()).toBe(2);

      store.resetErrorCount();
      expect(store.errorCount()).toBe(0);
    });
  });

  describe('User Interface: UI state management for immersive experience', () => {
    it('should manage sidebar visibility for different interface modes', () => {
      expect(store.sidebarVisible()).toBe(true); // Default visible

      store.toggleSidebar();
      expect(store.sidebarVisible()).toBe(false);

      store.toggleSidebar();
      expect(store.sidebarVisible()).toBe(true);
    });

    it('should control context panel based on memory availability', () => {
      expect(store.shouldShowContextPanel()).toBe(false); // No memories yet

      const memory: MemoryContext = {
        id: 'test-memory',
        type: 'working',
        content: 'Active context',
        relevanceScore: 0.8,
        isActive: true,
        timestamp: new Date(),
        metadata: {},
      };

      store.addMemoryContext(memory);
      expect(store.shouldShowContextPanel()).toBe(true);
    });

    it('should support performance monitoring toggle', () => {
      expect(store.performanceMonitorVisible()).toBe(false);

      store.togglePerformanceMonitor();
      expect(store.performanceMonitorVisible()).toBe(true);
    });
  });

  describe('Performance: Optimized state updates for real-time UI', () => {
    it('should batch state updates efficiently', () => {
      const updates = {
        websocketConnected: true,
        activeAgentId: 'test-agent',
        sidebarVisible: false,
      };

      store.updateSystemState(updates);

      expect(store.websocketConnected()).toBe(true);
      expect(store.activeAgentId()).toBe('test-agent');
      expect(store.sidebarVisible()).toBe(false);
      expect(store.lastUpdate()).toBeInstanceOf(Date);
    });

    it('should provide reactive selectors for component subscriptions', () => {
      // Test computed selectors don't cause unnecessary re-renders
      const activeAgent = store.activeAgent();
      const systemHealthy = store.systemHealthy();
      const runningWorkflows = store.runningWorkflows();

      expect(activeAgent).toBeNull(); // No active agent initially
      expect(systemHealthy).toBe(false); // Not connected initially
      expect(runningWorkflows).toEqual([]);
    });
  });

  describe('Integration: Service initialization and cleanup', () => {
    it('should initialize agent communication on startup', () => {
      service.initialize();
      expect(mockAgentCommunication.connect).toHaveBeenCalled();
    });

    it('should cleanup resources properly', () => {
      service.cleanup();
      expect(mockAgentCommunication.disconnect).toHaveBeenCalled();
    });
  });
});
