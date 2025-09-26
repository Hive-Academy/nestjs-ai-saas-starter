/**
 * @fileoverview Production Query Patterns Examples
 * 
 * Demonstrates enterprise-grade query patterns including complex business logic,
 * analytics and reporting queries, batch processing patterns, and performance
 * monitoring integration using the Neo4j Query Builder.
 */

import { Injectable } from '@nestjs/common';
import { Neo4jQueryBuilder, createQueryBuilder } from '../../query-builder/neo4j-query-builder';
import { Neo4jEntity } from '../../decorators/entity.decorator';
import type { Neo4jCompatibleEntity } from '../../types/neo4j-types';
import { CypherQuery } from '../../decorators/cypher-query.decorator';
import { User } from '../shared/entities/basic/user.entity';
import { Post } from '../shared/entities/intermediate/post.entity';

/**
 * Production Query Patterns using Shared Entity Classes
 * 
 * Uses established decorated entity classes for production-grade queries:
 * - User: Includes proper business logic, Date types, JsonProperty for complex data
 * - Post: Includes engagement metrics, social features, proper content handling
 * 
 * Additional production metrics interfaces (could be converted to entity classes)
  acquisitionCost: number;
  churnRisk: 'low' | 'medium' | 'high';
  engagementScore: number;
  
  // Operational data
  joinedAt: string;
  lastActiveAt?: string;
  lastBillingAt?: string;
  nextBillingAt?: string;
  trialEndsAt?: string;
  
  // Security and compliance
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
  gdprConsentAt?: string;
  
  // Geographic and demographic
  countryCode: string;
  timezone: string;
  referralSource: string;
  utmCampaign?: string;
}

@Neo4jEntity('Organization')
export class Organization {
  id?: string;
  name: string;
  slug: string;
  industry: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  plan: 'team' | 'business' | 'enterprise';
  
  // Business metrics
  mrr: number; // Monthly Recurring Revenue
  seats: number;
  utilization: number; // Percentage of seats used
  
  // Financial data
  subscriptionStartedAt: string;
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: string;
  totalSpent: number;
  
  // Health metrics
  healthScore: number;
  churnRisk: 'low' | 'medium' | 'high';
  supportTickets: number;
  lastActivityAt: string;
  
  // Compliance
  dataRetentionPeriod: number;
  complianceLevel: 'standard' | 'sox' | 'hipaa' | 'gdpr';
  contractEndDate?: string;
}

@Neo4jEntity('Product')
class Product {
  id?: string;
  name: string;
  category: string;
  type: 'feature' | 'addon' | 'integration';
  status: 'active' | 'deprecated' | 'beta';
  
  // Pricing
  basePrice: number;
  currency: string;
  pricingModel: 'flat' | 'per_seat' | 'usage_based' | 'tiered';
  
  // Business metrics
  adoptionRate: number;
  churnRate: number;
  avgRevenuePerUser: number;
  
  // Feature flags
  isPublic: boolean;
  requiresApproval: boolean;
  betaAccess: boolean;
  
  createdAt?: Date;
  lastUpdatedAt: string;
}

interface Event extends Neo4jCompatibleEntity {
  id?: string;
  type: string;
  category: 'user_action' | 'system' | 'business' | 'security';
  userId?: string;
  organizationId?: string;
  productId?: string;
  
  // Event data
  properties: Record<string, any>;
  revenue?: number;
  
  // Context
  sessionId: string;
  source: string;
  userAgent?: string;
  ipAddress?: string;
  countryCode?: string;
  
  timestamp: string;
  createdAt?: Date;
}

/**
 * Production Query Patterns Service
 * 
 * Implements enterprise-grade query patterns including:
 * - Revenue and subscription analytics
 * - Customer health scoring
 * - Churn prediction and prevention
 * - Usage analytics and optimization
 * - Compliance and security reporting
 * - Performance monitoring
 */
@Injectable()
export class ProductionQueryService {
  constructor(private readonly queryBuilder: Neo4jQueryBuilder) {}

  // ============================================================================
  // 1. REVENUE AND SUBSCRIPTION ANALYTICS
  // ============================================================================

