import { Injectable, computed, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { AgentCommunicationService } from '../services/agent-communication.service';
import { InterfaceModeStore } from './interface-mode.store';
import {
  AgentState,
  MemoryContext,
  WorkflowState,
  InterfaceMode,
} from '../interfaces/agent-state.interface';

export interface DevBrandStoreState {
  // Agent Management
  agents: Record<string, AgentState>;
  activeAgentId: string | null;

  // Memory Context
  memoryContexts: MemoryContext[];
  activeMemoryCount: number;

  // Workflow State
  workflows: Record<string, WorkflowState>;
  activeWorkflowId: string | null;

  // System Status
  websocketConnected: boolean;
  lastUpdate: Date | null;
  errorCount: number;

  // UI State
  sidebarVisible: boolean;
  contextPanelVisible: boolean;
  performanceMonitorVisible: boolean;
}

const initialState: DevBrandStoreState = {
  agents: {},
  activeAgentId: null,
  memoryContexts: [],
  activeMemoryCount: 0,
  workflows: {},
  activeWorkflowId: null,
  websocketConnected: false,
  lastUpdate: null,
  errorCount: 0,
  sidebarVisible: true,
  contextPanelVisible: true,
  performanceMonitorVisible: false,
};

/**
 * DevBrand State Store
 * Central state management for the entire DevBrand Chat Studio application
 * Coordinates between agent communication, interface modes, and UI state
 */
export const DevBrandStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    // Agent selectors
    activeAgent: computed(() => {
      const agentId = store.activeAgentId();
      return agentId ? store.agents()[agentId] : null;
    }),

    availableAgents: computed(() => Object.values(store.agents())),

    agentsByType: computed(() => {
      const agents = Object.values(store.agents());
      return {
        coordinators: agents.filter((a) => a.type === 'coordinator'),
        specialists: agents.filter((a) => a.type === 'specialist'),
        analysts: agents.filter((a) => a.type === 'analyst'),
        creators: agents.filter((a) => a.type === 'creator'),
      };
    }),

    activeAgents: computed(() =>
      Object.values(store.agents()).filter((agent) => agent.isActive)
    ),

    // Memory selectors
    activeMemoryContexts: computed(() =>
      store.memoryContexts().filter((context) => context.isActive)
    ),

    memoryByType: computed(() => {
      const contexts = store.memoryContexts();
      return {
        episodic: contexts.filter((c) => c.type === 'episodic'),
        semantic: contexts.filter((c) => c.type === 'semantic'),
        procedural: contexts.filter((c) => c.type === 'procedural'),
        working: contexts.filter((c) => c.type === 'working'),
      };
    }),

    highRelevanceMemories: computed(() =>
      store
        .memoryContexts()
        .filter((context) => context.isActive && context.relevanceScore > 0.7)
    ),

    // Workflow selectors
    activeWorkflow: computed(() => {
      const workflowId = store.activeWorkflowId();
      return workflowId ? store.workflows()[workflowId] : null;
    }),

    runningWorkflows: computed(() =>
      Object.values(store.workflows()).filter(
        (workflow) => workflow.status === 'executing'
      )
    ),

    // System status
    systemHealthy: computed(
      () => store.websocketConnected() && store.errorCount() < 5
    ),

    // UI state
    shouldShowContextPanel: computed(
      () => store.contextPanelVisible() && store.activeMemoryCount() > 0
    ),
  })),
  withMethods((store) => ({
    // Agent methods
    updateAgent: (agentId: string, updates: Partial<AgentState>) => {
      const currentAgents = store.agents();
      const currentAgent = currentAgents[agentId];

      if (!currentAgent) {
        console.warn(`Agent ${agentId} not found`);
        return;
      }

      const updatedAgent = { ...currentAgent, ...updates };

      patchState(store, {
        agents: {
          ...currentAgents,
          [agentId]: updatedAgent,
        },
        lastUpdate: new Date(),
      });
    },

    addAgent: (agent: AgentState) => {
      patchState(store, {
        agents: {
          ...store.agents(),
          [agent.id]: agent,
        },
        lastUpdate: new Date(),
      });
    },

    setActiveAgent: (agentId: string | null) => {
      patchState(store, {
        activeAgentId: agentId,
        lastUpdate: new Date(),
      });
    },

    // Memory methods
    updateMemoryContexts: (contexts: MemoryContext[]) => {
      const activeCount = contexts.filter((c) => c.isActive).length;

      patchState(store, {
        memoryContexts: contexts,
        activeMemoryCount: activeCount,
        lastUpdate: new Date(),
      });
    },

    addMemoryContext: (context: MemoryContext) => {
      const currentContexts = store.memoryContexts();
      const activeCount = context.isActive
        ? store.activeMemoryCount() + 1
        : store.activeMemoryCount();

      patchState(store, {
        memoryContexts: [...currentContexts, context],
        activeMemoryCount: activeCount,
        lastUpdate: new Date(),
      });
    },

    // Workflow methods
    updateWorkflow: (workflowId: string, updates: Partial<WorkflowState>) => {
      const currentWorkflows = store.workflows();
      const currentWorkflow = currentWorkflows[workflowId];

      if (!currentWorkflow) {
        console.warn(`Workflow ${workflowId} not found`);
        return;
      }

      const updatedWorkflow = { ...currentWorkflow, ...updates };

      patchState(store, {
        workflows: {
          ...currentWorkflows,
          [workflowId]: updatedWorkflow,
        },
        lastUpdate: new Date(),
      });
    },

    setActiveWorkflow: (workflowId: string | null) => {
      patchState(store, {
        activeWorkflowId: workflowId,
        lastUpdate: new Date(),
      });
    },

    // System methods
    setConnectionStatus: (connected: boolean) => {
      patchState(store, {
        websocketConnected: connected,
        lastUpdate: new Date(),
      });
    },

    incrementErrorCount: () => {
      patchState(store, {
        errorCount: store.errorCount() + 1,
        lastUpdate: new Date(),
      });
    },

    resetErrorCount: () => {
      patchState(store, {
        errorCount: 0,
        lastUpdate: new Date(),
      });
    },

    // UI methods
    toggleSidebar: () => {
      patchState(store, {
        sidebarVisible: !store.sidebarVisible(),
      });
    },

    toggleContextPanel: () => {
      patchState(store, {
        contextPanelVisible: !store.contextPanelVisible(),
      });
    },

    togglePerformanceMonitor: () => {
      patchState(store, {
        performanceMonitorVisible: !store.performanceMonitorVisible(),
      });
    },

    // Bulk state updates
    updateSystemState: (updates: Partial<DevBrandStoreState>) => {
      patchState(store, {
        ...updates,
        lastUpdate: new Date(),
      });
    },
  }))
);

