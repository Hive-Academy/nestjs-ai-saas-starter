import { Injectable, Logger } from '@nestjs/common';
import {
  Neo4jRepositoryBase,
  Safe,
  Authorize,
  ValidateInput,
  AuditLog,
  RateLimit,
  NeogmaService,
  Neo4jCrudService,
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
  MemoryEntry,
} from '@hive-academy/langgraph-memory';
import { GraphTraversalService } from '../services/graph-traversal.service';
import { GraphAgentService } from '../services/graph-agent.service';
import { GraphCrudService } from '../services/graph-crud.service';

/**
 * Memory Graph Repository (Refactored - Extends Neo4jRepository)
 *
 * Main repository facade that delegates to specialized service classes.
 * Provides type-safe operations for graph-based memory management.
 *
 * Architecture:
 * - Neo4jRepository<Memory>: Automatic CRUD operations via inheritance
 * - GraphTraversalService: Graph traversal, relationship queries, statistics
 * - GraphAgentService: Agent-aware operations, conversation flows, patterns
 * - GraphCrudService: Generic CRUD operations, batch processing
 *
 * Reduced from 1,312 lines to ~200 lines through composition pattern.
 *
 * CRUD methods (inherited from Neo4jRepository<Memory>):
 * - findById, findAll, create, update, delete, count, exists
 */
@Injectable()
export class MemoryGraphRepository extends Neo4jRepositoryBase<Memory> {
  private readonly logger = new Logger(MemoryGraphRepository.name);

  constructor(
    neogma: NeogmaService,
    crud: Neo4jCrudService,
    private readonly traversalService: GraphTraversalService,
    private readonly agentService: GraphAgentService,
    private readonly crudService: GraphCrudService
  ) {
    super(Memory, 'Memory', neogma, crud);
    this.logger.debug(
      'MemoryGraphRepository initialized with composition pattern'
    );
  }

  // ============================================================================
  // GRAPH TRAVERSAL OPERATIONS (Delegated to GraphTraversalService)
  // ============================================================================

  @RateLimit({ strategy: 'fixed-window', requests: 100, window: '1h' }) // Rate limit to prevent abuse
  @Safe()
  async traverse(
    startMemoryId: string,
    spec: TraversalSpec
  ): Promise<GraphTraversalResult> {
    return this.traversalService.traverse(startMemoryId, spec);
  }

  @Safe()
  async findRelatedMemories(
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

  @ValidateInput()
  @AuditLog({ logLevel: 'detailed', enabled: true, logSuccess: true })
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

  /**
   * Track a memory entry in graph - delegates to agent service
   */
  @Safe()
  async trackMemory(memory: MemoryEntry): Promise<void> {
    return this.agentService.trackMemory(memory);
  }

  /**
   * Track multiple memories in batch - delegates to agent service
   */
  @Safe()
  async trackMemoriesBatch(memories: readonly MemoryEntry[]): Promise<void> {
    return this.agentService.trackMemoriesBatch(memories);
  }

  /**
   * Delete memories from graph - delegates to agent service
   */
  @Safe()
  async deleteMemories(memoryIds: readonly string[]): Promise<number> {
    return this.agentService.deleteMemories(memoryIds);
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

  @Authorize({ roles: ['admin'] })
  @AuditLog({ logLevel: 'standard', enabled: true, logSuccess: true })
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
