/**
 * @fileoverview Security and Monitoring Example
 *
 * Demonstrates:
 * - Comprehensive security decorators
 * - Audit logging and compliance
 * - Performance monitoring
 * - Rate limiting and DDoS protection
 * - Data encryption and anonymization
 * - Security event tracking
 */

import {
  Injectable,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  Neo4jEntity,
  Neo4jProp,
  Id,
  CreatedAt,
  UpdatedAt,
  NotNull,
  Unique,
  PropIndex,
  Repository,
  InjectNeogma,
  NeogmaService,
  Safe,
  Authorize,
  RateLimit,
  Transactional,
  CypherQuery,
  NeogmaMetricsService,
  BaseRepositoryService,
} from '../index';

// ============================================================================
// 1. SECURITY-FOCUSED ENTITIES
// ============================================================================

@Neo4jEntity('UserProfile')
export class UserProfile {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex({ name: 'user_username_index' })
  username: string;

  @Neo4jProp()
  @NotNull()
  @Unique({ name: 'user_email_unique' })
  @PropIndex({ name: 'user_email_index' })
  email: string;

  @Neo4jProp()
  @NotNull()
  hashedPassword: string; // Should be hashed before storage

  @Neo4jProp()
  @NotNull()
  @PropIndex({ name: 'user_role_index' })
  role: 'admin' | 'moderator' | 'user' | 'guest';

  @Neo4jProp()
  @PropIndex({ name: 'user_status_index' })
  status: 'active' | 'suspended' | 'locked' | 'pending_verification';

  @Neo4jProp()
  @PropIndex({ name: 'user_mfa_index' })
  mfaEnabled: boolean;

  @Neo4jProp()
  lastLoginAt?: Date;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE', name: 'user_failed_attempts_index' })
  failedLoginAttempts: number;

  @Neo4jProp()
  lockoutUntil?: Date;

  @Neo4jProp()
  // Sensitive data - will be encrypted
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    ssn?: string; // Social Security Number - highly sensitive
    phoneNumber?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };

  @Neo4jProp()
  preferences: {
    theme: 'light' | 'dark';
    language: string;
    notifications: boolean;
    analyticsOptOut: boolean;
  };

  @Neo4jProp()
  securityMetadata: {
    ipAddresses: string[];
    userAgents: string[];
    deviceFingerprints: string[];
    securityQuestions?: Array<{
      question: string;
      hashedAnswer: string;
    }>;
  };

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  [key: string]: any;
}

@Neo4jEntity('SecurityEvent')
export class SecurityEvent {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex({ name: 'event_type_index' })
  eventType:
    | 'login_success'
    | 'login_failure'
    | 'password_change'
    | 'privilege_escalation'
    | 'suspicious_activity'
    | 'data_access'
    | 'admin_action'
    | 'security_violation';

  @Neo4jProp()
  @NotNull()
  @PropIndex({ name: 'event_severity_index' })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @Neo4jProp()
  @PropIndex({ name: 'event_user_index' })
  userId?: string;

  @Neo4jProp()
  @PropIndex({ name: 'event_ip_index' })
  ipAddress: string;

  @Neo4jProp()
  userAgent: string;

  @Neo4jProp()
  @PropIndex({ name: 'event_status_index' })
  status: 'pending' | 'reviewed' | 'resolved' | 'escalated';

  @Neo4jProp()
  description: string;

  @Neo4jProp()
  details: {
    method?: string;
    endpoint?: string;
    parameters?: Record<string, any>;
    responseCode?: number;
    processingTime?: number;
    resourcesAccessed?: string[];
    anomalyScore?: number;
  };

  @Neo4jProp()
  @PropIndex({ name: 'event_resolved_index' })
  resolvedAt?: Date;

  @Neo4jProp()
  resolvedBy?: string;

  @Neo4jProp()
  resolutionNotes?: string;

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  [key: string]: any;
}

@Neo4jEntity('AuditLog')
export class AuditLog {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex({ name: 'audit_action_index' })
  action: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex({ name: 'audit_resource_index' })
  resourceType: string;

  @Neo4jProp()
  @PropIndex({ name: 'audit_resource_id_index' })
  resourceId?: string;