  /**
   * Monthly Recurring Revenue (MRR) analysis with growth metrics
   * Critical business metric for SaaS operations
   */
  @CypherQuery({ 
    cache: '1h',
    description: 'Calculate MRR trends and growth metrics',
    tags: ['revenue', 'mrr', 'analytics', 'business-critical']
  })
  async calculateMRRAnalytics(months = 12) {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    const cutoffIso = cutoffDate.toISOString();

    return this.queryBuilder
      .match('org', () => Organization)
      .where('org.subscriptionStartedAt', '>=', cutoffIso)
      .optionalMatch('(org)<-[:BELONGS_TO]-(user:User {isActive: true})')
      .with(`
        org,
        substring(org.subscriptionStartedAt, 0, 7) as month,
        COLLECT(user) as activeUsers,
        CASE org.billingCycle
          WHEN 'yearly' THEN org.mrr * 12
          ELSE org.mrr
        END as normalizedMRR
      `)
      .return(`
        month,
        COUNT(org) as newOrganizations,
        SUM(normalizedMRR) as monthlyMRR,
        AVG(normalizedMRR) as avgMRRPerOrg,
        
        // Growth metrics
        SUM(CASE WHEN org.plan = 'enterprise' THEN normalizedMRR ELSE 0 END) as enterpriseMRR,
        SUM(CASE WHEN org.plan = 'business' THEN normalizedMRR ELSE 0 END) as businessMRR,
        SUM(CASE WHEN org.plan = 'team' THEN normalizedMRR ELSE 0 END) as teamMRR,
        
        // Usage metrics
        SUM(org.seats) as totalSeats,
        AVG(org.utilization) as avgSeatUtilization,
        
        // Customer composition
        COUNT(CASE WHEN org.size = 'enterprise' THEN 1 END) as enterpriseCustomers,
        COUNT(CASE WHEN org.size = 'large' THEN 1 END) as largeCustomers,
        COUNT(CASE WHEN org.size IN ['small', 'medium'] THEN 1 END) as smbCustomers
      `)
      .orderBy('month', 'DESC')
      .build();
  }

  /**
   * Customer Lifetime Value (CLV) calculation
   * Essential for understanding customer economics
   */
  @CypherQuery({ 
    cache: '2h',
    description: 'Calculate customer lifetime value metrics',
    tags: ['clv', 'customer-economics', 'revenue']
  })
  async calculateCustomerLifetimeValue() {
    return this.queryBuilder
      .match('user', () => User)
      .where('user.isActive', '=', true)
      .optionalMatch('(user)-[:BELONGS_TO]->(org:Organization)')
      .optionalMatch('(user)-[:PERFORMED]->(event:Event)')
      .whereRaw('event.type = "purchase" AND event.timestamp >= $cutoff', {
        cutoff: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
      })
      .with(`
        user,
        org,
        COLLECT(event) as purchaseEvents,
        duration.between(datetime(user.joinedAt), datetime()).months as tenureMonths,
        SUM(event.revenue) as totalRevenue
      `)
      .return(`
        // Segmentation
        user.tier as customerTier,
        CASE
          WHEN tenureMonths < 3 THEN 'new'
          WHEN tenureMonths < 12 THEN 'growing'
          WHEN tenureMonths < 36 THEN 'mature'
          ELSE 'veteran'
        END as lifecycleStage,
        
        COUNT(user) as customerCount,
        
        // CLV Components
        AVG(totalRevenue) as avgTotalRevenue,
        AVG(tenureMonths) as avgTenureMonths,
        AVG(totalRevenue / GREATEST(tenureMonths, 1)) as avgMonthlyRevenue,
        
        // Predicted CLV (simplified model)
        AVG(totalRevenue / GREATEST(tenureMonths, 1)) * 24 as projected24MonthCLV,
        
        // Acquisition metrics
        AVG(user.acquisitionCost) as avgAcquisitionCost,
        AVG(totalRevenue - user.acquisitionCost) as avgNetValue,
        
        // Engagement correlation
        AVG(user.engagementScore) as avgEngagementScore,
        CORR(user.engagementScore, totalRevenue) as engagementRevenueCorrelation
      `)
      .raw('ORDER BY customerTier, lifecycleStage')
      .build();
  }

  // ============================================================================
  // 2. CUSTOMER HEALTH AND CHURN PREDICTION
  // ============================================================================

