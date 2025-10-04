import { Injectable, Logger } from '@nestjs/common';
import {
  Neo4jRepository,
  Safe,
  Neo4jCrudService,
  InjectNeogma,
  NeogmaService,
  type FindOptions,
} from '@hive-academy/nestjs-neo4j';
import { Memory } from '../../entities/neo4j';
import type {
  TraversalSpec,
  GraphTraversalResult,
  GraphStats,
  GraphNode,
  GraphPath,
  AgentState,
  GraphNodeData,
  GraphRelationshipData,
  GraphQueryResult,
  GraphOperation,
  GraphBatchResult,
  GraphFindCriteria,
} from '@hive-academy/langgraph-memory';
import { GraphTraversalService } from '../services/graph-traversal.service';
import { GraphAgentService } from '../services/graph-agent.service';
import { GraphCrudService } from '../services/graph-crud.service';

/**
 * Memory Graph Repository (Refactored - Composition Pattern)
 *
 * Main repository facade that delegates to specialized service classes.
 * Provides type-safe operations for graph-based memory management.
 *
 * Architecture:
 * - Neo4jCrudService: Basic CRUD operations via composition
 * - GraphTraversalService: Graph traversal, relationship queries, statistics
 * - GraphAgentService: Agent-aware operations, conversation flows, patterns
 * - GraphCrudService: Generic CRUD operations, batch processing
 *
 * Reduced from 1,312 lines to ~200 lines through composition pattern.
 * Using NEW composition pattern (no inheritance).
 */
@Neo4jRepository(() => Memory)
@Injectable()
export class MemoryGraphRepository {
  private readonly label = 'Memory';
  private readonly logger = new Logger(MemoryGraphRepository.name);

  constructor(
    private readonly crud: Neo4jCrudService,
    @InjectNeogma() private readonly neogma: NeogmaService,
    private readonly traversalService: GraphTraversalService,
    private readonly agentService: GraphAgentService,
    private readonly crudService: GraphCrudService
  ) {
    this.logger.debug(
      'MemoryGraphRepository initialized with composition pattern'
    );
  }

  // ============================================================================
  // CRUD OPERATIONS (Delegated to Neo4jCrudService)
  // ============================================================================

  async findById(id: string): Promise<Memory | null> {
    return this.crud.findById<Memory>(this.label, id);
  }

  async findAll(options?: FindOptions<Memory>): Promise<Memory[]> {
    return this.crud.findAll<Memory>(this.label, options);
  }

  async create(data: Partial<Memory>): Promise<Memory> {
    return this.crud.create<Memory>(this.label, data);
  }

  async update(id: string, updates: Partial<Memory>): Promise<Memory | null> {
    return this.crud.update<Memory>(this.label, id, updates);
  }

  async delete(id: string): Promise<boolean> {
    return this.crud.delete(this.label, id);
  }

  async count(where?: Partial<Memory>): Promise<number> {
    return this.crud.count<Memory>(this.label, where);
  }

  async exists(id: string): Promise<boolean> {
    return this.crud.exists(this.label, id);
  }

  // ============================================================================
  // GRAPH TRAVERSAL OPERATIONS (Delegated to GraphTraversalService)
  // ============================================================================

  @Safe()
  async traverse(
    startMemoryId: string,
    spec: TraversalSpec
  ): Promise<GraphTraversalResult> {
    return this.traversalService.traverse(startMemoryId, spec);
  }

  @Safe()
  async findRelated(
    memoryId: string,
    relationshipTypes?: string[],
    maxDepth = 2,
    limit = 20
  ): Promise<{
    relatedMemories: Memory[];
    relationshipPaths: GraphPath[];
    totalFound: number;
  }> {
    return this.traversalService.findRelated(
      memoryId,
      relationshipTypes,
      maxDepth,
      limit
    );
  }

  @Safe()
  async getStats(): Promise<GraphStats> {
    return this.traversalService.getStats();
  }

  // ============================================================================
  // AGENT-AWARE MEMORY OPERATIONS (Delegated to GraphAgentService)
  // ============================================================================

  @Safe()
  async createAgentMemoryRelationship(
    fromMemoryId: string,
    toMemoryId: string,
    agentState: AgentState,
    relationshipType: string
  ): Promise<string> {
    return this.agentService.createAgentMemoryRelationship(
      fromMemoryId,
      toMemoryId,
      agentState,
      relationshipType
    );
  }

  @Safe()
  async findRelatedMemoriesForAgent(
    startMemoryId: string,
    agentState: AgentState,
    maxDepth = 2
  ): Promise<{
    relatedMemories: Array<{
      memory: Memory;
      relationshipStrengths: number[];
      depth: number;
    }>;
    totalFound: number;
  }> {
    return this.agentService.findRelatedMemoriesForAgent(
      startMemoryId,
      agentState,
      maxDepth
    );
  }

  @Safe()
  async createConversationFlow(
    threadId: string,
    conversationMemories: string[]
  ): Promise<void> {
    return this.agentService.createConversationFlow(
      threadId,
      conversationMemories
    );
  }

  @Safe()
  async analyzeConversationPatterns(
    userId: string,
    limitDays = 30
  ): Promise<{
    conversationPatterns: Array<{
      threadId: string;
      messageCount: number;
      avgMessagesPerThread: number;
    }>;
    recentThreads: string[];
  }> {
    return this.agentService.analyzeConversationPatterns(userId, limitDays);
  }

  @Safe()
  async buildSemanticRelationships(
    memoryIds: string[],
    similarityThreshold = 0.7
  ): Promise<number> {
    return this.agentService.buildSemanticRelationships(
      memoryIds,
      similarityThreshold
    );
  }

  // ============================================================================
  // GENERIC GRAPH OPERATIONS (Delegated to GraphCrudService)
  // ============================================================================

  @Safe()
  async createGraphNode(data: GraphNodeData): Promise<string> {
    return this.crudService.createGraphNode(data);
  }

  @Safe()
  async createGraphRelationship(
    fromNodeId: string,
    toNodeId: string,
    data: GraphRelationshipData
  ): Promise<string> {
    return this.crudService.createGraphRelationship(fromNodeId, toNodeId, data);
  }

  @Safe()
  async executeCypher(
    query: string,
    parameters: Record<string, unknown> = {}
  ): Promise<GraphQueryResult> {
    return this.crudService.executeCypher(query, parameters);
  }

  @Safe()
  async batchExecuteOperations(
    operations: readonly GraphOperation[]
  ): Promise<GraphBatchResult> {
    return this.crudService.batchExecuteOperations(operations);
  }

  @Safe()
  async findGraphNodes(
    criteria: GraphFindCriteria
  ): Promise<readonly GraphNode[]> {
    return this.crudService.findGraphNodes(criteria);
  }

  @Safe()
  async deleteGraphNodes(nodeIds: readonly string[]): Promise<number> {
    return this.crudService.deleteGraphNodes([...nodeIds]);
  }

  @Safe()
  async deleteGraphRelationships(
    relationshipIds: readonly string[]
  ): Promise<number> {
    return this.crudService.deleteGraphRelationships([...relationshipIds]);
  }
}
