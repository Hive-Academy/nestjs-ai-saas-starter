import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsNumber, 
  IsBoolean, 
  IsObject, 
  Min, 
  Max, 
  MinLength, 
  MaxLength,
  IsEmail,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Customer Support DTOs for request/response validation
 * Following best practices for API data validation
 */

export class CreateTicketDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  customerId: string;

  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @IsOptional()
  @IsEnum(['technical', 'billing', 'product', 'general'])
  category?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority?: string;

  @IsOptional()
  @IsEnum(['basic', 'premium', 'enterprise'])
  customerTier?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  urgency?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateTicketStatusDto {
  @IsEnum(['open', 'processing', 'analyzed', 'response_generated', 'pending_approval', 'completed', 'closed'])
  status: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  updatedBy?: string;
}

export class ApprovalDto {
  @IsBoolean()
  approved: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  approvedBy: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class KnowledgeSearchDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  query: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  customerTier?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxResults?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  similarityThreshold?: number;
}

export class ArticleFeedbackDto {
  @IsBoolean()
  helpful: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class CreateKnowledgeArticleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  id: string;

  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(50)
  content: string;

  @IsString()
  @IsEnum(['technical', 'billing', 'product', 'general', 'account'])
  category: string;

  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  author?: string;
}

export class GetTicketsQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(['open', 'processing', 'analyzed', 'response_generated', 'pending_approval', 'completed', 'closed'])
  status?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority?: string;

  @IsOptional()
  @IsEnum(['technical', 'billing', 'product', 'general'])
  category?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsEnum(['basic', 'premium', 'enterprise'])
  customerTier?: string;
}

export class GetMetricsQueryDto {
  @IsOptional()
  @IsEnum(['day', 'week', 'month', 'quarter'])
  timeRange?: 'day' | 'week' | 'month' | 'quarter' = 'month';
}

// Response DTOs
export class TicketResponseDto {
  ticketId: string;
  response: string;
  confidence: number;
  suggestedActions: string[];
  escalationRequired: boolean;
  estimatedResolutionTime: number;
  similarTickets: Array<{
    id: string;
    title: string;
    similarity: number;
  }>;
  nextSteps: string[];
}

export class StreamingTicketResponseDto {
  success: boolean;
  data?: {
    ticketId: string;
    executionId: string;
  };
  error?: string;
  executionId: string;
  streaming: boolean;
  streamUrl?: string;
}

export class MetricsResponseDto {
  totalTickets: number;
  resolvedTickets: number;
  avgResolutionTime: number;
  avgSatisfactionScore: number;
  escalationRate: number;
  automationRate: number;
  costSavings: number;
  responseTime: number;
  firstContactResolution: number;
  customerSatisfactionTrend: number[];
}

export class BusinessImpactResponseDto {
  avgResolutionTime: number;
  ticketsResolved: number;
  escalationRate: number;
  customerSatisfaction: number;
  costSavings: number;
  timeToResolution: number;
  agentProductivity: number;
  customerRetention: number;
}

export class KnowledgeSearchResponseDto {
  success: boolean;
  data: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    similarity: number;
    lastUpdated: string;
    useCount: number;
    effectiveness: number;
  }>;
  total: number;
  query: string;
}

export class KnowledgeAnalyticsResponseDto {
  totalArticles: number;
  totalTickets: number;
  topCategories: Array<{
    category: string;
    count: number;
    effectiveness: number;
  }>;
  mostUsedArticles: Array<{
    id: string;
    title: string;
    useCount: number;
    effectiveness: number;
  }>;
  resolutionPatterns: Array<{
    pattern: string;
    frequency: number;
    avgSatisfaction: number;
  }>;
}

export class PaginatedTicketsResponseDto {
  data: Array<{
    id: string;
    customerId: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    customerTier: string;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Validation groups
export const ValidationGroups = {
  CREATE: 'create',
  UPDATE: 'update',
  SEARCH: 'search',
  ADMIN: 'admin'
} as const;

// Custom validators
export function IsValidTicketId() {
  return IsString();
}

export function IsValidCustomerId() {
  return IsString();
}

export function IsValidExecutionId() {
  return IsString();
}