  /**
   * Customer health scoring with churn risk assessment
   * Proactive customer success management
   */
  @CypherQuery({ 
    cache: '30m',
    description: 'Calculate customer health scores and churn risk',
    tags: ['customer-health', 'churn-prediction', 'customer-success']
  })
  async calculateCustomerHealthScores() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    return this.queryBuilder
      .match('org', () => Organization)
      .optionalMatch('(org)<-[:BELONGS_TO]-(user:User)')
      .optionalMatch('(user)-[:PERFORMED]->(event:Event)')
      .whereRaw('event.timestamp >= $thirtyDaysAgo', { thirtyDaysAgo })
      .optionalMatch('(org)-[:USES]->(product:Product)')
      .optionalMatch('(org)-[:HAS_TICKET]->(ticket:SupportTicket {status: "open"})')
      .with(`
        org,
        COLLECT(DISTINCT user) as users,
        COLLECT(DISTINCT event) as recentEvents,
        COLLECT(DISTINCT product) as usedProducts,
        COUNT(DISTINCT ticket) as openTickets,
        
        // Usage metrics
        SIZE([u IN COLLECT(user) WHERE u.lastActiveAt >= $sevenDaysAgo]) as activeUsersLast7Days,
        SIZE([e IN COLLECT(event) WHERE e.category = 'user_action']) as userActionEvents
      `, { sevenDaysAgo })
      .return(`
        org.id as organizationId,
        org.name as organizationName,
        org.plan as subscriptionPlan,
        org.mrr as monthlyRevenue,
        
        // Health Score Components (0-100 scale)
        CASE
          WHEN org.utilization >= 0.8 THEN 25
          WHEN org.utilization >= 0.6 THEN 20
          WHEN org.utilization >= 0.4 THEN 15
          WHEN org.utilization >= 0.2 THEN 10
          ELSE 0
        END as utilizationScore,
        
        CASE
          WHEN toFloat(activeUsersLast7Days) / toFloat(SIZE(users)) >= 0.7 THEN 25
          WHEN toFloat(activeUsersLast7Days) / toFloat(SIZE(users)) >= 0.5 THEN 20
          WHEN toFloat(activeUsersLast7Days) / toFloat(SIZE(users)) >= 0.3 THEN 15
          ELSE 0
        END as engagementScore,
        
        CASE
          WHEN userActionEvents >= 100 THEN 25
          WHEN userActionEvents >= 50 THEN 20
          WHEN userActionEvents >= 20 THEN 15
          WHEN userActionEvents >= 5 THEN 10
          ELSE 0
        END as activityScore,
        
        CASE
          WHEN openTickets = 0 THEN 25
          WHEN openTickets <= 2 THEN 15
          WHEN openTickets <= 5 THEN 10
          ELSE 0
        END as supportHealthScore,
        
        // Combined Health Score
        (CASE
          WHEN org.utilization >= 0.8 THEN 25
          WHEN org.utilization >= 0.6 THEN 20
          WHEN org.utilization >= 0.4 THEN 15
          WHEN org.utilization >= 0.2 THEN 10
          ELSE 0
        END +
        CASE
          WHEN toFloat(activeUsersLast7Days) / toFloat(SIZE(users)) >= 0.7 THEN 25
          WHEN toFloat(activeUsersLast7Days) / toFloat(SIZE(users)) >= 0.5 THEN 20
          WHEN toFloat(activeUsersLast7Days) / toFloat(SIZE(users)) >= 0.3 THEN 15
          ELSE 0
        END +
        CASE
          WHEN userActionEvents >= 100 THEN 25
          WHEN userActionEvents >= 50 THEN 20
          WHEN userActionEvents >= 20 THEN 15
          WHEN userActionEvents >= 5 THEN 10
          ELSE 0
        END +
        CASE
          WHEN openTickets = 0 THEN 25
          WHEN openTickets <= 2 THEN 15
          WHEN openTickets <= 5 THEN 10
          ELSE 0
        END) as overallHealthScore,
        
        // Churn Risk Assessment
        CASE
          WHEN (utilizationScore + engagementScore + activityScore + supportHealthScore) >= 80 THEN 'low'
          WHEN (utilizationScore + engagementScore + activityScore + supportHealthScore) >= 50 THEN 'medium'
          ELSE 'high'
        END as churnRisk,
        
        // Supporting metrics
        SIZE(users) as totalUsers,
        activeUsersLast7Days,
        userActionEvents,
        openTickets,
        org.utilization as seatUtilization,
        
        // Contract information
        org.nextBillingDate as nextBillingDate,
        duration.between(datetime(), datetime(org.nextBillingDate)).days as daysUntilRenewal
      `)
      .orderBy('overallHealthScore', 'ASC')
      .limit(100)
      .build();
  }

  /**
   * Churn prevention intervention recommendations
   * Actionable insights for customer success teams
   */
  @CypherQuery({ 
    cache: '1h',
    description: 'Generate churn prevention recommendations',
    tags: ['churn-prevention', 'customer-success', 'interventions']
  })
  async generateChurnPreventionRecommendations() {
    return this.queryBuilder
      .match('org', () => Organization)
      .where('org.churnRisk', '=', 'high')
      .optionalMatch('(org)<-[:BELONGS_TO]-(user:User)')
      .optionalMatch('(user)-[:PERFORMED]->(event:Event)')
      .whereRaw('event.timestamp >= $recentCutoff', {
        recentCutoff: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      })
      .optionalMatch('(org)-[:USES]->(product:Product)')
      .with(`
        org,
        COLLECT(DISTINCT user) as users,
        COLLECT(DISTINCT event) as recentEvents,
        COLLECT(DISTINCT product) as usedProducts,
        
        // Activity patterns
        SIZE([u IN COLLECT(user) WHERE u.lastActiveAt < $weekAgo]) as inactiveUsers,
        SIZE([e IN COLLECT(event) WHERE e.category = 'user_action']) as userActions,
        SIZE([e IN COLLECT(event) WHERE e.type = 'feature_used']) as featureUsage
      `, {
        weekAgo: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .return(`
        org.id as organizationId,
        org.name as organizationName,
        org.healthScore as currentHealthScore,
        org.mrr as monthlyRevenue,
        
        // Specific intervention recommendations
        CASE
          WHEN org.utilization < 0.3 THEN ['seat_optimization', 'onboarding_review']
          ELSE []
        END +
        CASE
          WHEN inactiveUsers > SIZE(users) * 0.5 THEN ['user_engagement_campaign', 'training_session']
          ELSE []
        END +
        CASE
          WHEN userActions < 10 THEN ['product_tour', 'success_manager_outreach']
          ELSE []
        END +
        CASE
          WHEN SIZE(usedProducts) < 3 THEN ['feature_adoption_program', 'integration_setup']
          ELSE []
        END +
        CASE
          WHEN org.supportTickets > 3 THEN ['support_escalation', 'technical_review']
          ELSE []
        END as recommendedInterventions,
        
        // Priority scoring
        (org.mrr * 
         CASE org.plan
           WHEN 'enterprise' THEN 3
           WHEN 'business' THEN 2
           ELSE 1
         END *
         CASE
           WHEN duration.between(datetime(), datetime(org.nextBillingDate)).days < 30 THEN 2
           ELSE 1
         END) as interventionPriority,
        
        // Context for success team
        {
          totalUsers: SIZE(users),
          inactiveUsers: inactiveUsers,
          recentActions: userActions,
          featuresUsed: SIZE(usedProducts),
          supportTickets: org.supportTickets,
          utilizationRate: org.utilization,
          daysUntilRenewal: duration.between(datetime(), datetime(org.nextBillingDate)).days
        } as context
      `)
      .orderBy('interventionPriority', 'DESC')
      .limit(50)
      .build();
  }

  // ============================================================================
  // 3. USAGE ANALYTICS AND OPTIMIZATION
  // ============================================================================

  /**
   * Feature adoption and usage analytics
   * Understanding product utilization patterns
   */
  @CypherQuery({ 
    cache: '2h',
    description: 'Analyze feature adoption and usage patterns',
    tags: ['feature-adoption', 'product-analytics', 'usage']
  })
  async analyzeFeatureAdoption(days = 30) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    return this.queryBuilder
      .match('product', () => Product, { status: 'active' })
      .optionalMatch('(org:Organization)-[:USES]->(product)')
      .optionalMatch('(user:User)-[:BELONGS_TO]->(org)')
      .optionalMatch('(user)-[:PERFORMED]->(event:Event)')
      .whereRaw('event.type = "feature_used" AND event.productId = product.id AND event.timestamp >= $cutoff', {
        cutoff: cutoffDate
      })
      .with(`
        product,
        COLLECT(DISTINCT org) as adoptingOrgs,
        COLLECT(DISTINCT user) as activeUsers,
        COLLECT(event) as usageEvents,
        
        // Calculate adoption metrics
        SIZE([(o:Organization) | o]) as totalOrgs,
        SIZE([(u:User {isActive: true}) | u]) as totalActiveUsers
      `)
      .return(`
        product.id as productId,
        product.name as productName,
        product.category as category,
        product.type as productType,
        
        // Adoption metrics
        SIZE(adoptingOrgs) as adoptingOrganizations,
        SIZE(activeUsers) as activeUsers,
        SIZE(usageEvents) as totalUsageEvents,
        
        // Adoption rates
        ROUND(toFloat(SIZE(adoptingOrgs)) / toFloat(totalOrgs) * 100, 2) as orgAdoptionRate,
        ROUND(toFloat(SIZE(activeUsers)) / toFloat(totalActiveUsers) * 100, 2) as userAdoptionRate,
        
        // Usage intensity
        CASE
          WHEN SIZE(activeUsers) > 0 
          THEN ROUND(toFloat(SIZE(usageEvents)) / toFloat(SIZE(activeUsers)), 2)
          ELSE 0
        END as avgUsagesPerUser,
        
        // User engagement levels
        SIZE([u IN activeUsers WHERE 
          SIZE([(u)-[:PERFORMED]->(e:Event) WHERE e.productId = product.id | e]) >= 10
        ]) as powerUsers,
        
        SIZE([u IN activeUsers WHERE 
          SIZE([(u)-[:PERFORMED]->(e:Event) WHERE e.productId = product.id | e]) BETWEEN 3 AND 9
        ]) as regularUsers,
        
        SIZE([u IN activeUsers WHERE 
          SIZE([(u)-[:PERFORMED]->(e:Event) WHERE e.productId = product.id | e]) BETWEEN 1 AND 2
        ]) as lightUsers,
        
        // Revenue impact
        SUM([org IN adoptingOrgs | org.mrr]) as totalMRRFromAdopters,
        
        // Adoption timeline (last 7 days vs previous period)
        SIZE([e IN usageEvents WHERE e.timestamp >= $last7Days]) as usageLast7Days,
        SIZE([e IN usageEvents WHERE e.timestamp < $last7Days]) as usagePrevious23Days
      `, {
        last7Days: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .orderBy('orgAdoptionRate', 'DESC')
      .build();
  }

  /**
   * User journey analysis and funnel optimization
   * Understanding user behavior patterns
   */
  @CypherQuery({ 
    cache: '1h',
    description: 'Analyze user journey funnels and conversion rates',
    tags: ['user-journey', 'funnel-analysis', 'conversion']
  })
  async analyzeUserJourneyFunnels() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    return this.queryBuilder
      .match('user', () => User)
      .where('user.joinedAt', '>=', thirtyDaysAgo)
      .optionalMatch('(user)-[:PERFORMED]->(onboarding:Event {type: "onboarding_completed"})')
      .optionalMatch('(user)-[:PERFORMED]->(firstAction:Event {category: "user_action"})')
      .optionalMatch('(user)-[:PERFORMED]->(firstFeature:Event {type: "feature_used"})')
      .optionalMatch('(user)-[:PERFORMED]->(upgrade:Event {type: "subscription_upgraded"})')
      .optionalMatch('(user)-[:PERFORMED]->(invite:Event {type: "team_member_invited"})')
      .with(`
        user,
        onboarding IS NOT NULL as completedOnboarding,
        firstAction IS NOT NULL as performedFirstAction,
        firstFeature IS NOT NULL as usedFirstFeature,
        upgrade IS NOT NULL as upgradedSubscription,
        invite IS NOT NULL as invitedTeamMember,
        
        // Time to value metrics
        duration.between(
          datetime(user.joinedAt), 
          datetime(COALESCE(firstAction.timestamp, user.joinedAt))
        ).hours as hoursToFirstAction,
        
        duration.between(
          datetime(user.joinedAt), 
          datetime(COALESCE(firstFeature.timestamp, user.joinedAt))
        ).hours as hoursToFirstFeature
      `)
      .return(`
        // Funnel metrics
        COUNT(user) as totalNewUsers,
        COUNT(CASE WHEN completedOnboarding THEN 1 END) as onboardingCompletions,
        COUNT(CASE WHEN performedFirstAction THEN 1 END) as firstActionUsers,
        COUNT(CASE WHEN usedFirstFeature THEN 1 END) as firstFeatureUsers,
        COUNT(CASE WHEN upgradedSubscription THEN 1 END) as upgradedUsers,
        COUNT(CASE WHEN invitedTeamMember THEN 1 END) as invitingUsers,
        
        // Conversion rates
        ROUND(toFloat(COUNT(CASE WHEN completedOnboarding THEN 1 END)) / toFloat(COUNT(user)) * 100, 2) as onboardingRate,
        ROUND(toFloat(COUNT(CASE WHEN performedFirstAction THEN 1 END)) / toFloat(COUNT(user)) * 100, 2) as firstActionRate,
        ROUND(toFloat(COUNT(CASE WHEN usedFirstFeature THEN 1 END)) / toFloat(COUNT(user)) * 100, 2) as firstFeatureRate,
        ROUND(toFloat(COUNT(CASE WHEN upgradedSubscription THEN 1 END)) / toFloat(COUNT(user)) * 100, 2) as upgradeRate,
        ROUND(toFloat(COUNT(CASE WHEN invitedTeamMember THEN 1 END)) / toFloat(COUNT(user)) * 100, 2) as inviteRate,
        
        // Time to value metrics
        PERCENTILE_CONT(hoursToFirstAction, 0.5) as medianHoursToFirstAction,
        PERCENTILE_CONT(hoursToFirstFeature, 0.5) as medianHoursToFirstFeature,
        
        // Cohort breakdown
        user.tier as userTier,
        user.referralSource as acquisitionSource
      `)
      .raw('ORDER BY userTier, acquisitionSource')
      .build();
  }

  // ============================================================================
  // 4. COMPLIANCE AND SECURITY REPORTING
  // ============================================================================

  /**
   * GDPR compliance reporting
   * Data privacy and compliance monitoring
   */
  @CypherQuery({ 
    cache: '24h',
    description: 'Generate GDPR compliance report',
    tags: ['gdpr', 'compliance', 'privacy', 'security']
  })
  async generateGDPRComplianceReport() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    return this.queryBuilder
      .match('user', () => User)
      .optionalMatch('(user)-[:PERFORMED]->(event:Event)')
      .whereRaw('event.type IN ["data_request", "data_deletion", "consent_updated"]')
      .optionalMatch('(user)-[:BELONGS_TO]->(org:Organization)')
      .whereRaw('org.complianceLevel IN ["gdpr", "hipaa"]')
      .with(`
        user,
        org,
        COLLECT([e IN COLLECT(event) WHERE e.type = "data_request" | e]) as dataRequests,
        COLLECT([e IN COLLECT(event) WHERE e.type = "data_deletion" | e]) as dataDeletions,
        COLLECT([e IN COLLECT(event) WHERE e.type = "consent_updated" | e]) as consentUpdates,
        
        // Compliance status
        user.gdprConsentAt IS NOT NULL as hasGdprConsent,
        user.emailVerifiedAt IS NOT NULL as emailVerified,
        duration.between(datetime(user.joinedAt), datetime()).days as accountAgeInDays
      `)
      .return(`
        // Overall compliance metrics
        COUNT(user) as totalUsers,
        COUNT(CASE WHEN hasGdprConsent THEN 1 END) as usersWithConsent,
        COUNT(CASE WHEN emailVerified THEN 1 END) as verifiedUsers,
        
        // Data requests and processing
        SIZE(REDUCE(requests = [], u IN COLLECT({user: user, requests: dataRequests}) | requests + u.requests)) as totalDataRequests,
        SIZE(REDUCE(deletions = [], u IN COLLECT({user: user, deletions: dataDeletions}) | deletions + u.deletions)) as totalDataDeletions,
        SIZE(REDUCE(updates = [], u IN COLLECT({user: user, updates: consentUpdates}) | updates + u.updates)) as totalConsentUpdates,
        
        // Compliance rates by organization type
        COUNT(CASE WHEN org.complianceLevel = 'gdpr' THEN 1 END) as gdprOrganizations,
        COUNT(CASE WHEN org.complianceLevel = 'hipaa' THEN 1 END) as hipaaOrganizations,
        
        // Geographic distribution for data residency
        COLLECT(DISTINCT user.countryCode) as countries,
        
        // Data retention compliance
        COUNT(CASE WHEN accountAgeInDays > 2555 THEN 1 END) as accountsOlderThan7Years,
        
        // Recent activity requiring compliance attention
        [request IN REDUCE(all = [], u IN COLLECT({user: user, requests: dataRequests}) | all + u.requests) 
         WHERE request.timestamp >= $recentCutoff | {
          userId: request.userId,
          type: request.type,
          timestamp: request.timestamp,
          status: request.properties.status
        }][0..10] as recentDataRequests
      `, {
        recentCutoff: thirtyDaysAgo
      })
      .build();
  }

  /**
   * Security audit and access control reporting
   * Security posture and access monitoring
   */
  @CypherQuery({ 
    cache: '6h',
    description: 'Generate security audit report',
    tags: ['security', 'audit', 'access-control']
  })
  async generateSecurityAuditReport() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    return this.queryBuilder
      .match('user', () => User)
      .optionalMatch('(user)-[:PERFORMED]->(loginEvent:Event {type: "user_login"})')
      .whereRaw('loginEvent.timestamp >= $recentCutoff', { recentCutoff: sevenDaysAgo })
      .optionalMatch('(user)-[:PERFORMED]->(failedLogin:Event {type: "login_failed"})')
      .whereRaw('failedLogin.timestamp >= $recentCutoff', { recentCutoff: sevenDaysAgo })
      .optionalMatch('(user)-[:BELONGS_TO]->(org:Organization)')
      .optionalMatch('(user)-[:HAS_PERMISSION]->(permission:Permission)')
      .with(`
        user,
        org,
        COLLECT(loginEvent) as successfulLogins,
        COLLECT(failedLogin) as failedLogins,
        COLLECT(permission) as permissions,
        
        // Security indicators
        SIZE([ip IN [e IN COLLECT(loginEvent) | e.properties.ipAddress] | ip]) as uniqueIPs,
        user.emailVerifiedAt IS NOT NULL as emailVerified,
        user.phoneVerifiedAt IS NOT NULL as phoneVerified,
        user.kycStatus = 'verified' as kycVerified
      `)
      .return(`
        // Authentication metrics
        COUNT(user) as totalActiveUsers,
        SUM(SIZE(successfulLogins)) as totalSuccessfulLogins,
        SUM(SIZE(failedLogins)) as totalFailedLogins,
        
        // Multi-factor authentication adoption
        COUNT(CASE WHEN phoneVerified THEN 1 END) as mfaEnabledUsers,
        ROUND(toFloat(COUNT(CASE WHEN phoneVerified THEN 1 END)) / toFloat(COUNT(user)) * 100, 2) as mfaAdoptionRate,
        
        // Identity verification rates
        COUNT(CASE WHEN emailVerified THEN 1 END) as emailVerifiedUsers,
        COUNT(CASE WHEN kycVerified THEN 1 END) as kycVerifiedUsers,
        
        // Access patterns and anomalies
        COUNT(CASE WHEN uniqueIPs > 5 THEN 1 END) as usersWithMultipleIPs,
        COUNT(CASE WHEN SIZE(failedLogins) > 3 THEN 1 END) as usersWithFailedAttempts,
        
        // Role-based access distribution
        COUNT(CASE WHEN user.role = 'admin' THEN 1 END) as adminUsers,
        COUNT(CASE WHEN user.role = 'moderator' THEN 1 END) as moderatorUsers,
        
        // High-risk indicators
        [user IN COLLECT(user) WHERE SIZE([e IN COLLECT(failedLogin) | e]) > 5 | {
          userId: user.id,
          email: user.email,
          failedAttempts: SIZE([e IN COLLECT(failedLogin) | e]),
          lastFailedAt: MAX([e IN COLLECT(failedLogin) | e.timestamp])
        }][0..10] as highRiskUsers,
        
        // Organization security posture
        AVG(org.healthScore) as avgOrgSecurityScore,
        COUNT(CASE WHEN org.complianceLevel IN ['sox', 'hipaa'] THEN 1 END) as highComplianceOrgs
      `)
      .build();
  }

  // ============================================================================
  // 5. PERFORMANCE MONITORING AND OPTIMIZATION
  // ============================================================================

  /**
   * Query performance monitoring
   * Database performance and optimization insights
   */
  @CypherQuery({ 
    cache: '15m',
    description: 'Monitor query performance metrics',
    tags: ['performance', 'monitoring', 'optimization']
  })
  async monitorQueryPerformance() {
    return this.queryBuilder
      .raw(`
        // Get query statistics from the last hour
        CALL dbms.queryJournal() YIELD query, elapsedTimeMillis, allocatedBytes
        WHERE query CONTAINS 'MATCH' AND elapsedTimeMillis > 100
        WITH query, elapsedTimeMillis, allocatedBytes
        ORDER BY elapsedTimeMillis DESC
        LIMIT 50
      `)
      .return(`
        query,
        elapsedTimeMillis,
        allocatedBytes,
        ROUND(toFloat(allocatedBytes) / 1024 / 1024, 2) as memoryUsageMB,
        
        // Query classification
        CASE
          WHEN query CONTAINS 'User' THEN 'user_queries'
          WHEN query CONTAINS 'Organization' THEN 'org_queries'
          WHEN query CONTAINS 'Event' THEN 'analytics_queries'
          ELSE 'other_queries'
        END as queryType,
        
        // Performance classification
        CASE
          WHEN elapsedTimeMillis > 5000 THEN 'very_slow'
          WHEN elapsedTimeMillis > 1000 THEN 'slow'
          WHEN elapsedTimeMillis > 500 THEN 'moderate'
          ELSE 'fast'
        END as performanceCategory
      `)
      .build();
  }

  /**
   * System health and capacity planning
   * Infrastructure monitoring and scaling insights
   */
  @CypherQuery({ 
    cache: '5m',
    description: 'Generate system health and capacity report',
    tags: ['system-health', 'capacity-planning', 'infrastructure']
  })
  async generateSystemHealthReport() {
    return this.queryBuilder
      .raw('CALL dbms.components() YIELD name, versions, edition')
      .raw('CALL dbms.listConfig() YIELD name, value WHERE name CONTAINS "memory"')
      .with('name, versions, edition, value')
      
      // Get database statistics
      .raw('CALL db.stats.retrieve("GRAPH COUNTS")')
      .raw('CALL db.stats.retrieve("TOKENS")')
      
      .match('user', () => User)
      .match('org', () => Organization) 
      .match('event', () => Event)
      .whereRaw('event.timestamp >= $last24Hours', {
        last24Hours: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      })
      
      .return(`
        // Database information
        COLLECT(DISTINCT {component: name, version: versions[0], edition: edition}) as dbComponents,
        
        // Entity counts and growth
        COUNT(DISTINCT user) as totalUsers,
        COUNT(DISTINCT CASE WHEN user.isActive THEN user.id END) as activeUsers,
        COUNT(DISTINCT org) as totalOrganizations,
        COUNT(DISTINCT event) as eventsLast24Hours,
        
        // Storage and performance indicators
        SIZE([(n) | n]) as totalNodes,
        SIZE([(r) | r]) as totalRelationships,
        
        // Growth rates (approximated)
        ROUND(toFloat(COUNT(DISTINCT event)) / 24, 0) as avgEventsPerHour,
        
        // Resource utilization estimates
        CASE
          WHEN COUNT(DISTINCT event) > 100000 THEN 'high_load'
          WHEN COUNT(DISTINCT event) > 10000 THEN 'medium_load'
          ELSE 'low_load'
        END as currentLoad,
        
        // Capacity planning indicators
        {
          userGrowthIndicator: COUNT(DISTINCT CASE WHEN user.joinedAt >= $lastWeek THEN user.id END),
          orgGrowthIndicator: COUNT(DISTINCT CASE WHEN org.subscriptionStartedAt >= $lastWeek THEN org.id END),
          eventVolumeIndicator: COUNT(DISTINCT event),
          recommendedAction: CASE
            WHEN COUNT(DISTINCT event) > 50000 THEN 'consider_scaling'
            WHEN COUNT(DISTINCT event) > 100000 THEN 'urgent_scaling_needed'
            ELSE 'capacity_adequate'
          END
        } as capacityPlanningData
      `, {
        lastWeek: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .build();
  }

  // ============================================================================
  // 6. BUSINESS INTELLIGENCE DASHBOARD QUERIES
  // ============================================================================

  /**
   * Executive dashboard summary
   * High-level business metrics for leadership
   */
  @CypherQuery({ 
    cache: '1h',
    description: 'Generate executive dashboard metrics',
    tags: ['executive-dashboard', 'kpis', 'business-intelligence']
  })
  async generateExecutiveDashboard() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const previousPeriod = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    return this.queryBuilder
      .match('user', () => User)
      .optionalMatch('(user)-[:BELONGS_TO]->(org:Organization)')
      .optionalMatch('(user)-[:PERFORMED]->(event:Event)')
      .whereRaw('event.timestamp >= $sixtyDaysAgo', { sixtyDaysAgo: previousPeriod })
      
      .with(`
        user, org, event,
        CASE 
          WHEN event.timestamp >= $thirtyDaysAgo THEN 'current_period'
          ELSE 'previous_period' 
        END as period
      `, { thirtyDaysAgo })
      
      .return(`
        // Revenue metrics
        SUM(CASE WHEN period = 'current_period' AND org IS NOT NULL THEN org.mrr ELSE 0 END) as currentMRR,
        SUM(CASE WHEN period = 'previous_period' AND org IS NOT NULL THEN org.mrr ELSE 0 END) as previousMRR,
        
        // Customer metrics
        COUNT(DISTINCT CASE WHEN period = 'current_period' THEN user.id END) as currentActiveUsers,
        COUNT(DISTINCT CASE WHEN period = 'previous_period' THEN user.id END) as previousActiveUsers,
        COUNT(DISTINCT CASE WHEN period = 'current_period' THEN org.id END) as currentOrganizations,
        COUNT(DISTINCT CASE WHEN period = 'previous_period' THEN org.id END) as previousOrganizations,
        
        // Activity metrics  
        COUNT(CASE WHEN period = 'current_period' AND event.category = 'user_action' THEN 1 END) as currentUserActions,
        COUNT(CASE WHEN period = 'previous_period' AND event.category = 'user_action' THEN 1 END) as previousUserActions,
        
        // Calculated growth rates
        ROUND(
          (toFloat(SUM(CASE WHEN period = 'current_period' AND org IS NOT NULL THEN org.mrr ELSE 0 END)) - 
           toFloat(SUM(CASE WHEN period = 'previous_period' AND org IS NOT NULL THEN org.mrr ELSE 0 END))) /
          toFloat(SUM(CASE WHEN period = 'previous_period' AND org IS NOT NULL THEN org.mrr ELSE 0 END)) * 100, 
          2
        ) as mrrGrowthRate,
        
        // Customer health summary
        COUNT(CASE WHEN org.churnRisk = 'high' THEN 1 END) as highRiskCustomers,
        AVG(org.healthScore) as averageHealthScore,
        
        // Product adoption summary
        COUNT(DISTINCT event.productId) as activeProducts,
        
        // Financial health indicators
        SUM(CASE WHEN org.plan = 'enterprise' THEN org.mrr ELSE 0 END) as enterpriseMRR,
        SUM(CASE WHEN org.plan = 'business' THEN org.mrr ELSE 0 END) as businessMRR,
        SUM(CASE WHEN org.plan = 'team' THEN org.mrr ELSE 0 END) as teamMRR
      `)
      .build();
  }
}

