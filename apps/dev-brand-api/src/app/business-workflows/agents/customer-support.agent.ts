import { Injectable } from '@nestjs/common';
import { Agent } from '@hive-academy/langgraph-multi-agent';
import { StreamToken } from '@hive-academy/langgraph-streaming';
import { ChromaDBService } from '@hive-academy/nestjs-chromadb';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';
import type {
  CustomerSupportState,
  TicketAnalysis,
  SimilarTicket,
  CustomerContext,
} from '../types';

/**
 * Customer Support AI Specialist Agent
 * Implements sophisticated ticket analysis using vector search and graph relationships
 * Following REFACTORING_GUIDE.md specifications
 */
@Agent({
  id: 'customer-support-specialist',
  name: 'Customer Support AI Specialist',
  capabilities: [
    'ticket-analysis',
    'solution-recommendation',
    'escalation-detection',
  ],
  tools: ['knowledge-base-search', 'ticket-classifier', 'sentiment-analyzer'],
  priority: 'high',
  executionTime: 'fast',
})
@Injectable()
export class CustomerSupportAgent {
  constructor(
    private readonly chromaService: ChromaDBService,
    private readonly neo4jService: Neo4jService
  ) {}

  /**
   * Main node function that orchestrates the complete ticket analysis
   */
  @StreamToken({ enabled: true, format: 'structured' })
  async nodeFunction(
    state: CustomerSupportState
  ): Promise<Partial<CustomerSupportState>> {
    try {
      // Step 1: Semantic search for similar tickets using ChromaDB
      const similarTickets = await this.findSimilarTickets(
        state.ticket.description,
        state.ticket.category
      );

      // Step 2: Get customer context and history from Neo4j
      const customerContext = await this.getCustomerContext(
        state.ticket.customerId
      );

      // Step 3: Perform comprehensive ticket analysis
      const analysis = await this.analyzeTicket(
        state.ticket,
        similarTickets,
        customerContext
      );

      // Step 4: Generate suggested actions
      const suggestedActions = await this.generateSuggestedActions(
        analysis,
        customerContext
      );

      // Step 5: Determine if escalation is required
      const escalationRequired = this.shouldEscalate(analysis, customerContext);

      return {
        analysis,
        similarTickets,
        customerContext,
        suggestedActions,
        escalationRequired,
        status: 'analyzed',
      };
    } catch (error) {
      console.error('Customer Support Agent error:', error);
      return {
        status: 'processing',
      };
    }
  }