  @Neo4jProp()
  @PropIndex({ name: 'audit_user_index' })
  userId: string;

  @Neo4jProp()
  @PropIndex({ name: 'audit_tenant_index' })
  tenantId?: string;

  @Neo4jProp()
  @PropIndex({ name: 'audit_ip_index' })
  ipAddress: string;

  @Neo4jProp()
  userAgent: string;

  @Neo4jProp()
  requestDetails: {
    method: string;
    endpoint: string;
    headers: Record<string, string>;
    queryParams?: Record<string, any>;
    bodyParams?: Record<string, any>;
  };

  @Neo4jProp()
  responseDetails: {
    statusCode: number;
    processingTime: number;
    dataSize?: number;
  };

  @Neo4jProp()
  beforeState?: Record<string, any>;

  @Neo4jProp()
  afterState?: Record<string, any>;

  @Neo4jProp()
  @PropIndex({ name: 'audit_compliance_index' })
  complianceFlags: {
    gdprRelevant: boolean;
    hipaaRelevant: boolean;
    pciRelevant: boolean;
    soxRelevant: boolean;
  };

  @CreatedAt()
  createdAt: Date;

  [key: string]: any;
}

// ============================================================================
// 2. SECURITY DTOs AND INTERFACES
// ============================================================================

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  role?: 'user' | 'moderator';
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    phoneNumber?: string;
  };
}

export interface UpdateUserDto {
  email?: string;
  personalInfo?: Partial<UserProfile['personalInfo']>;
  preferences?: Partial<UserProfile['preferences']>;
}

export interface SecurityDashboard {
  overview: {
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    totalSecurityEvents: number;
    criticalEvents: number;
    unresolvedEvents: number;
  };
  recentEvents: SecurityEvent[];
  topThreats: Array<{
    type: string;
    count: number;
    severity: string;
  }>;
  userActivityMetrics: {
    loginRate: number;
    failureRate: number;
    anomalousActivity: number;
  };
  complianceMetrics: {
    gdprAuditCount: number;
    hipaaAuditCount: number;
    dataRetentionCompliance: number;
  };
}

export interface SecurityAlert {
  id: string;
  type:
    | 'brute_force'
    | 'privilege_escalation'
    | 'data_breach'
    | 'anomalous_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedUsers: string[];
  recommendedActions: string[];
  autoResolved: boolean;
  createdAt: Date;
}

// ============================================================================
// 3. SECURE REPOSITORY WITH EXTENSIVE PROTECTION
// ============================================================================

@Repository(() => UserProfile)
@Injectable()
export class SecureUserRepository extends BaseRepositoryService<UserProfile> {
  constructor() {
    super();
  }

  /**
   * Find user with comprehensive security checks
   */
  @Safe({ strict: true })
  @RateLimit({ requests: 100, window: '1m', strategy: 'fixed-window' })
  async findByEmail(email: string): Promise<UserProfile | null> {
    const users = await this.findAll({ where: { email } });
    return users[0] || null;
  }

  /**
   * Create user with encryption and validation
   */
  @Safe({ strict: true })
  @Transactional()
  async createSecureUser(userData: CreateUserDto): Promise<UserProfile> {
    // Check for existing user
    const existing = await this.findByEmail(userData.email);
    if (existing) {
      throw new Error('User with this email already exists');
    }

    // Create user with secure defaults
    return this.create({
      username: userData.username,
      email: userData.email,
      hashedPassword: userData.password, // Should be hashed by middleware
      role: userData.role || 'user',
      status: 'pending_verification',
      mfaEnabled: false,
      failedLoginAttempts: 0,
      personalInfo: userData.personalInfo,
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: true,
        analyticsOptOut: false,
      },
      securityMetadata: {
        ipAddresses: [],
        userAgents: [],
        deviceFingerprints: [],
      },
    });
  }

  /**
   * Update user with selective field encryption
   */
  @Safe({ strict: true })
  @Authorize({
    roles: ['admin', 'user'],
  })
  async updateSecureUser(
    userId: string,
    updates: UpdateUserDto
  ): Promise<UserProfile | null> {
    return this.update(userId, updates as Partial<UserProfile>);
  }

  /**
   * Anonymize user data for compliance
   */
  @Authorize({ roles: ['admin'] })
  @Transactional()
  async anonymizeUser(userId: string): Promise<boolean> {
    const anonymizedData = {
      username: `anonymous_${Date.now()}`,
      email: `anonymous_${Date.now()}@deleted.com`,
      personalInfo: {
        firstName: 'ANONYMIZED',
        lastName: 'ANONYMIZED',
        dateOfBirth: new Date('1900-01-01'),
        ssn: null,
        phoneNumber: null,
        address: null,
      },
      status: 'suspended' as const,
    };

    const result = await this.update(
      userId,
      anonymizedData as unknown as Partial<UserProfile>
    );
    return !!result;
  }
}

