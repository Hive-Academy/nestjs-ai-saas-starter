/**
 * Customer Support System Types
 * Following REFACTORING_GUIDE.md specifications
 */

// Core Business Entities
export interface Ticket {
  id: string;
  customerId: string;
  title: string;
  description: string;
  category: 'technical' | 'billing' | 'product' | 'general';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'processing' | 'analyzed' | 'response_generated' | 'pending_approval' | 'completed' | 'closed';
  customerTier: 'basic' | 'premium' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface CustomerContext {
  customerId: string;
  name: string;
  email: string;
  tier: 'basic' | 'premium' | 'enterprise';
  previousTickets: Ticket[];
  totalTickets: number;
  avgResolutionTime: number;
  satisfactionScore: number;
  lastContact: Date;
  accountValue: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface SimilarTicket {
  id: string;
  title: string;
  description: string;
  resolution: string;
  similarity: number;
  resolutionTime: number;
  satisfactionScore: number;
  category: string;
  embedding?: number[];
}

export interface TicketAnalysis {
  sentiment: number; // -1 to 1 scale
  urgency: number; // 0 to 1 scale
  complexity: 'simple' | 'moderate' | 'complex' | 'highly_complex';
  category: string;
  suggestedCategory: string;
  confidence: number;
  keyTopics: string[];
  detectedIssues: string[];
  estimatedResolutionTime: number;
  requiresHuman: boolean;
  riskFactors: string[];
  businessImpact: 'low' | 'medium' | 'high' | 'critical';
}

// Workflow State
export interface CustomerSupportState {
  ticketId: string;
  ticket: Ticket;
  analysis?: TicketAnalysis;
  similarTickets?: SimilarTicket[];
  customerContext?: CustomerContext;
  suggestedActions?: string[];
  response?: string;
  escalationRequired?: boolean;
  requiresApproval?: boolean;
  status: 'processing' | 'analyzed' | 'response_generated' | 'pending_approval' | 'completed';
  startTime: number;
  completedAt?: number;
  approvedBy?: string;
  metadata?: Record<string, any>;
}

// Request/Response DTOs
export interface TicketRequest {
  customerId: string;
  title: string;
  description: string;
  category?: string;
  priority?: string;
  customerTier?: string;
  urgency?: number;
  metadata?: Record<string, any>;
}

export interface TicketResponse {
  ticketId: string;
  response: string;
  confidence: number;
  suggestedActions: string[];
  escalationRequired: boolean;
  estimatedResolutionTime: number;
  similarTickets: SimilarTicket[];
  nextSteps: string[];
}

export interface ApprovalRequest {
  ticketId: string;
  response: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  businessImpact: string;
  customerTier: string;
  approvalReason: string;
  suggestedApprover?: string;
}

// Metrics and Analytics
export interface CustomerSupportMetrics {
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

export interface BusinessImpact {
  avgResolutionTime: number;
  ticketsResolved: number;
  escalationRate: number;
  customerSatisfaction: number;
  costSavings: number;
  timeToResolution: number;
  agentProductivity: number;
  customerRetention: number;
}

// Configuration Types
export interface CustomerSupportConfig {
  maxSimilarTickets: number;
  sentimentThreshold: number;
  escalationThreshold: number;
  approvalRequired: {
    enterpriseCustomers: boolean;
    highValueTickets: boolean;
    sentimentThreshold: number;
  };
  llmConfig: {
    model: string;
    temperature: number;
    maxTokens: number;
    streaming: boolean;
  };
  vectorSearch: {
    collection: string;
    similarityThreshold: number;
    maxResults: number;
  };
}

// Tool and Action Types
export interface KnowledgeSearchQuery {
  query: string;
  category?: string;
  customerTier?: string;
  maxResults?: number;
  similarityThreshold?: number;
}

export interface KnowledgeSearchResult {
  id: string;
  title: string;
  content: string;
  category: string;
  similarity: number;
  lastUpdated: Date;
  useCount: number;
  effectiveness: number;
}

export interface SuggestedAction {
  id: string;
  action: string;
  description: string;
  confidence: number;
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high';
  requiredSkills: string[];
  automatable: boolean;
}

// Streaming and Real-time Types
export interface StreamingUpdate {
  ticketId: string;
  type: 'token' | 'progress' | 'event' | 'completion';
  data: any;
  timestamp: number;
  nodeId?: string;
  progress?: number;
}

export interface WorkflowExecutionState {
  executionId: string;
  ticketId: string;
  currentNode: string;
  progress: number;
  status: 'running' | 'paused' | 'completed' | 'failed';
  startTime: number;
  estimatedCompletion?: number;
  error?: string;
}

// Error Types
export interface CustomerSupportError {
  code: string;
  message: string;
  ticketId?: string;
  customerId?: string;
  details?: Record<string, any>;
  recoverable: boolean;
  suggestedAction?: string;
}

// Export union types for better type safety
export type TicketStatus = Ticket['status'];
export type TicketPriority = Ticket['priority'];
export type TicketCategory = Ticket['category'];
export type CustomerTier = CustomerContext['tier'];
export type ComplexityLevel = TicketAnalysis['complexity'];
export type BusinessImpactLevel = TicketAnalysis['businessImpact'];