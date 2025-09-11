import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsEnum,
  IsNumber,
  ValidateNested,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AnalysisDepth, ContentPlatform } from './devbrand-api.dto';

/**
 * DevBrand WebSocket DTOs - Real-time Communication Contracts
 *
 * Defines the message contracts for WebSocket communication between frontend and backend.
 * These DTOs support all 5 Revolutionary Frontend Interface Modes with real-time streaming.
 */

/**
 * Workflow Stream Options
 * Configuration for streaming workflow execution
 */
export class DevBrandStreamOptionsDto {
  @IsOptional()
  @IsString()
  githubUsername?: string;

  @IsOptional()
  @IsEnum(AnalysisDepth)
  analysisDepth?: AnalysisDepth;

  @IsOptional()
  @IsArray()
  @IsEnum(ContentPlatform, { each: true })
  contentPlatforms?: ContentPlatform[];

  @IsOptional()
  @IsString()
  @IsEnum(['values', 'updates', 'messages'])
  streamMode?: 'values' | 'updates' | 'messages';

  @IsOptional()
  @IsObject()
  config?: any;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

/**
 * DevBrand Stream Request
 * Request to start streaming workflow execution
 */
export class DevBrandStreamRequestDto {
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DevBrandStreamOptionsDto)
  options?: DevBrandStreamOptionsDto;
}

/**
 * Agent Status Update
 * Real-time agent health and coordination status
 */
export class AgentStatusUpdateDto {
  @IsString()
  networkId: string;

  @IsArray()
  agents: Array<{
    id: string;
    name: string;
    healthy: boolean;
    capabilities: string[];
    currentTask?: string;
    performance?: {
      responseTime: number;
      successRate: number;
      totalExecutions: number;
    };
  }>;

  @IsObject()
  networkStats: {
    totalExecutions: number;
    averageExecutionTime: number;
    activeWorkflows: number;
    errorRate: number;
  };

  @IsObject()
  systemHealth: {
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
    uptime: number;
  };
}

/**
 * Memory Update
 * Brand memory changes and context updates
 */
export class MemoryUpdateDto {
  @IsString()
  userId: string;

  @IsString()
  updateType: 'new_memory' | 'context_change' | 'analytics_update';

  @IsOptional()
  @IsObject()
  newMemory?: {
    id: string;
    type: string;
    content: string;
    metadata: Record<string, any>;
  };

  @IsOptional()
  @IsArray()
  contextChanges?: Array<{
    memoryId: string;
    changeType: 'updated' | 'relevance_changed' | 'archived';
    previousValue?: any;
    newValue?: any;
  }>;

  @IsOptional()
  @IsObject()
  analyticsUpdate?: {
    totalMemories: number;
    memoryTypes: Record<string, number>;
    recentActivity: Array<{
      action: string;
      timestamp: string;
      memoryType: string;
    }>;
    brandMetrics: {
      contentPerformance: number;
      skillDevelopment: number;
      brandConsistency: number;
      engagement: number;
    };
  };
}

/**
 * Workflow Progress
 * Real-time workflow execution progress
 */
export class WorkflowProgressDto {
  @IsString()
  workflowId: string;

  @IsString()
  workflowType:
    | 'personal_brand_development'
    | 'github_analysis'
    | 'content_generation'
    | 'brand_strategy';

  @IsNumber()
  stepNumber: number;

  @IsOptional()
  @IsNumber()
  totalSteps?: number;

  @IsString()
  currentAgent: string;

  @IsArray()
  agentCapabilities: string[];

  @IsOptional()
  @IsString()
  currentTask?: string;

  @IsOptional()
  @IsString()
  status:
    | 'starting'
    | 'in_progress'
    | 'agent_switch'
    | 'tool_execution'
    | 'completing'
    | 'completed'
    | 'error';

  @IsOptional()
  @IsArray()
  messages?: Array<{
    content: string;
    type: string;
    agentId: string;
    timestamp: string;
  }>;

  @IsOptional()
  @IsObject()
  executionContext?: {
    githubUsername?: string;
    analysisDepth?: string;
    contentPlatforms?: string[];
    userId?: string;
    sessionId?: string;
  };

  @IsOptional()
  @IsObject()
  performanceMetrics?: {
    stepDuration: number;
    memoryAccess: number;
    toolExecutions: number;
    tokensUsed: number;
  };

  @IsOptional()
  @IsObject()
  agentThinking?: {
    reasoning: string;
    nextAction: string;
    confidence: number;
  };

  @IsOptional()
  @IsObject()
  contentPreview?: {
    platform: string;
    title?: string;
    excerpt: string;
    wordCount: number;
    status: 'generating' | 'reviewing' | 'ready';
  };
}

/**
 * Agent Constellation Event
 * 3D agent visualization events
 */
export class AgentConstellationEventDto {
  @IsString()
  eventType:
    | 'agent_switch'
    | 'agent_thinking'
    | 'agent_collaboration'
    | 'network_update';

  @IsOptional()
  @IsString()
  fromAgent?: string;

  @IsOptional()
  @IsString()
  toAgent?: string;

  @IsArray()
  capabilities: string[];