/**
 * Production Query Service Integration Examples
 * 
 * Shows how to integrate production queries into business processes
 * and automated systems.
 */
@Injectable()
export class ProductionIntegrationService {
  constructor(
    private readonly productionQueryService: ProductionQueryService,
    private readonly queryBuilder: Neo4jQueryBuilder
  ) {}

  /**
   * Automated customer health monitoring
   * Runs regularly to identify at-risk customers
   */
  async runCustomerHealthMonitoring() {
    const healthScores = await this.productionQueryService.calculateCustomerHealthScores();
    const interventions = await this.productionQueryService.generateChurnPreventionRecommendations();
    
    // Integration points:
    // 1. Send alerts to customer success team
    // 2. Update CRM records
    // 3. Trigger automated email campaigns
    // 4. Create support tickets for high-risk accounts
    
    return {
      healthScores,
      interventions,
      alertsGenerated: 0, // Would be actual count
      automationsTriggered: 0 // Would be actual count
    };
  }

  /**
   * Monthly business reporting automation
   * Generates comprehensive business reports
   */
  async generateMonthlyBusinessReport() {
    const [
      mrrAnalytics,
      clvAnalytics,
      featureAdoption,
      executiveDashboard,
      complianceReport
    ] = await Promise.all([
      this.productionQueryService.calculateMRRAnalytics(),
      this.productionQueryService.calculateCustomerLifetimeValue(),
      this.productionQueryService.analyzeFeatureAdoption(),
      this.productionQueryService.generateExecutiveDashboard(),
      this.productionQueryService.generateGDPRComplianceReport()
    ]);

    return {
      reportDate: new Date().toISOString(),
      sections: {
        revenue: mrrAnalytics,
        customerValue: clvAnalytics,
        productUsage: featureAdoption,
        executiveSummary: executiveDashboard,
        compliance: complianceReport
      }
    };
  }
}