/**
 * DevBrand State Service
 * Integration service that coordinates between stores and communication services
 */
@Injectable({
  providedIn: 'root',
})
export class DevBrandStateService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly agentCommunication = inject(AgentCommunicationService);
  private readonly interfaceModeStore = inject(InterfaceModeStore);
  private readonly devBrandStore = inject(DevBrandStore);

  // Public store access
  readonly interfaceMode = this.interfaceModeStore;
  readonly store = this.devBrandStore;

  constructor() {
    this.initializeDataBindings();
  }

  /**
   * Initialize the state management system
   */
  initialize(): void {
    this.agentCommunication.connect();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.agentCommunication.disconnect();
  }

  /**
   * Switch interface mode
   */
  switchInterfaceMode(mode: InterfaceMode): void {
    this.interfaceModeStore.switchMode(mode);
  }

  /**
   * Switch active agent
   */
  switchAgent(agentId: string): void {
    this.agentCommunication.switchAgent(agentId);
    this.devBrandStore.setActiveAgent(agentId);
  }

  /**
   * Execute tool with current agent
   */
  executeTool(toolName: string, parameters?: Record<string, unknown>): void {
    this.agentCommunication.executeTool(toolName, parameters);
  }

  /**
   * Initialize data bindings between services and stores
   */
  private initializeDataBindings(): void {
    // Sync agent states
    this.agentCommunication.agentUpdates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((agent) => {
        this.devBrandStore.addAgent(agent);
      });

    // Sync memory contexts
    this.agentCommunication.memoryUpdates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((contexts) => {
        this.devBrandStore.updateMemoryContexts(contexts);
      });

    // Sync connection status
    toObservable(this.agentCommunication.isConnected)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((connected: boolean) => {
        this.devBrandStore.setConnectionStatus(connected);
      });
  }
}
