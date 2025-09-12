import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  HttpStatus,
  HttpException,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { DevBrandSupervisorWorkflow } from '../workflows/devbrand-supervisor.workflow';
import { PersonalBrandMemoryService } from '../services/personal-brand-memory.service';
import {
  GitHubAnalysisRequestDto,
  DevBrandChatRequestDto,
  BrandStrategyRequestDto,
  ContentGenerationRequestDto,
  DevBrandResponseDto,
  AgentStatusResponseDto,
  MemoryContextResponseDto,
} from '../dto/devbrand-api.dto';

// Import MultiAgentResult for proper typing
import type { MultiAgentResult } from '@hive-academy/langgraph-multi-agent';
import { BrandMemoryType } from '../schemas/brand-memory.schema';

// Type guard to check if result has expected properties
function isValidWorkflowResult(result: unknown): result is MultiAgentResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'finalState' in result &&
    'executionPath' in result &&
    'executionTime' in result &&
    'success' in result
  );
}

// Helper function to extract workflow metadata safely
function extractWorkflowMetadata(result: MultiAgentResult): {
  workflowId: string;
  agentOutputs: Record<string, unknown>;
} {
  const workflowId =
    (result.finalState.metadata?.workflowId as string) || 'unknown';
  const agentOutputs =
    (result.finalState.metadata?.agentOutputs as Record<string, unknown>) || {};
  return { workflowId, agentOutputs };
}

// Type guard for unknown errors
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

function handleUnknownError(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  return String(error);
}

/**
 * DevBrand API Controller - External Surface Layer
 *
 * Exposes the sophisticated multi-agent system to frontend consumers through REST endpoints.
 * Provides access to GitHub analysis, content creation, brand strategy, and real-time agent coordination.
 *
 * Integration Features:
 * - Multi-agent workflow orchestration via DevBrandSupervisorWorkflow
 * - Personal brand memory retrieval and context management
 * - Real-time agent status and health monitoring
 * - Comprehensive error handling and validation
 */
@ApiTags('DevBrand API')
@Controller('api/v1/devbrand')
@UsePipes(new ValidationPipe({ transform: true }))
export class DevBrandController {
  private readonly logger = new Logger(DevBrandController.name);

  constructor(
    private readonly devBrandWorkflow: DevBrandSupervisorWorkflow,
    private readonly brandMemoryService: PersonalBrandMemoryService
  ) {}