  @IsOptional()
  @IsObject()
  visualData?: {
    position: { x: number; y: number; z: number };
    connections: string[];
    activity: 'idle' | 'active' | 'processing' | 'collaborating';
    intensity: number; // 0-1 for visual effects
  };

  @IsOptional()
  @IsObject()
  collaborationData?: {
    collaborators: string[];
    collaborationType: 'sequential' | 'parallel' | 'review';
    sharedContext: Record<string, any>;
  };
}

/**
 * Memory Constellation Event
 * Memory visualization and relationship events
 */
export class MemoryConstellationEventDto {
  @IsString()
  userId: string;

  @IsString()
  eventType:
    | 'memory_access'
    | 'memory_connection'
    | 'memory_cluster'
    | 'analytics_update';

  @IsOptional()
  @IsObject()
  memoryAccess?: {
    memoryId: string;
    type: string;
    relevanceScore: number;
    accessReason: string;
    relatedMemories: string[];
  };

  @IsOptional()
  @IsArray()
  memoryConnections?: Array<{
    fromMemoryId: string;
    toMemoryId: string;
    connectionType: 'similar_content' | 'temporal' | 'contextual' | 'causal';
    strength: number; // 0-1
  }>;

  @IsOptional()
  @IsObject()
  clusterData?: {
    clusterId: string;
    memoryIds: string[];
    clusterType: string;
    centralTheme: string;
    importance: number;
  };

  @IsOptional()
  @IsObject()
  visualData?: {
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number; z: number };
      size: number;
      color: string;
      activity: number;
    }>;
    edges: Array<{
      source: string;
      target: string;
      weight: number;
      type: string;
    }>;
  };
}

/**
 * Workflow Canvas Event
 * D3 workflow visualization events
 */
export class WorkflowCanvasEventDto {
  @IsString()
  workflowId: string;

  @IsString()
  eventType:
    | 'node_activation'
    | 'edge_traversal'
    | 'workflow_branch'
    | 'decision_point'
    | 'completion';

  @IsOptional()
  @IsString()
  nodeId?: string;

  @IsOptional()
  @IsString()
  nodeType?: 'agent' | 'tool' | 'decision' | 'memory' | 'human_input';

  @IsOptional()
  @IsString()
  status: 'pending' | 'active' | 'completed' | 'error' | 'skipped';

  @IsOptional()
  @IsObject()
  nodeData?: {
    agentId?: string;
    toolName?: string;
    decisionCriteria?: string;
    inputRequired?: boolean;
    executionTime?: number;
    outputPreview?: string;
  };

  @IsOptional()
  @IsArray()
  pathHistory?: Array<{
    nodeId: string;
    timestamp: string;
    duration: number;
    outcome: string;
  }>;

  @IsOptional()
  @IsArray()
  availableNextNodes?: Array<{
    nodeId: string;
    probability: number;
    condition: string;
  }>;
}

/**
 * Content Forge Event
 * Real-time content creation events
 */
export class ContentForgeEventDto {
  @IsString()
  sessionId: string;

  @IsString()
  eventType:
    | 'content_start'
    | 'content_progress'
    | 'content_review'
    | 'content_ready'
    | 'content_approved';

  @IsString()
  platform: string;

  @IsString()
  contentType: string;

  @IsOptional()
  @IsObject()
  progress?: {
    stage:
      | 'research'
      | 'outline'
      | 'writing'
      | 'editing'
      | 'optimizing'
      | 'review';
    completion: number; // 0-100
    currentSection?: string;
    wordCount: number;
    targetWordCount: number;
  };

  @IsOptional()
  @IsObject()
  contentPreview?: {
    title: string;
    excerpt: string;
    keyPoints: string[];
    tone: string;
    readabilityScore: number;
  };

  @IsOptional()
  @IsObject()
  qualityMetrics?: {
    relevance: number;
    engagement: number;
    clarity: number;
    brandAlignment: number;
    seoScore?: number;
  };

  @IsOptional()
  @IsArray()
  suggestedImprovements?: Array<{
    type: 'tone' | 'structure' | 'content' | 'seo' | 'engagement';
    suggestion: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}

/**
 * Enhanced Chat Event
 * Live conversation streaming events
 */
export class EnhancedChatEventDto {
  @IsString()
  sessionId: string;

  @IsString()
  eventType:
    | 'message'
    | 'typing'
    | 'agent_switch'
    | 'thinking'
    | 'tool_use'
    | 'memory_access';

  @IsString()
  agentId: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  messageType?: 'text' | 'code' | 'image' | 'file' | 'structured_data';

  @IsOptional()
  @IsObject()
  agentThinking?: {
    reasoning: string;
    confidence: number;
    nextAction: string;
    consideringAlternatives: string[];
  };

  @IsOptional()
  @IsObject()
  toolExecution?: {
    toolName: string;
    purpose: string;
    status: 'starting' | 'running' | 'completed' | 'error';
    result?: any;
  };

  @IsOptional()
  @IsObject()
  memoryContext?: {
    memoriesAccessed: number;
    relevantInsights: string[];
    contextUsed: string;
  };

  @IsOptional()
  @IsObject()
  conversationContext?: {
    totalMessages: number;
    agentSwitches: number;
    topicsDiscussed: string[];
    userSentiment: 'positive' | 'neutral' | 'negative';
    engagementLevel: number;
  };
}
