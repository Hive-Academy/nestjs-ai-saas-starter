import { Injectable, Logger } from '@nestjs/common';
import { StateGraph, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { WorkflowState } from '../interfaces';
// Removed unused imports: WorkflowNode, WorkflowEdge, Command
import type {
  NodeHandler,
  EdgeCondition,
} from './workflow-graph-builder.service';

/**
 * Service responsible for common graph patterns and specialized graph builders
 * Extracted from WorkflowGraphBuilderService for better separation of concerns
 */
@Injectable()
export class GraphPatternsService {
  private readonly logger = new Logger(GraphPatternsService.name);

  /**
   * Helper to safely add a node to the graph without triggering TypeScript's excessive stack depth
   */
  private safeAddNode<TState>(
    graph: StateGraph<TState>,
    nodeId: string,
    handler: (state: TState) => any
  ): void {
    const nodeAction = (() => handler) as any;
    (graph as any).addNode(nodeId, nodeAction());
  }

  /**
   * Add a tool node with automatic routing
   */
  addToolNode<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    nodeId: string,
    tools: any[],
    returnTo?: string
  ): void {
    const toolNode = new ToolNode(tools);
    this.safeAddNode(graph, nodeId, async (state: TState) =>
      toolNode.invoke(state)
    );

    // Add routing back to the calling node
    if (returnTo) {
      graph.addEdge(nodeId as any, returnTo as any);
    }
  }

  /**
   * Add a subgraph as a node
   */
  addSubgraph<TState extends WorkflowState = WorkflowState>(
    graph: StateGraph<TState>,
    nodeId: string,
    subgraph: StateGraph<any> | (() => StateGraph<any>),
    transforms?: {
      input?: (state: TState) => any;
      output?: (state: any) => Partial<TState>;
    }
  ): void {
    const subgraphHandler = async (state: TState) => {
      const sg = typeof subgraph === 'function' ? subgraph() : subgraph;
      const compiled = sg.compile();

      // Transform input if needed
      const input = transforms?.input ? transforms.input(state) : state;

      // Execute subgraph
      const result = await compiled.invoke(input);

      // Transform output if needed
      return transforms?.output ? transforms.output(result) : result;
    };

    this.safeAddNode(graph, nodeId, subgraphHandler);
  }

  /**
   * Build a graph with human-in-the-loop support
   */
  buildWithHITL<TState extends WorkflowState = WorkflowState>(
    name: string,
    options: {
      approvalNode: NodeHandler<TState>;
      approvalRouting: EdgeCondition<TState>;
      stateAnnotation?: any;
      checkpointer?: any;
      debug?: boolean;
    }
  ): StateGraph<TState> {
    const stateAnnotation = options.stateAnnotation;
    const graph = new StateGraph<TState>(stateAnnotation);

    // Add human approval node
    this.safeAddNode(graph, 'human_approval', options.approvalNode);

    // Add conditional routing for approval
    graph.addConditionalEdges(
      'human_approval' as any,
      options.approvalRouting as any,
      {
        approved: 'continue',
        rejected: 'end',
        retry: 'human_approval',
      } as any
    );

    this.logger.debug(`HITL graph '${name}' created with approval routing`);
    return graph;
  }

  /**
   * Create a supervisor pattern graph
   */
  buildSupervisorGraph<TState extends WorkflowState = WorkflowState>(
    name: string,
    supervisor: NodeHandler<TState>,
    workers: Record<string, NodeHandler<TState>>,
    options: {
      stateAnnotation?: any;
      checkpointer?: any;
      debug?: boolean;
    } = {}
  ): StateGraph<TState> {
    const stateAnnotation = options.stateAnnotation;
    const graph = new StateGraph<TState>(stateAnnotation);

    // Add supervisor node
    this.safeAddNode(graph, 'supervisor', supervisor);
    graph.setEntryPoint('supervisor' as any);

    // Add worker nodes
    for (const [workerId, worker] of Object.entries(workers)) {
      this.safeAddNode(graph, workerId, worker);
      // Workers report back to supervisor
      graph.addEdge(workerId as any, 'supervisor' as any);
    }

    // Supervisor routes to workers or ends
    graph.addConditionalEdges(
      'supervisor' as any,
      ((state: TState) => {
        // Check if a specific worker should be called
        const { nextWorker } = state as any;
        if (nextWorker && workers[nextWorker]) {
          return nextWorker;
        }
        // Otherwise end
        return END;
      }) as any,
      {
        ...Object.keys(workers).reduce<Record<string, string>>((acc, key) => {
          acc[key] = key;
          return acc;
        }, {}),
        [END]: END,
      } as any
    );

    this.logger.debug(
      `Supervisor graph '${name}' created with ${
        Object.keys(workers).length
      } workers`
    );
    return graph;
  }

  /**
   * Create a pipeline pattern graph
   */
  buildPipelineGraph<TState extends WorkflowState = WorkflowState>(
    name: string,
    stages: Array<{
      id: string;
      handler: NodeHandler<TState>;
      condition?: EdgeCondition<TState>;
    }>,
    options: {
      stateAnnotation?: any;
      checkpointer?: any;
      debug?: boolean;
    } = {}
  ): StateGraph<TState> {
    const stateAnnotation = options.stateAnnotation;
    const graph = new StateGraph<TState>(stateAnnotation);

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const nextStage = stages[i + 1];

      // Add stage node
      this.safeAddNode(graph, stage.id, stage.handler);

      // Add edge to next stage or end
      if (stage.condition) {
        // Conditional routing
        graph.addConditionalEdges(
          stage.id as any,
          stage.condition as any,
          {
            continue: nextStage ? nextStage.id : END,
            skip: stages[i + 2]?.id || END,
            end: END,
          } as any
        );
      } else if (nextStage) {
        // Simple edge to next stage
        graph.addEdge(stage.id as any, nextStage.id as any);
      } else {
        // Last stage goes to END
        graph.addEdge(stage.id as any, END as any);
      }
    }

    // Set entry point to first stage
    if (stages.length > 0) {
      graph.setEntryPoint(stages[0].id as any);
    }

    this.logger.debug(
      `Pipeline graph '${name}' created with ${stages.length} stages`
    );
    return graph;
  }

  /**
   * Create a map-reduce pattern graph
   */
  buildMapReduceGraph<TState extends WorkflowState = WorkflowState>(
    name: string,
    mapper: {
      handler: NodeHandler<TState>;
      parallelism: number;
    },
    reducer: NodeHandler<TState>,
    options: {
      stateAnnotation?: any;
      checkpointer?: any;
      debug?: boolean;
    } = {}
  ): StateGraph<TState> {
    const stateAnnotation = options.stateAnnotation;
    const graph = new StateGraph<TState>(stateAnnotation);

    // Add mapper nodes
    for (let i = 0; i < mapper.parallelism; i++) {
      const mapperId = `mapper_${i}`;
      this.safeAddNode(graph, mapperId, mapper.handler);
      // Each mapper connects to reducer
      graph.addEdge(mapperId as any, 'reducer' as any);
    }

    // Add reducer node
    this.safeAddNode(graph, 'reducer', reducer);

    // Add distributor node that routes to mappers
    this.safeAddNode(graph, 'distributor', async (state: TState) => {
      // Logic to distribute work to mappers
      const mapperIndex = Math.floor(Math.random() * mapper.parallelism);
      return {
        ...state,
        nextMapper: `mapper_${mapperIndex}`,
      } as Partial<TState>;
    });

    // Distributor routes to mappers
    graph.addConditionalEdges(
      'distributor' as any,
      ((state: TState) => {
        const { nextMapper } = state as any;
        return nextMapper || 'mapper_0';
      }) as any,
      Array.from({ length: mapper.parallelism }).reduce<Record<string, string>>(
        (acc, _, i) => {
          const mapperId = `mapper_${i}`;
          acc[mapperId] = mapperId;
          return acc;
        },
        {}
      ) as any
    );

    graph.setEntryPoint('distributor' as any);

    this.logger.debug(
      `Map-reduce graph '${name}' created with ${mapper.parallelism} mappers`
    );
    return graph;
  }

  /**
   * Create a branching pattern graph with parallel execution
   */
  buildBranchingGraph<TState extends WorkflowState = WorkflowState>(
    name: string,
    branches: Record<
      string,
      {
        condition: EdgeCondition<TState>;
        handler: NodeHandler<TState>;
      }
    >,
    merger: NodeHandler<TState>,
    options: {
      stateAnnotation?: any;
      checkpointer?: any;
      debug?: boolean;
    } = {}
  ): StateGraph<TState> {
    const stateAnnotation = options.stateAnnotation;
    const graph = new StateGraph<TState>(stateAnnotation);

    // Add decision node
    this.safeAddNode(graph, 'decision', async (state: TState) => {
      // Evaluate all branch conditions
      for (const [branchId, branch] of Object.entries(branches)) {
        const shouldTake = branch.condition(state);
        if (shouldTake) {
          return {
            ...state,
            selectedBranch: branchId,
          } as Partial<TState>;
        }
      }
      // Default branch if none match
      return {
        ...state,
        selectedBranch: 'default',
      } as Partial<TState>;
    });

    // Add branch nodes
    for (const [branchId, branch] of Object.entries(branches)) {
      this.safeAddNode(graph, branchId, branch.handler);
      // Each branch connects to merger
      graph.addEdge(branchId as any, 'merger' as any);
    }

    // Add merger node
    this.safeAddNode(graph, 'merger', merger);

    // Decision routes to branches
    graph.addConditionalEdges(
      'decision' as any,
      ((state: TState) => {
        const { selectedBranch } = state as any;
        return selectedBranch || 'default';
      }) as any,
      {
        ...Object.keys(branches).reduce<Record<string, string>>((acc, key) => {
          acc[key] = key;
          return acc;
        }, {}),
        default: 'merger', // Skip directly to merger if no branch matches
      } as any
    );

    graph.setEntryPoint('decision' as any);

    this.logger.debug(
      `Branching graph '${name}' created with ${
        Object.keys(branches).length
      } branches`
    );
    return graph;
  }

  /**
   * Create a retry pattern graph
   */
  buildRetryGraph<TState extends WorkflowState = WorkflowState>(
    name: string,
    operation: {
      handler: NodeHandler<TState>;
      maxRetries: number;
      backoffMs: number;
    },
    options: {
      stateAnnotation?: any;
      checkpointer?: any;
      debug?: boolean;
    } = {}
  ): StateGraph<TState> {
    const stateAnnotation = options.stateAnnotation;
    const graph = new StateGraph<TState>(stateAnnotation);

    // Add operation node with retry logic
    this.safeAddNode(graph, 'operation', async (state: TState) => {
      const retryCount = (state as any).retryCount || 0;

      try {
        const result = await operation.handler(state);
        return {
          ...result,
          success: true,
          retryCount: 0,
        };
      } catch (error: any) {
        if (retryCount < operation.maxRetries) {
          // Wait with exponential backoff
          const delay = operation.backoffMs * Math.pow(2, retryCount);
          await new Promise((resolve) => setTimeout(resolve, delay));

          return {
            ...state,
            retryCount: retryCount + 1,
            lastError: error.message,
            shouldRetry: true,
          } as Partial<TState>;
        }

        // Max retries exceeded
        return {
          ...state,
          error: {
            id: `error-${Date.now()}`,
            nodeId: 'operation',
            type: 'execution' as const,
            message: error.message,
            isRecoverable: false,
            timestamp: new Date(),
          },
          failed: true,
        } as Partial<TState>;
      }
    });

    // Add conditional routing for retry
    graph.addConditionalEdges(
      'operation' as any,
      ((state: TState) => {
        const { shouldRetry, failed, success } = state as any;
        if (shouldRetry) return 'operation'; // Retry
        if (failed) return END; // Failed after max retries
        if (success) return END; // Success
        return END;
      }) as any,
      {
        operation: 'operation',
        [END]: END,
      } as any
    );

    graph.setEntryPoint('operation' as any);

    this.logger.debug(
      `Retry graph '${name}' created with max retries: ${operation.maxRetries}`
    );
    return graph;
  }
}