  /**
   * Trigger comprehensive GitHub analysis workflow
   * Routes through GitHubAnalyzer -> ContentCreator -> BrandStrategist agents
   */
  @Post('github/analyze')
  @ApiOperation({
    summary: 'Analyze GitHub profile for brand development',
    description:
      'Executes multi-agent workflow to analyze GitHub repositories, extract technical achievements, and provide brand insights',
  })
  @ApiBody({ type: GitHubAnalysisRequestDto })
  @ApiResponse({
    status: 200,
    description: 'GitHub analysis completed successfully',
    type: DevBrandResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 500, description: 'Workflow execution failed' })
  async analyzeGitHub(
    @Body() request: GitHubAnalysisRequestDto
  ): Promise<DevBrandResponseDto> {
    this.logger.log(`GitHub analysis requested for: ${request.githubUsername}`);

    try {
      const result = (await this.devBrandWorkflow.analyzeGitHub(
        request.githubUsername,
        {
          analysisDepth: request.analysisDepth || 'comprehensive',
          config: {
            configurable: {
              user_id: request.userId,
              session_id: request.sessionId,
              analysis_depth: request.analysisDepth,
            },
          },
        }
      )) as MultiAgentResult;

      // Store results in brand memory for future context
      if (request.userId) {
        await this.storeBrandContext(request.userId, result, 'github_analysis');
      }

      if (!isValidWorkflowResult(result)) {
        throw new Error('Invalid workflow result structure');
      }

      const { workflowId, agentOutputs } = extractWorkflowMetadata(result);

      return {
        success: result.success,
        workflowId,
        result: result.finalState,
        executionTime: result.executionTime,
        executionPath: result.executionPath,
        agentOutputs,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('GitHub analysis failed:', error);
      throw new HttpException(
        {
          success: false,
          error: 'GitHub analysis workflow failed',
          details: handleUnknownError(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Initiate conversation with multi-agent system
   * Provides general-purpose interface for DevBrand agent coordination
   */
  @Post('chat')
  @ApiOperation({
    summary: 'Chat with DevBrand agents',
    description:
      'Initiates conversation with multi-agent system for personalized brand development assistance',
  })
  @ApiBody({ type: DevBrandChatRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Chat session completed successfully',
    type: DevBrandResponseDto,
  })
  async chat(
    @Body() request: DevBrandChatRequestDto
  ): Promise<DevBrandResponseDto> {
    this.logger.log(
      `DevBrand chat initiated: ${request.message.substring(0, 100)}...`
    );

    try {
      const result = await this.devBrandWorkflow.executeDevBrandWorkflow(
        request.message,
        {
          githubUsername: request.githubUsername,
          analysisDepth: request.analysisDepth || 'quick',
          contentPlatforms: request.contentPlatforms,
          streamingEnabled: false, // REST endpoint uses non-streaming execution
          config: {
            configurable: {
              user_id: request.userId,
              session_id: request.sessionId,
              conversation_context: request.conversationContext,
            },
          },
        }
      );

      // Store conversation context in brand memory
      if (request.userId) {
        await this.storeBrandContext(request.userId, result, 'conversation');
      }

      if (!isValidWorkflowResult(result)) {
        throw new Error('Invalid workflow result structure');
      }

      const { workflowId, agentOutputs } = extractWorkflowMetadata(result);

      return {
        success: result.success,
        workflowId,
        result: result.finalState,
        executionTime: result.executionTime,
        executionPath: result.executionPath,
        agentOutputs,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('DevBrand chat failed:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Chat workflow execution failed',
          details: handleUnknownError(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Generate brand content across multiple platforms
   * Utilizes ContentCreator agent with brand strategy context
   */
  @Post('content/generate')
  @ApiOperation({
    summary: 'Generate brand content',
    description:
      'Creates compelling content across multiple platforms using multi-agent content creation workflow',
  })
  @ApiBody({ type: ContentGenerationRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Content generation completed successfully',
    type: DevBrandResponseDto,
  })
  async generateContent(
    @Body() request: ContentGenerationRequestDto
  ): Promise<DevBrandResponseDto> {
    this.logger.log(
      `Content generation for platforms: ${request.platforms?.join(', ')}`
    );

    try {
      const result = await this.devBrandWorkflow.generateBrandContent(
        request.contentRequest,
        request.platforms,
        {
          config: {
            configurable: {
              user_id: request.userId,
              session_id: request.sessionId,
              content_type: request.contentType,
            },
          },
        }
      );

      // Store generated content in brand memory
      if (request.userId) {
        await this.storeBrandContext(
          request.userId,
          result,
          'content_generation'
        );
      }

      if (!isValidWorkflowResult(result)) {
        throw new Error('Invalid workflow result structure');
      }

      const { workflowId, agentOutputs } = extractWorkflowMetadata(result);

      return {
        success: result.success,
        workflowId,
        result: result.finalState,
        executionTime: result.executionTime,
        executionPath: result.executionPath,
        agentOutputs,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Content generation failed:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Content generation workflow failed',
          details: handleUnknownError(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Develop comprehensive brand strategy
   * Coordinates all three agents for holistic brand development
   */
  @Post('strategy/develop')
  @ApiOperation({
    summary: 'Develop brand strategy',
    description:
      'Creates comprehensive personal brand strategy using coordinated multi-agent analysis',
  })
  @ApiBody({ type: BrandStrategyRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Brand strategy development completed',
    type: DevBrandResponseDto,
  })
  async developStrategy(
    @Body() request: BrandStrategyRequestDto
  ): Promise<DevBrandResponseDto> {
    this.logger.log(
      `Brand strategy development initiated for user: ${request.userId}`
    );

    try {
      const result = await this.devBrandWorkflow.developBrandStrategy(
        request.strategyRequest,
        {
          githubUsername: request.githubUsername,
          careerGoals: request.careerGoals,
          targetAudience: request.targetAudience,
          config: {
            configurable: {
              user_id: request.userId,
              session_id: request.sessionId,
              strategy_scope: request.strategyScope,
            },
          },
        }
      );

      // Store strategy insights in brand memory
      if (request.userId) {
        await this.storeBrandContext(request.userId, result, 'brand_strategy');
      }

      if (!isValidWorkflowResult(result)) {
        throw new Error('Invalid workflow result structure');
      }

      const { workflowId, agentOutputs } = extractWorkflowMetadata(result);

      return {
        success: result.success,
        workflowId,
        result: result.finalState,
        executionTime: result.executionTime,
        executionPath: result.executionPath,
        agentOutputs,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Brand strategy development failed:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Brand strategy workflow failed',
          details: handleUnknownError(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get current agent states and coordination status
   * Provides real-time visibility into multi-agent system health
   */
  @Get('agents/status')
  @ApiOperation({
    summary: 'Get agent status',
    description:
      'Returns current state and health information for all DevBrand agents',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent status retrieved successfully',
    type: AgentStatusResponseDto,
  })
  async getAgentStatus(): Promise<AgentStatusResponseDto> {
    try {
      const workflowStatus = await this.devBrandWorkflow.getWorkflowStatus();

      return {
        networkId: workflowStatus.networkId,
        agents: workflowStatus.agents,
        networkStats: workflowStatus.networkStats,
        systemHealth: workflowStatus.systemStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get agent status:', error);
      throw new HttpException(
        {
          error: 'Failed to retrieve agent status',
          details: handleUnknownError(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Retrieve brand memory context for user
   * Provides personalized context from ChromaDB + Neo4j hybrid intelligence
   */
  @Get('memory/context/:userId')
  @ApiOperation({
    summary: 'Get user brand memory context',
    description:
      'Retrieves relevant brand memories and context using hybrid vector + graph search',
  })
  @ApiResponse({
    status: 200,
    description: 'Memory context retrieved successfully',
    type: MemoryContextResponseDto,
  })
  async getMemoryContext(
    @Param('userId') userId: string,
    @Query('query') query?: string,
    @Query('limit') limit = 10,
    @Query('memoryTypes') memoryTypes?: string
  ): Promise<MemoryContextResponseDto> {
    this.logger.log(`Memory context requested for user: ${userId}`);

    try {
      const searchQuery = query || 'personal brand development context';
      const types = memoryTypes
        ? memoryTypes
            .split(',')
            .filter((type): type is BrandMemoryType =>
              [
                'dev_achievement',
                'content_performance',
                'brand_strategy',
                'skill_profile',
                'career_milestone',
                'market_insight',
                'user_feedback',
                'workflow_learning',
              ].includes(type)
            )
        : undefined;

      const memoryResults = await this.brandMemoryService.searchBrandMemories({
        userId,
        query: searchQuery,
        limit: Math.min(limit, 50), // Cap at 50 for performance
        memoryTypes: types,
      });

      const brandAnalytics = await this.brandMemoryService.getBrandAnalytics(
        userId
      );

      return {
        userId,
        memoryResults: memoryResults.map((memory) => ({
          id: memory.id,
          type: memory.metadata.type,
          content: memory.content,
          score: memory.relevanceScore || 0.8,
          metadata: memory.metadata,
        })),
        brandAnalytics: {
          totalMemories: brandAnalytics.totalMemories,
          contentMetrics: {
            totalGenerated:
              brandAnalytics.contentPerformance?.totalGenerated || 0,
            approvalRate: brandAnalytics.contentPerformance?.approvalRate || 0,
            averageEngagement:
              brandAnalytics.contentPerformance?.averageEngagement || 0,
          },
          skillProgress: Object.fromEntries(
            Object.entries(
              brandAnalytics.skillProgression?.currentLevel || {}
            ).map(([key, value]) => [
              key,
              typeof value === 'string'
                ? ['beginner', 'intermediate', 'advanced', 'expert'].indexOf(
                    value
                  ) + 1
                : 1,
            ])
          ),
          brandEvolution: brandAnalytics.brandEvolution || {},
        },
        contextGenerated: new Date().toISOString(),
        totalMemories: memoryResults.length,
        queryUsed: searchQuery,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve memory context:', error);
      throw new HttpException(
        {
          error: 'Failed to retrieve brand memory context',
          details: handleUnknownError(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Health check endpoint for DevBrand API
   */
  @Get('health')
  @ApiOperation({
    summary: 'DevBrand API health check',
    description:
      'Returns health status of DevBrand API and integrated services',
  })
  async getHealth(): Promise<{
    status: string;
    timestamp: string;
    services: Record<string, boolean>;
  }> {
    try {
      const workflowStatus = await this.devBrandWorkflow.getWorkflowStatus();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          workflow: !!workflowStatus.networkId,
          agents: workflowStatus.agents.every((agent) => agent.healthy),
          memory: true, // brandMemoryService is injected successfully
        },
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          workflow: false,
          agents: false,
          memory: false,
        },
      };
    }
  }

  /**
   * Store brand context results in memory for future use
   */
  private async storeBrandContext(
    userId: string,
    result: any,
    contextType:
      | 'github_analysis'
      | 'conversation'
      | 'content_generation'
      | 'brand_strategy'
  ): Promise<void> {
    // Map context types to BrandMemoryType
    const memoryTypeMapping: Record<typeof contextType, BrandMemoryType> = {
      github_analysis: 'dev_achievement',
      conversation: 'workflow_learning',
      content_generation: 'content_performance',
      brand_strategy: 'brand_strategy',
    };

    try {
      await this.brandMemoryService.storeBrandMemory(
        userId,
        'workflow_result',
        `${contextType} execution completed`,
        memoryTypeMapping[contextType],
        result,
        {
          execution_time: result.executionTime,
          execution_path: result.executionPath,
          agent_outputs: JSON.stringify(
            extractWorkflowMetadata(result as MultiAgentResult).agentOutputs
          ),
          timestamp: new Date().toISOString(),
          importance: 0.8,
        }
      );
    } catch (error) {
      this.logger.warn(`Failed to store brand context for ${userId}:`, error);
      // Don't throw - memory storage failure shouldn't break the main workflow
    }
  }
}