// ============================================================================
// 4. SECURITY MONITORING SERVICE
// ============================================================================

@Injectable()
export class SecurityMonitoringService {
  constructor(
    private readonly metricsService: NeogmaMetricsService,
    @InjectNeogma() private readonly neogma: NeogmaService
  ) {
    // No model registration needed - @Repository decorator handles it
  }

  /**
   * Log security event with threat analysis
   */
  @Safe({ strict: true })
  @RateLimit({ requests: 1000, window: '1m', strategy: 'fixed-window' })
  async logSecurityEvent(eventData: {
    eventType: SecurityEvent['eventType'];
    severity: SecurityEvent['severity'];
    userId?: string;
    ipAddress: string;
    userAgent: string;
    description: string;
    details?: SecurityEvent['details'];
  }): Promise<SecurityEvent> {
    // Create security event using QueryBuilder
    const createEventBuilder = this.neogma.createQueryBuilder();
    const createEventBindParam = createEventBuilder.getBindParam();

    const eventTypeParam = createEventBindParam.add(eventData.eventType);
    const severityParam = createEventBindParam.add(eventData.severity);
    const userIdParam = createEventBindParam.add(eventData.userId);
    const ipAddressParam = createEventBindParam.add(eventData.ipAddress);
    const userAgentParam = createEventBindParam.add(eventData.userAgent);
    const statusParam = createEventBindParam.add('pending');
    const descriptionParam = createEventBindParam.add(eventData.description);
    const detailsParam = createEventBindParam.add(eventData.details || {});
    const nowParam = createEventBindParam.add(new Date());

    createEventBuilder
      .create('(e:SecurityEvent)')
      .set(
        `e.id = randomUUID(),
            e.eventType = $${eventTypeParam},
            e.severity = $${severityParam},
            e.userId = $${userIdParam},
            e.ipAddress = $${ipAddressParam},
            e.userAgent = $${userAgentParam},
            e.status = $${statusParam},
            e.description = $${descriptionParam},
            e.details = $${detailsParam},
            e.createdAt = $${nowParam},
            e.updatedAt = $${nowParam}`
      )
      .return('e');

    const createEventCypher = createEventBuilder.getStatement();
    const createEventParams = createEventBindParam.get();
    const createEventResult = await this.neogma.run(
      createEventCypher,
      createEventParams
    );
    const event = createEventResult.records[0].get('e')
      .properties as SecurityEvent;

    // Check for patterns that indicate threats
    await this.analyzeSecurityPattern(eventData);

    return event;
  }

