import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsObject,
  ValidateNested,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DevBrand API DTOs - External Interface Contracts
 *
 * Defines the request/response contracts for the DevBrand API surface layer.
 * These DTOs provide validation, documentation, and type safety for frontend integration.
 */

// Enums for validation
export enum AnalysisDepth {
  QUICK = 'quick',
  COMPREHENSIVE = 'comprehensive',
}

export enum ContentPlatform {
  LINKEDIN = 'linkedin',
  TWITTER = 'twitter',
  BLOG = 'blog',
  NEWSLETTER = 'newsletter',
}

export enum ContentType {
  POST = 'post',
  ARTICLE = 'article',
  THREAD = 'thread',
  NEWSLETTER = 'newsletter',
  ANNOUNCEMENT = 'announcement',
}

export enum StrategyScope {
  TECHNICAL = 'technical',
  LEADERSHIP = 'leadership',
  ENTREPRENEURIAL = 'entrepreneurial',
  FULL_SPECTRUM = 'full_spectrum',
}

// Request DTOs

/**
 * GitHub Analysis Request
 * Triggers comprehensive repository analysis workflow
 */
export class GitHubAnalysisRequestDto {
  @ApiProperty({
    description: 'GitHub username to analyze',
    example: 'octocat',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  githubUsername!: string;

  @ApiPropertyOptional({
    description: 'User ID for personalized context',
    example: 'user_12345',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Session ID for tracking',
    example: 'session_abcd1234',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Depth of analysis to perform',
    enum: AnalysisDepth,
    default: AnalysisDepth.COMPREHENSIVE,
  })
  @IsOptional()
  @IsEnum(AnalysisDepth)
  analysisDepth?: AnalysisDepth;
}

/**
 * DevBrand Chat Request
 * General-purpose conversation with multi-agent system
 */
export class DevBrandChatRequestDto {
  @ApiProperty({
    description: 'Message to send to DevBrand agents',
    example:
      'Help me create a compelling LinkedIn post about my latest project',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional({
    description: 'User ID for personalized responses',
    example: 'user_12345',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Session ID for conversation tracking',
    example: 'session_abcd1234',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'GitHub username for context',
    example: 'octocat',
  })
  @IsOptional()
  @IsString()
  githubUsername?: string;

  @ApiPropertyOptional({
    description: 'Analysis depth for GitHub context',
    enum: AnalysisDepth,
    default: AnalysisDepth.QUICK,
  })
  @IsOptional()
  @IsEnum(AnalysisDepth)
  analysisDepth?: AnalysisDepth;

  @ApiPropertyOptional({
    description: 'Target content platforms',
    enum: ContentPlatform,
    isArray: true,
    example: [ContentPlatform.LINKEDIN, ContentPlatform.TWITTER],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ContentPlatform, { each: true })
  contentPlatforms?: ContentPlatform[];

  @ApiPropertyOptional({
    description: 'Previous conversation context',
    example: 'We were discussing content strategy for developer relations',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  conversationContext?: string;
}

/**
 * Content Generation Request
 * Specialized content creation workflow
 */
export class ContentGenerationRequestDto {
  @ApiProperty({
    description: 'Content creation request',
    example:
      'Create a LinkedIn post about my contributions to open source React components',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  contentRequest!: string;

  @ApiPropertyOptional({
    description: 'Target platforms for content',
    enum: ContentPlatform,
    isArray: true,
    default: [ContentPlatform.LINKEDIN],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ContentPlatform, { each: true })
  platforms?: ContentPlatform[];

  @ApiPropertyOptional({
    description: 'Type of content to create',
    enum: ContentType,
    default: ContentType.POST,
  })
  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @ApiPropertyOptional({
    description: 'User ID for personalized content',
    example: 'user_12345',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Session ID for tracking',
    example: 'session_abcd1234',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

/**
 * Brand Strategy Request
 * Comprehensive brand strategy development
 */
export class BrandStrategyRequestDto {
  @ApiProperty({
    description: 'Strategy development request',
    example:
      'Help me position myself as a thought leader in AI and developer tools',
  })
  @IsString()
  @MinLength(20)
  @MaxLength(1000)
  strategyRequest!: string;

  @ApiProperty({
    description: 'User ID for personalized strategy',
    example: 'user_12345',
  })
  @IsString()
  userId!: string;

  @ApiPropertyOptional({
    description: 'Session ID for tracking',
    example: 'session_abcd1234',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'GitHub username for technical context',
    example: 'octocat',
  })
  @IsOptional()
  @IsString()
  githubUsername?: string;

  @ApiPropertyOptional({
    description: 'Career goals and objectives',
    example: 'Transition from senior developer to engineering leadership role',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  careerGoals?: string;

  @ApiPropertyOptional({
    description: 'Target audience description',
    example: 'Fellow developers, engineering managers, and startup founders',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  targetAudience?: string;

  @ApiPropertyOptional({
    description: 'Scope of strategy development',
    enum: StrategyScope,
    default: StrategyScope.FULL_SPECTRUM,
  })
  @IsOptional()
  @IsEnum(StrategyScope)
  strategyScope?: StrategyScope;
}

// Response DTOs

/**
 * Agent Information
 * Status and capabilities of individual agents
 */
export class AgentInfoDto {
  @ApiProperty({ description: 'Agent unique identifier' })
  id!: string;

  @ApiProperty({ description: 'Agent display name' })
  name!: string;

  @ApiProperty({ description: 'Agent health status' })
  healthy!: boolean;

  @ApiProperty({
    description: 'Agent capabilities',
    isArray: true,
    example: ['repository_analysis', 'skill_extraction'],
  })
  capabilities!: string[];
}

/**
 * Memory Search Result
 * Individual memory item from brand context
 */
export class MemoryResultDto {
  @ApiProperty({ description: 'Memory ID' })
  id!: string;

  @ApiProperty({ description: 'Memory type' })
  type!: string;

  @ApiProperty({ description: 'Memory content' })
  content!: string;

  @ApiProperty({ description: 'Relevance score (0-1)' })
  score!: number;

  @ApiProperty({ description: 'Memory metadata' })
  metadata!: Record<string, any>;
}

/**
 * Brand Analytics Summary
 * High-level brand performance metrics
 */
export class BrandAnalyticsDto {
  @ApiProperty({ description: 'Total brand memories stored' })
  totalMemories!: number;

  @ApiProperty({ description: 'Content performance metrics' })
  contentMetrics!: Record<string, number>;

  @ApiProperty({ description: 'Skill development progress' })
  skillProgress!: Record<string, number>;

  @ApiProperty({ description: 'Brand evolution insights' })
  brandEvolution!: Record<string, any>;
}

/**
 * DevBrand Response
 * Standard response for workflow executions
 */
export class DevBrandResponseDto {
  @ApiProperty({ description: 'Execution success status' })
  success!: boolean;

  @ApiProperty({ description: 'Workflow execution ID' })
  workflowId!: string;

  @ApiProperty({ description: 'Workflow result data' })
  result!: any;

  @ApiProperty({ description: 'Execution time in milliseconds' })
  executionTime!: number;

  @ApiProperty({
    description: 'Agent execution path',
    isArray: true,
    example: ['brand-strategist', 'github-analyzer', 'content-creator'],
  })
  executionPath!: string[];

  @ApiProperty({ description: 'Individual agent outputs' })
  agentOutputs!: Record<string, any>;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp!: string;

  @ApiPropertyOptional({ description: 'Error information if success is false' })
  @IsOptional()
  error?: string;

  @ApiPropertyOptional({ description: 'Detailed error information' })
  @IsOptional()
  details?: string;
}

/**
 * Agent Status Response
 * System-wide agent health and coordination status
 */
export class AgentStatusResponseDto {
  @ApiProperty({ description: 'Multi-agent network ID' })
  networkId!: string | null;

  @ApiProperty({
    description: 'Agent status information',
    type: [AgentInfoDto],
  })
  agents!: AgentInfoDto[];

  @ApiProperty({ description: 'Network performance statistics' })
  networkStats!: any;

  @ApiProperty({ description: 'Overall system health' })
  systemHealth!: any;

  @ApiProperty({ description: 'Status check timestamp' })
  timestamp!: string;
}

/**
 * Memory Context Response
 * Brand memory and analytics for user context
 */
export class MemoryContextResponseDto {
  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({
    description: 'Relevant brand memories',
    type: [MemoryResultDto],
  })
  memoryResults!: MemoryResultDto[];

  @ApiProperty({
    description: 'Brand analytics summary',
    type: BrandAnalyticsDto,
  })
  brandAnalytics!: BrandAnalyticsDto;

  @ApiProperty({ description: 'Context generation timestamp' })
  contextGenerated!: string;

  @ApiProperty({ description: 'Total memories found' })
  totalMemories!: number;

  @ApiProperty({ description: 'Search query used' })
  queryUsed!: string;
}