  /**
   * Find similar tickets using vector search in ChromaDB
   */
  private async findSimilarTickets(
    description: string,
    category: string
  ): Promise<SimilarTicket[]> {
    try {
      // Use ChromaDB for semantic search in support tickets collection
      const queryResult = await this.chromaService.similaritySearch(
        'support_tickets',
        description,
        {
          limit: 5,
          filter: category ? { category } : undefined,
          includeMetadata: true,
          includeDocuments: true,
          includeDistances: true,
        }
      );

      const results: SimilarTicket[] = [];
      if (
        queryResult.ids &&
        queryResult.documents &&
        queryResult.metadatas &&
        Array.isArray(queryResult.ids)
      ) {
        for (let i = 0; i < queryResult.ids.length; i++) {
          const id = queryResult.ids[i];
          const metadata = Array.isArray(queryResult.metadatas)
            ? queryResult.metadatas[i]
            : null;
          const document = Array.isArray(queryResult.documents)
            ? queryResult.documents[i]
            : '';
          const distance = Array.isArray(queryResult.distances)
            ? queryResult.distances[i]
            : null;
          // Note: embeddings not available in similaritySearch result

          results.push({
            id: String(id),
            title: (metadata?.title as string) || 'Unknown',
            description: document || '',
            resolution: (metadata?.resolution as string) || '',
            similarity: distance !== null ? 1 - distance : 0,
            resolutionTime: (metadata?.resolutionTime as number) || 0,
            satisfactionScore: (metadata?.satisfactionScore as number) || 0,
            category: (metadata?.category as string) || category,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error finding similar tickets:', error);
      return [];
    }
  }

  /**
   * Get comprehensive customer context from Neo4j
   */
  private async getCustomerContext(
    customerId: string
  ): Promise<CustomerContext | undefined> {
    try {
      const query = `
        MATCH (c:Customer {id: $customerId})
        OPTIONAL MATCH (c)-[:SUBMITTED]->(t:Ticket)
        WITH c, COLLECT(t) as tickets
        RETURN c {
          .id,
          .name,
          .email,
          .tier,
          .accountValue,
          totalTickets: SIZE(tickets),
          avgResolutionTime: AVG([ticket IN tickets | ticket.resolutionTime]),
          satisfactionScore: AVG([ticket IN tickets | ticket.satisfactionScore]),
          lastContact: MAX([ticket IN tickets | ticket.createdAt]),
          previousTickets: [ticket IN tickets | ticket { .* }][0..10]
        } as customerData
      `;

      const result = await this.neo4jService.run(query, { customerId });

      if (!result || !result.records || result.records.length === 0) {
        return undefined;
      }

      const record = result.records[0] as
        | { get: (key: string) => any }
        | undefined;
      const customerData = record?.get('customerData');
      return {
        customerId: customerData.id,
        name: customerData.name || 'Unknown',
        email: customerData.email || '',
        tier: customerData.tier || 'basic',
        previousTickets: customerData.previousTickets || [],
        totalTickets: customerData.totalTickets || 0,
        avgResolutionTime: customerData.avgResolutionTime || 0,
        satisfactionScore: customerData.satisfactionScore || 0,
        lastContact: customerData.lastContact
          ? new Date(customerData.lastContact)
          : new Date(),
        accountValue: customerData.accountValue || 0,
        riskLevel: this.calculateRiskLevel(customerData),
      };
    } catch (error) {
      console.error('Error getting customer context:', error);
      return undefined;
    }
  }

  /**
   * Perform comprehensive ticket analysis using AI/ML techniques
   */
  private async analyzeTicket(
    ticket: any,
    similarTickets: SimilarTicket[],
    customerContext?: CustomerContext
  ): Promise<TicketAnalysis> {
    try {
      // In a real implementation, this would use the LLM provider
      // For now, we'll implement rule-based analysis

      const sentiment = this.analyzeSentiment(ticket.description);
      const urgency = this.calculateUrgency(ticket, customerContext);
      const complexity = this.determineComplexity(ticket, similarTickets);

      return {
        sentiment,
        urgency,
        complexity,
        category: ticket.category,
        suggestedCategory: this.suggestCategory(ticket.description),
        confidence: this.calculateConfidence(similarTickets),
        keyTopics: this.extractKeyTopics(ticket.description),
        detectedIssues: this.detectIssues(ticket.description),
        estimatedResolutionTime: this.estimateResolutionTime(
          complexity,
          similarTickets
        ),
        requiresHuman: this.requiresHumanIntervention(
          sentiment,
          urgency,
          complexity
        ),
        riskFactors: this.identifyRiskFactors(ticket, customerContext),
        businessImpact: this.assessBusinessImpact(ticket, customerContext),
      };
    } catch (error) {
      console.error('Error analyzing ticket:', error);
      // Return default analysis
      return {
        sentiment: 0,
        urgency: 0.5,
        complexity: 'moderate',
        category: ticket.category || 'general',
        suggestedCategory: ticket.category || 'general',
        confidence: 0.5,
        keyTopics: [],
        detectedIssues: [],
        estimatedResolutionTime: 1440, // 24 hours default
        requiresHuman: false,
        riskFactors: [],
        businessImpact: 'low',
      };
    }
  }

  /**
   * Generate suggested actions based on analysis
   */
  private async generateSuggestedActions(
    analysis: TicketAnalysis,
    customerContext?: CustomerContext
  ): Promise<string[]> {
    const actions: string[] = [];

    // Based on sentiment
    if (analysis.sentiment < -0.5) {
      actions.push('Priority escalation due to negative sentiment');
      actions.push('Immediate personal response required');
    }

    // Based on customer tier
    if (customerContext?.tier === 'enterprise') {
      actions.push('Assign to enterprise support specialist');
      actions.push('Provide proactive updates every 2 hours');
    }

    // Based on complexity
    if (analysis.complexity === 'highly_complex') {
      actions.push('Assign to senior technical specialist');
      actions.push('Schedule follow-up call within 4 hours');
    }

    // Based on business impact
    if (analysis.businessImpact === 'critical') {
      actions.push('Notify management immediately');
      actions.push('Activate incident response protocol');
    }

    // Default action if no specific actions
    if (actions.length === 0) {
      actions.push('Provide standard support response');
      actions.push('Monitor for customer reply');
    }

    return actions;
  }

  /**
   * Determine if ticket should be escalated
   */
  private shouldEscalate(
    analysis: TicketAnalysis,
    customerContext?: CustomerContext
  ): boolean {
    // Escalate based on sentiment
    if (analysis.sentiment < -0.5) return true;

    // Escalate based on business impact
    if (analysis.businessImpact === 'critical') return true;

    // Escalate for enterprise customers with high urgency
    if (customerContext?.tier === 'enterprise' && analysis.urgency > 0.8)
      return true;

    // Escalate if highly complex and requires human intervention
    if (analysis.complexity === 'highly_complex' && analysis.requiresHuman)
      return true;

    return false;
  }

  // Helper methods for analysis
  private analyzeSentiment(text: string): number {
    // Simple rule-based sentiment analysis
    // In production, this would use a proper sentiment analysis model
    const negativeWords = [
      'angry',
      'frustrated',
      'terrible',
      'awful',
      'hate',
      'worst',
      'broken',
      'useless',
    ];
    const positiveWords = [
      'great',
      'excellent',
      'love',
      'amazing',
      'perfect',
      'wonderful',
      'fantastic',
    ];

    const words = text.toLowerCase().split(/\s+/);
    let score = 0;

    words.forEach((word) => {
      if (negativeWords.includes(word)) score -= 0.1;
      if (positiveWords.includes(word)) score += 0.1;
    });

    return Math.max(-1, Math.min(1, score));
  }

  private calculateUrgency(
    ticket: any,
    customerContext?: CustomerContext
  ): number {
    let urgency = 0.5; // Base urgency

    // Increase urgency based on priority
    if (ticket.priority === 'critical') urgency += 0.4;
    else if (ticket.priority === 'high') urgency += 0.3;
    else if (ticket.priority === 'medium') urgency += 0.1;

    // Increase urgency for enterprise customers
    if (customerContext?.tier === 'enterprise') urgency += 0.2;

    // Increase urgency for high-value customers
    if ((customerContext?.accountValue ?? 0) > 100000) urgency += 0.1;

    return Math.min(1, urgency);
  }

  private determineComplexity(
    ticket: any,
    similarTickets: SimilarTicket[]
  ): 'simple' | 'moderate' | 'complex' | 'highly_complex' {
    const descriptionLength = ticket.description.length;
    const hasMultipleIssues = ticket.description.split('.').length > 3;
    const hasSimilarResolution = similarTickets.some((t) => t.similarity > 0.9);

    if (hasSimilarResolution && descriptionLength < 200) return 'simple';
    if (hasMultipleIssues || descriptionLength > 1000) return 'highly_complex';
    if (descriptionLength > 500) return 'complex';
    return 'moderate';
  }

  private suggestCategory(description: string): string {
    const text = description.toLowerCase();

    if (
      text.includes('bill') ||
      text.includes('payment') ||
      text.includes('charge')
    )
      return 'billing';
    if (
      text.includes('bug') ||
      text.includes('error') ||
      text.includes('crash')
    )
      return 'technical';
    if (
      text.includes('feature') ||
      text.includes('how to') ||
      text.includes('help')
    )
      return 'product';

    return 'general';
  }

  private calculateConfidence(similarTickets: SimilarTicket[]): number {
    if (similarTickets.length === 0) return 0.3;

    const avgSimilarity =
      similarTickets.reduce((sum, ticket) => sum + ticket.similarity, 0) /
      similarTickets.length;
    return Math.min(0.95, avgSimilarity + 0.2);
  }

  private extractKeyTopics(description: string): string[] {
    // Simple keyword extraction - in production would use NLP
    const commonTopics = [
      'login',
      'password',
      'payment',
      'billing',
      'feature',
      'bug',
      'account',
      'subscription',
    ];
    const words = description.toLowerCase().split(/\s+/);

    return commonTopics.filter((topic) =>
      words.some((word) => word.includes(topic))
    );
  }

  private detectIssues(description: string): string[] {
    const issues: string[] = [];
    const text = description.toLowerCase();

    if (
      text.includes('cannot') ||
      text.includes("can't") ||
      text.includes('unable')
    ) {
      issues.push('Access or functionality issue');
    }
    if (text.includes('slow') || text.includes('loading')) {
      issues.push('Performance issue');
    }
    if (text.includes('error') || text.includes('crash')) {
      issues.push('Technical error');
    }

    return issues;
  }

  private estimateResolutionTime(
    complexity: string,
    similarTickets: SimilarTicket[]
  ): number {
    const avgSimilarTime =
      similarTickets.length > 0
        ? similarTickets.reduce((sum, t) => sum + t.resolutionTime, 0) /
          similarTickets.length
        : 0;

    const baseTime =
      {
        simple: 60,
        moderate: 240,
        complex: 720,
        highly_complex: 1440,
      }[complexity] || 240;

    return avgSimilarTime > 0 ? (avgSimilarTime + baseTime) / 2 : baseTime;
  }

  private requiresHumanIntervention(
    sentiment: number,
    urgency: number,
    complexity: string
  ): boolean {
    return sentiment < -0.3 || urgency > 0.8 || complexity === 'highly_complex';
  }

  private identifyRiskFactors(
    ticket: any,
    customerContext?: CustomerContext
  ): string[] {
    const risks: string[] = [];

    if (customerContext?.tier === 'enterprise') {
      risks.push('High-value customer impact');
    }

    if (
      ticket.description.toLowerCase().includes('cancel') ||
      ticket.description.toLowerCase().includes('refund')
    ) {
      risks.push('Potential churn risk');
    }

    if ((customerContext?.satisfactionScore ?? 0) < 3) {
      risks.push('Low customer satisfaction history');
    }

    return risks;
  }

  private assessBusinessImpact(
    ticket: any,
    customerContext?: CustomerContext
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (
      customerContext?.tier === 'enterprise' &&
      customerContext.accountValue > 500000
    ) {
      return 'critical';
    }

    if (
      customerContext?.tier === 'enterprise' ||
      (customerContext?.accountValue ?? 0) > 100000
    ) {
      return 'high';
    }

    if (ticket.priority === 'high' || ticket.priority === 'critical') {
      return 'medium';
    }

    return 'low';
  }

  private calculateRiskLevel(customerData: any): 'low' | 'medium' | 'high' {
    if (customerData.satisfactionScore < 2 || customerData.totalTickets > 20)
      return 'high';
    if (customerData.satisfactionScore < 4 || customerData.totalTickets > 10)
      return 'medium';
    return 'low';
  }
}