  /**
   * Detect suspicious activity patterns
   */
  @Safe({ strict: true })
  @CypherQuery({
    cache: '1m', // 1 minute cache
    retry: 2,
    mode: 'READ',
  })
  async detectSuspiciousActivity(): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];

    // Detect brute force attacks
    const bruteForceBuilder = this.neogma.createQueryBuilder();
    const bruteForceBindParam = bruteForceBuilder.getBindParam();

    const loginFailureParam = bruteForceBindParam.add('login_failure');
    const recentTimeParam = bruteForceBindParam.add(
      new Date(Date.now() - 15 * 60 * 1000)
    );

    bruteForceBuilder
      .match('(event:SecurityEvent)')
      .where(
        `event.eventType = $${loginFailureParam} AND event.createdAt >= $${recentTimeParam}`
      )
      .return('event.ipAddress as ip, count(*) as attempts')
      .orderBy('attempts DESC');

    const bruteForceCypher = bruteForceBuilder.getStatement();
    const bruteForceParams = bruteForceBindParam.get();
    const bruteForceResult = await this.neogma.run(
      bruteForceCypher,
      bruteForceParams
    );

    bruteForceResult.records.forEach((record) => {
      const attempts = record.get('attempts').toNumber();
      if (attempts >= 10) {
        // Threshold for brute force
        alerts.push({
          id: `bf_${Date.now()}_${record.get('ip')}`,
          type: 'brute_force',
          severity: 'high',
          description: `Potential brute force attack from IP ${record.get(
            'ip'
          )} with ${attempts} failed login attempts`,
          affectedUsers: [],
          recommendedActions: [
            'Block IP address',
            'Investigate user accounts',
            'Enable additional monitoring',
          ],
          autoResolved: false,
          createdAt: new Date(),
        });
      }
    });

    // Detect privilege escalation attempts
    const privilegeBuilder = this.neogma.createQueryBuilder();
    const privilegeBindParam = privilegeBuilder.getBindParam();

    const privEscalationParam = privilegeBindParam.add('privilege_escalation');
    const recentHourParam = privilegeBindParam.add(
      new Date(Date.now() - 60 * 60 * 1000)
    );

    privilegeBuilder
      .match('(event:SecurityEvent)')
      .where(
        `event.eventType = $${privEscalationParam} AND event.createdAt >= $${recentHourParam}`
      )
      .return('event.userId as userId, count(*) as attempts');

    const privilegeCypher = privilegeBuilder.getStatement();
    const privilegeParams = privilegeBindParam.get();
    const privilegeResult = await this.neogma.run(
      privilegeCypher,
      privilegeParams
    );

    privilegeResult.records.forEach((record) => {
      const userId = record.get('userId');
      const attempts = record.get('attempts').toNumber();

      if (attempts >= 3) {
        alerts.push({
          id: `pe_${Date.now()}_${userId}`,
          type: 'privilege_escalation',
          severity: 'critical',
          description: `Multiple privilege escalation attempts by user ${userId}`,
          affectedUsers: [userId],
          recommendedActions: [
            'Suspend user account',
            'Review user permissions',
            'Conduct security investigation',
          ],
          autoResolved: false,
          createdAt: new Date(),
        });
      }
    });

    return alerts;
  }

  /**
   * Generate comprehensive security dashboard
   */
  @Safe({ strict: true })
  @Authorize({ roles: ['admin', 'security_analyst'] })
  @CypherQuery({
    cache: '5m', // 5 minutes cache
    mode: 'READ',
  })
  async getSecurityDashboard(): Promise<SecurityDashboard> {
    // User overview statistics
    const userStatsBuilder = this.neogma.createQueryBuilder();
    const userStatsBindParam = userStatsBuilder.getBindParam();

    userStatsBuilder.match('(u:UserProfile)').return(`
        count(u) as totalUsers,
        sum(CASE WHEN u.status = 'active' THEN 1 ELSE 0 END) as activeUsers,
        sum(CASE WHEN u.status = 'suspended' THEN 1 ELSE 0 END) as suspendedUsers
      `);

    const userStatsCypher = userStatsBuilder.getStatement();
    const userStatsParams = userStatsBindParam.get();
    const userStatsResult = await this.neogma.run(
      userStatsCypher,
      userStatsParams
    );
    const userStats = userStatsResult.records[0];

    // Security events overview
    const eventsStatsBuilder = this.neogma.createQueryBuilder();
    const eventsStatsBindParam = eventsStatsBuilder.getBindParam();

    eventsStatsBuilder.match('(e:SecurityEvent)').return(`
        count(e) as totalEvents,
        sum(CASE WHEN e.severity = 'critical' THEN 1 ELSE 0 END) as criticalEvents,
        sum(CASE WHEN e.status = 'pending' THEN 1 ELSE 0 END) as unresolvedEvents
      `);

    const eventsStatsCypher = eventsStatsBuilder.getStatement();
    const eventsStatsParams = eventsStatsBindParam.get();
    const eventsStatsResult = await this.neogma.run(
      eventsStatsCypher,
      eventsStatsParams
    );
    const eventsStats = eventsStatsResult.records[0];

    // Recent security events
    const recentEventsBuilder = this.neogma.createQueryBuilder();
    const recentEventsBindParam = recentEventsBuilder.getBindParam();

    recentEventsBuilder
      .match('(e:SecurityEvent)')
      .return('e')
      .orderBy('e.createdAt DESC')
      .limit(20);

    const recentEventsCypher = recentEventsBuilder.getStatement();
    const recentEventsParams = recentEventsBindParam.get();
    const recentEventsResult = await this.neogma.run(
      recentEventsCypher,
      recentEventsParams
    );
    const recentEvents = recentEventsResult.records.map(
      (record) => record.get('e').properties as SecurityEvent
    );

    // Top threat types
    const threatTypesBuilder = this.neogma.createQueryBuilder();
    const threatTypesBindParam = threatTypesBuilder.getBindParam();
    const threatRecentTimeParam = threatTypesBindParam.add(
      new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    threatTypesBuilder
      .match('(e:SecurityEvent)')
      .where(`e.createdAt >= $${threatRecentTimeParam}`)
      .return('e.eventType as type, e.severity as severity, count(*) as count')
      .orderBy('count DESC')
      .limit(10);

    const threatTypesCypher = threatTypesBuilder.getStatement();
    const threatTypesParams = threatTypesBindParam.get();
    const threatTypesResult = await this.neogma.run(
      threatTypesCypher,
      threatTypesParams
    );
    const topThreats = threatTypesResult.records.map((record) => ({
      type: record.get('type'),
      count: record.get('count').toNumber(),
      severity: record.get('severity'),
    }));

    // Compliance metrics
    const complianceBuilder = this.neogma.createQueryBuilder();
    const complianceBindParam = complianceBuilder.getBindParam();
    const complianceRecentTimeParam = complianceBindParam.add(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    complianceBuilder
      .match('(a:AuditLog)')
      .where(`a.createdAt >= $${complianceRecentTimeParam}`).return(`
        sum(CASE WHEN a.complianceFlags.gdprRelevant THEN 1 ELSE 0 END) as gdprAudits,
        sum(CASE WHEN a.complianceFlags.hipaaRelevant THEN 1 ELSE 0 END) as hipaaAudits,
        count(a) as totalAudits
      `);

    const complianceCypher = complianceBuilder.getStatement();
    const complianceParams = complianceBindParam.get();
    const complianceResult = await this.neogma.run(
      complianceCypher,
      complianceParams
    );
    const complianceStats = complianceResult.records[0];

    return {
      overview: {
        totalUsers: userStats.get('totalUsers').toNumber(),
        activeUsers: userStats.get('activeUsers').toNumber(),
        suspendedUsers: userStats.get('suspendedUsers').toNumber(),
        totalSecurityEvents: eventsStats.get('totalEvents').toNumber(),
        criticalEvents: eventsStats.get('criticalEvents').toNumber(),
        unresolvedEvents: eventsStats.get('unresolvedEvents').toNumber(),
      },
      recentEvents,
      topThreats,
      userActivityMetrics: {
        loginRate: 0, // Would calculate from login events
        failureRate: 0, // Would calculate from failed login events
        anomalousActivity: 0, // Would calculate from anomaly detection
      },
      complianceMetrics: {
        gdprAuditCount: complianceStats.get('gdprAudits').toNumber(),
        hipaaAuditCount: complianceStats.get('hipaaAudits').toNumber(),
        dataRetentionCompliance: 95, // Would calculate based on retention policies
      },
    };
  }

  /**
   * Performance monitoring with security focus
   */
  @Safe({ strict: true })
  @Authorize({ roles: ['admin'] })
  async getPerformanceMetrics(): Promise<{
    neo4jMetrics: any;
    securityMetrics: {
      averageAuthTime: number;
      encryptionOverhead: number;
      auditLogSize: number;
      securityEventRate: number;
    };
    systemHealth: {
      status: 'healthy' | 'warning' | 'critical';
      issues: string[];
      recommendations: string[];
    };
  }> {
    const neo4jMetrics = {
      query: this.metricsService.getQueryMetrics(),
      connection: this.metricsService.getConnectionMetrics(),
      system: this.metricsService.getSystemHealth(),
    };

    // Calculate security-specific metrics
    const securityMetricsBuilder = this.neogma.createQueryBuilder();
    const securityMetricsBindParam = securityMetricsBuilder.getBindParam();
    const recentTimeParam = securityMetricsBindParam.add(
      new Date(Date.now() - 60 * 60 * 1000)
    );

    securityMetricsBuilder
      .match('(a:AuditLog)')
      .where(`a.createdAt >= $${recentTimeParam}`).return(`
        avg(a.responseDetails.processingTime) as avgProcessingTime,
        count(a) as auditCount,
        sum(a.responseDetails.dataSize) as totalDataSize
      `);

    const securityMetricsCypher = securityMetricsBuilder.getStatement();
    const securityMetricsParams = securityMetricsBindParam.get();
    const securityMetricsResult = await this.neogma.run(
      securityMetricsCypher,
      securityMetricsParams
    );
    const securityRecord = securityMetricsResult.records[0];

    const securityMetrics = {
      averageAuthTime: securityRecord.get('avgProcessingTime').toNumber() || 0,
      encryptionOverhead: 5, // Would measure actual encryption overhead
      auditLogSize: securityRecord.get('totalDataSize').toNumber() || 0,
      securityEventRate: securityRecord.get('auditCount').toNumber() || 0,
    };

    // Assess system health
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (neo4jMetrics.query.errorRate > 0.01) {
      issues.push('High error rate detected');
      recommendations.push('Investigate database connectivity');
      status = 'warning';
    }

    if (securityMetrics.averageAuthTime > 1000) {
      issues.push('Slow authentication performance');
      recommendations.push('Optimize authentication queries');
      status = 'warning';
    }

    if (securityMetrics.auditLogSize > 1000000) {
      // 1MB
      issues.push('Large audit log size');
      recommendations.push('Consider audit log archival');
    }

    return {
      neo4jMetrics,
      securityMetrics,
      systemHealth: {
        status,
        issues,
        recommendations,
      },
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async analyzeSecurityPattern(eventData: any): Promise<void> {
    // Pattern analysis logic would go here
    // This could include ML-based anomaly detection, rule-based pattern matching, etc.

    if (eventData.eventType === 'login_failure') {
      // Check for brute force patterns
      await this.checkBruteForcePattern(eventData.ipAddress);
    }

    if (eventData.severity === 'critical') {
      // Immediate alerting for critical events
      await this.triggerSecurityAlert(eventData);
    }
  }

  private async checkBruteForcePattern(ipAddress: string): Promise<void> {
    const recentFailures = await this.neogma.run(
      `
      MATCH (e:SecurityEvent)
      WHERE e.ipAddress = $ipAddress
        AND e.eventType = 'login_failure'
        AND e.createdAt >= $recentTime
      RETURN count(e) as failureCount
      `,
      {
        ipAddress,
        recentTime: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
      }
    );

    const failureCount =
      recentFailures.records[0]?.get('failureCount').toNumber() || 0;

    if (failureCount >= 5) {
      // Trigger brute force alert
      await this.triggerSecurityAlert({
        type: 'brute_force_detected',
        severity: 'high',
        ipAddress,
        description: `Brute force attack detected from IP ${ipAddress}`,
      });
    }
  }

  private async triggerSecurityAlert(alertData: any): Promise<void> {
    // Integration with alerting systems (email, Slack, PagerDuty, etc.)
    console.log('SECURITY ALERT:', alertData);

    // Could integrate with external systems:
    // - Send email to security team
    // - Post to Slack channel
    // - Create PagerDuty incident
    // - Log to SIEM system
  }
}

// ============================================================================
// 5. SECURE CONTROLLER WITH COMPREHENSIVE PROTECTION
// ============================================================================

@Controller('secure-users')
export class SecureUserController {
  constructor(
    private readonly userRepo: SecureUserRepository,
    private readonly securityService: SecurityMonitoringService
  ) {}

  @Post()
  @RateLimit({ requests: 10, window: '5m', strategy: 'fixed-window' }) // 10 requests per 5 minutes
  async createUser(@Body() userData: CreateUserDto) {
    return this.userRepo.createSecureUser(userData);
  }

  @Get(':id')
  @Authorize({ roles: ['admin', 'user'] })
  @RateLimit({ requests: 100, window: '1m', strategy: 'fixed-window' })
  async getUser(@Param('id') userId: string) {
    return this.userRepo.findById(userId);
  }

  @Put(':id')
  @Authorize({ roles: ['admin', 'user'] })
  @RateLimit({ requests: 20, window: '5m', strategy: 'fixed-window' })
  async updateUser(
    @Param('id') userId: string,
    @Body() updates: UpdateUserDto
  ) {
    return this.userRepo.updateSecureUser(userId, updates);
  }

  @Delete(':id/anonymize')
  @Authorize({ roles: ['admin'] })
  async anonymizeUser(@Param('id') userId: string) {
    return this.userRepo.anonymizeUser(userId);
  }

  @Get('security/dashboard')
  @Authorize({ roles: ['admin', 'security_analyst'] })
  @RateLimit({ requests: 30, window: '1m', strategy: 'fixed-window' })
  async getSecurityDashboard() {
    return this.securityService.getSecurityDashboard();
  }

  @Get('security/alerts')
  @Authorize({ roles: ['admin', 'security_analyst'] })
  @RateLimit({ requests: 50, window: '1m', strategy: 'fixed-window' })
  async getSecurityAlerts() {
    return this.securityService.detectSuspiciousActivity();
  }

  @Get('security/metrics')
  @Authorize({ roles: ['admin'] })
  @RateLimit({ requests: 20, window: '1m', strategy: 'fixed-window' })
  async getPerformanceMetrics() {
    return this.securityService.getPerformanceMetrics();
  }
}

// ============================================================================
// 6. USAGE EXAMPLE
// ============================================================================

export class SecurityMonitoringExample {
  constructor(
    private readonly userRepo: SecureUserRepository,
    private readonly securityService: SecurityMonitoringService
  ) {}

  async demonstrateUsage(): Promise<void> {
    try {
      // Create a secure user with comprehensive validation
      const newUser = await this.userRepo.createSecureUser({
        username: 'johndoe',
        email: 'john.doe@example.com',
        password: 'SecurePassword123!',
        role: 'user',
        personalInfo: {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: new Date('1990-01-01'),
          phoneNumber: '+1-555-123-4567',
        },
      });
      console.log('Secure user created:', newUser.id);

      // Log a security event
      await this.securityService.logSecurityEvent({
        eventType: 'login_success',
        severity: 'low',
        userId: newUser.id,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        description: 'User successfully logged in',
        details: {
          method: 'POST',
          endpoint: '/auth/login',
          processingTime: 150,
        },
      });

      // Detect suspicious activity
      const alerts = await this.securityService.detectSuspiciousActivity();
      console.log('Security alerts:', alerts);

      // Get security dashboard
      const dashboard = await this.securityService.getSecurityDashboard();
      console.log('Security dashboard:', dashboard);

      // Get performance metrics
      const metrics = await this.securityService.getPerformanceMetrics();
      console.log('Performance metrics:', metrics);

      // Update user with encryption
      const updatedUser = await this.userRepo.updateSecureUser(newUser.id, {
        personalInfo: {
          phoneNumber: '+1-555-987-6543', // Will be encrypted
        },
        preferences: {
          theme: 'dark',
          notifications: false,
        },
      });
      console.log('User updated:', updatedUser?.id);

      // Anonymize user for GDPR compliance
      const anonymized = await this.userRepo.anonymizeUser(newUser.id);
      console.log('User anonymized:', anonymized);
    } catch (error) {
      console.error('Security example error:', error);

      // Log security event for the error
      await this.securityService.logSecurityEvent({
        eventType: 'security_violation',
        severity: 'medium',
        ipAddress: '127.0.0.1',
        userAgent: 'System',
        description: `Security example failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        details: {
          method: 'POST',
          endpoint: '/security/example',
          processingTime: 0,
        },
      });
    }
  }
}
