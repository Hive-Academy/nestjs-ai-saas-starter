/**
 * @fileoverview Audit Logging Security Examples (Phase 5A)
 * 
 * Comprehensive examples demonstrating enterprise-grade audit logging
 * with the @AuditLog decorator for compliance, monitoring, and forensic analysis.
 * 
 * Features demonstrated:
 * - Compliance logging (GDPR, HIPAA, SOX, PCI)
 * - Multi-level audit detail (minimal, standard, detailed, full)
 * - Neo4j audit storage patterns
 * - Custom audit fields and metadata
 * - Performance-optimized logging
 * 
 * Target: Enterprise customers requiring compliance and audit trails
 */

import { Injectable, Logger } from '@nestjs/common';
import { AuditLog, AuditLogConfig } from '../../decorators/security.decorators';
import { CypherQuery } from '../../decorators/cypher-query.decorator';
import { CreateEntity, UpdateEntity, DeleteEntity } from '../../decorators/entity-crud.decorators';
import type { BaseEntity } from '../../types/neo4j-types';

/**
 * Patient Health Record (HIPAA Compliance Example)
 */
interface PatientRecord extends BaseEntity {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  medicalRecordNumber: string;
  diagnosis: string[];
  treatments: string[];
  medications: string[];
  doctorId: string;
  facilityId: string;
  lastAccessedAt?: Date;
}

/**
 * Financial Transaction (SOX/PCI Compliance Example)
 */
interface FinancialTransaction extends BaseEntity {
  transactionId: string;
  amount: number;
  currency: string;
  accountFrom: string;
  accountTo: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  processedAt?: Date;
  authorizedBy?: string;
}

/**
 * User Personal Data (GDPR Compliance Example)
 */
interface UserPersonalData extends BaseEntity {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  address?: string;
  country: string;
  consentGiven: boolean;
  consentDate: Date;
  dataRetentionUntil: Date;
}

/**
 * EXAMPLE 1: MINIMAL AUDIT LOGGING
 * 
 * Lightweight auditing for non-sensitive operations
 */
@Injectable()
export class MinimalAuditService {
  private readonly logger = new Logger(MinimalAuditService.name);

  /**
   * Basic user login tracking - minimal overhead
   */
  @AuditLog({
    enabled: true,
    logLevel: 'minimal',
    logSuccess: true,
    logFailures: true,
    storage: {
      storeInNeo4j: true,
      retentionDays: 90 // 3 months for login logs
    }
  })
  @CypherQuery({
    query: `
      MATCH (u:User {id: $userId})
      SET u.lastLoginAt = datetime(),
          u.loginCount = coalesce(u.loginCount, 0) + 1
      RETURN u
    `,
    mode: 'WRITE',
    description: 'Update user login timestamp'
  })
  async recordUserLogin(userId: string, ipAddress: string): Promise<void> {
    this.logger.log(`User login recorded: ${userId}`);
    // Minimal audit captures: timestamp, userId, success/failure
  }

  /**
   * Document view tracking - performance optimized
   */
  @AuditLog({
    enabled: true,
    logLevel: 'minimal',
    logSuccess: true,
    logFailures: false, // Don't log failed views to reduce noise
    storage: {
      storeInNeo4j: false, // Use external service for high-volume logs
      externalService: 'analytics-service'
    }
  })
  @CypherQuery({
    query: `
      MATCH (d:Document {id: $documentId})
      SET d.viewCount = coalesce(d.viewCount, 0) + 1,
          d.lastViewedAt = datetime()
      RETURN d.title, d.viewCount
    `,
    mode: 'WRITE',
    description: 'Update document view statistics'
  })
  async recordDocumentView(documentId: string): Promise<void> {
    // High-frequency operation with minimal audit overhead
  }
}

/**
 * EXAMPLE 2: STANDARD AUDIT LOGGING
 * 
 * Balanced auditing for business operations
 */
@Injectable()
export class StandardAuditService {
  private readonly logger = new Logger(StandardAuditService.name);

  /**
   * User management with standard audit detail
   */
  @AuditLog({
    enabled: true,
    logLevel: 'standard',
    includeSensitiveData: false, // Exclude sensitive fields
    logSuccess: true,
    logFailures: true,
    customFields: {
      operation: 'user_management',
      category: 'administration',
      riskLevel: 'medium'
    },
    storage: {
      storeInNeo4j: true,
      retentionDays: 365 // 1 year for admin operations
    }
  })
  @CreateEntity(() => ({ 
    username: '', 
    email: '', 
    role: '', 
    departmentId: '',
    isActive: true 
  } as BaseEntity & { 
    username: string; 
    email: string; 
    role: string; 
    departmentId: string; 
    isActive: boolean;
  }))
  async createUser(userData: any): Promise<any> {
    this.logger.log(`Creating user account: ${userData.username}`);
    // Standard audit captures: timestamp, user, operation, parameters (sanitized), result
    return {};
  }

  /**
   * Role assignment with detailed audit trail
   */
  @AuditLog({
    enabled: true,
    logLevel: 'standard',
    customFields: {
      operation: 'role_assignment',
      category: 'security',
      riskLevel: 'high',
      complianceRequired: true
    },
    storage: {
      storeInNeo4j: true,
      retentionDays: 2555 // 7 years for security operations
    }
  })
  @CypherQuery({
    query: `
      MATCH (u:User {id: $userId})
      SET u.role = $newRole,
          u.roleChangedAt = datetime(),
          u.roleChangedBy = $changedBy,
          u.previousRole = u.role
      RETURN u
    `,
    mode: 'WRITE',
    description: 'Update user role assignment'
  })
  async assignRole(userId: string, newRole: string, changedBy: string): Promise<void> {
    this.logger.warn(`Role change: User ${userId} assigned role ${newRole} by ${changedBy}`);
  }

  /**
   * Document modification with change tracking
   */
  @AuditLog({
    enabled: true,
    logLevel: 'standard',
    customFields: {
      operation: 'document_modification',
      category: 'content_management'
    },
    storage: {
      storeInNeo4j: true,
      retentionDays: 1095 // 3 years for document changes
    }
  })
  @UpdateEntity(() => ({ 
    title: '', 
    content: '', 
    version: 1,
    modifiedBy: '' 
  } as BaseEntity & { 
    title: string; 
    content: string; 
    version: number; 
    modifiedBy: string;
  }))
  async updateDocument(documentId: string, updates: any, modifiedBy: string): Promise<any> {
    this.logger.log(`Document updated: ${documentId} by ${modifiedBy}`);
    return {};
  }
}

/**
 * EXAMPLE 3: DETAILED AUDIT LOGGING (COMPLIANCE FOCUSED)
 * 
 * Comprehensive auditing for regulatory compliance
 */
@Injectable()
export class DetailedComplianceAuditService {
  private readonly logger = new Logger(DetailedComplianceAuditService.name);

  /**
   * HIPAA-compliant patient record access
   */
  @AuditLog({
    enabled: true,
    logLevel: 'detailed',
    includeSensitiveData: false, // Never log PHI
    logSuccess: true,
    logFailures: true,
    customFields: {
      operation: 'patient_record_access',
      category: 'healthcare',
      riskLevel: 'high',
      complianceFramework: 'HIPAA',
      dataClassification: 'PHI' // Protected Health Information
    },
    storage: {
      storeInNeo4j: true,
      externalService: 'hipaa-audit-service',
      retentionDays: 2190 // 6 years as required by HIPAA
    }
  })
  @CypherQuery({
    query: `
      MATCH (p:PatientRecord {id: $patientId})
      SET p.lastAccessedAt = datetime(),
          p.accessCount = coalesce(p.accessCount, 0) + 1
      CREATE (access:PatientAccess {
        id: $accessId,
        patientId: $patientId,
        accessedBy: $userId,
        accessedAt: datetime(),
        purpose: $purpose,
        ipAddress: $ipAddress
      })
      RETURN p
    `,
    mode: 'WRITE',
    description: 'Access patient record with HIPAA audit'
  })
  async accessPatientRecord(
    patientId: string, 
    userId: string, 
    purpose: string,
    ipAddress: string
  ): Promise<PatientRecord | null> {
    this.logger.log(`HIPAA Audit: Patient ${patientId} accessed by ${userId} for ${purpose}`);
    // Detailed audit includes: who, what, when, where, why, how
    return null;
  }

  /**
   * SOX-compliant financial transaction processing
   */
  @AuditLog({
    enabled: true,
    logLevel: 'detailed',
    includeSensitiveData: false, // Exclude account numbers in logs
    logSuccess: true,
    logFailures: true,
    customFields: {
      operation: 'financial_transaction',
      category: 'finance',
      riskLevel: 'critical',
      complianceFramework: 'SOX',
      dataClassification: 'financial'
    },
    storage: {
      storeInNeo4j: true,
      externalService: 'sox-audit-service',
      retentionDays: 2555 // 7 years for SOX compliance
    }
  })
  @CreateEntity(() => ({ 
    transactionId: '', 
    amount: 0, 
    currency: 'USD', 
    status: 'pending' 
  } as BaseEntity & { 
    transactionId: string; 
    amount: number; 
    currency: string; 
    status: string;
  }))
  async processFinancialTransaction(transactionData: FinancialTransaction): Promise<any> {
    this.logger.warn(`SOX Audit: Financial transaction ${transactionData.transactionId} for ${transactionData.amount} ${transactionData.currency}`);
    // Detailed audit for financial controls and segregation of duties
    return {};
  }

  /**
   * GDPR-compliant personal data processing
   */
  @AuditLog({
    enabled: true,
    logLevel: 'detailed',
    includeSensitiveData: false, // Never log personal data
    logSuccess: true,
    logFailures: true,
    customFields: {
      operation: 'personal_data_processing',
      category: 'data_protection',
      riskLevel: 'high',
      complianceFramework: 'GDPR',
      dataClassification: 'personal_data',
      legalBasis: 'consent', // GDPR legal basis
      dataSubjectRights: ['access', 'rectification', 'erasure']
    },
    storage: {
      storeInNeo4j: true,
      externalService: 'gdpr-audit-service',
      retentionDays: 1095 // 3 years for GDPR audit logs
    }
  })
  @UpdateEntity(() => ({ 
    email: '', 
    firstName: '', 
    lastName: '', 
    consentGiven: false 
  } as BaseEntity & { 
    email: string; 
    firstName: string; 
    lastName: string; 
    consentGiven: boolean;
  }))
  async updatePersonalData(userId: string, updates: Partial<UserPersonalData>): Promise<any> {
    this.logger.log(`GDPR Audit: Personal data updated for user ${userId}`);
    // GDPR requires tracking: purpose, legal basis, data subject rights
    return {};
  }

  /**
   * PCI-compliant payment data handling
   */
  @AuditLog({
    enabled: true,
    logLevel: 'detailed',
    includeSensitiveData: false, // Never log payment card data
    logSuccess: true,
    logFailures: true,
    customFields: {
      operation: 'payment_processing',
      category: 'payment',
      riskLevel: 'critical',
      complianceFramework: 'PCI-DSS',
      dataClassification: 'cardholder_data'
    },
    storage: {
      storeInNeo4j: true,
      externalService: 'pci-audit-service',
      retentionDays: 365 // 1 year for PCI audit logs
    }
  })
  @CypherQuery({
    query: `
      CREATE (payment:PaymentTransaction {
        id: $paymentId,
        merchantId: $merchantId,
        amount: $amount,
        currency: $currency,
        status: 'processing',
        processedAt: datetime(),
        // No cardholder data stored in clear text
        tokenReference: $tokenReference
      })
      RETURN payment
    `,
    mode: 'WRITE',
    description: 'Process payment with PCI compliance audit'
  })
  async processPayment(
    paymentId: string,
    merchantId: string,
    amount: number,
    currency: string,
    tokenReference: string
  ): Promise<any> {
    this.logger.warn(`PCI Audit: Payment ${paymentId} processed for ${amount} ${currency}`);
    // PCI requires secure handling and audit of all cardholder data interactions
    return {};
  }
}

/**
 * EXAMPLE 4: FULL AUDIT LOGGING (FORENSIC ANALYSIS)
 * 
 * Maximum detail auditing for security investigations
 */
@Injectable()
export class ForensicAuditService {
  private readonly logger = new Logger(ForensicAuditService.name);

  /**
   * Security incident with full forensic audit
   */
  @AuditLog({
    enabled: true,
    logLevel: 'full',
    includeSensitiveData: true, // Include for forensic analysis
    logSuccess: true,
    logFailures: true,
    customFields: {
      operation: 'security_incident_response',
      category: 'security',
      riskLevel: 'critical',
      forensicAnalysis: true,
      incidentSeverity: 'high'
    },
    storage: {
      storeInNeo4j: true,
      externalService: 'security-siem',
      retentionDays: 3650 // 10 years for security incidents
    }
  })
  @CypherQuery({
    query: `
      CREATE (incident:SecurityIncident {
        id: $incidentId,
        type: $incidentType,
        severity: $severity,
        description: $description,
        affectedUsers: $affectedUsers,
        detectedAt: datetime(),
        reportedBy: $reportedBy,
        status: 'investigating',
        forensicData: $forensicData
      })
      RETURN incident
    `,
    mode: 'WRITE',
    description: 'Create security incident with full audit'
  })
  async reportSecurityIncident(
    incidentId: string,
    incidentType: string,
    severity: string,
    description: string,
    affectedUsers: string[],
    reportedBy: string,
    forensicData: any
  ): Promise<any> {
    this.logger.error(`SECURITY INCIDENT: ${incidentType} - ${severity} - ${description}`);
    // Full audit captures complete execution context, stack traces, system state
    return {};
  }

  /**
   * Administrative action with complete audit trail
   */
  @AuditLog({
    enabled: true,
    logLevel: 'full',
    includeSensitiveData: false,
    logSuccess: true,
    logFailures: true,
    customFields: {
      operation: 'administrative_action',
      category: 'system_administration',
      riskLevel: 'high',
      requiresApproval: true
    },
    storage: {
      storeInNeo4j: true,
      externalService: 'admin-audit-service',
      retentionDays: 1825 // 5 years for admin actions
    }
  })
  @CypherQuery({
    query: `
      MATCH (u:User {id: $targetUserId})
      SET u.status = $newStatus,
          u.statusChangedAt = datetime(),
          u.statusChangedBy = $adminUserId,
          u.statusChangeReason = $reason
      CREATE (audit:AdminAction {
        id: $auditId,
        action: 'user_status_change',
        targetUserId: $targetUserId,
        adminUserId: $adminUserId,
        previousStatus: u.status,
        newStatus: $newStatus,
        reason: $reason,
        approvedBy: $approvedBy,
        executedAt: datetime()
      })
      RETURN u, audit
    `,
    mode: 'WRITE',
    description: 'Administrative user status change with full audit'
  })
  async changeUserStatus(
    targetUserId: string,
    newStatus: string,
    adminUserId: string,
    reason: string,
    approvedBy: string
  ): Promise<any> {
    this.logger.warn(`ADMIN ACTION: User ${targetUserId} status changed to ${newStatus} by ${adminUserId}`);
    // Full audit includes complete parameter logging, execution context, approvals
    return {};
  }

  /**
   * Data deletion with complete forensic tracking
   */
  @AuditLog({
    enabled: true,
    logLevel: 'full',
    includeSensitiveData: false, // Don't log deleted data
    logSuccess: true,
    logFailures: true,
    customFields: {
      operation: 'data_deletion',
      category: 'data_management',
      riskLevel: 'critical',
      irreversibleAction: true,
      complianceFramework: 'GDPR', // Right to erasure
      legalBasis: 'data_subject_request'
    },
    storage: {
      storeInNeo4j: true,
      externalService: 'forensic-audit-service',
      retentionDays: 3650 // 10 years for deletion records
    }
  })
  @DeleteEntity(() => ({ 
    email: '', 
    firstName: '', 
    lastName: '' 
  } as BaseEntity & { 
    email: string; 
    firstName: string; 
    lastName: string;
  }), { detach: true })
  async deleteUserData(
    userId: string,
    deletionReason: string,
    requestedBy: string,
    approvedBy: string
  ): Promise<boolean> {
    this.logger.error(`DATA DELETION: User ${userId} data deleted. Reason: ${deletionReason}`);
    // Full forensic audit before irreversible data deletion
    return false;
  }
}

/**
 * EXAMPLE 5: PERFORMANCE-OPTIMIZED AUDIT LOGGING
 * 
 * High-volume operations with efficient audit strategies
 */
@Injectable()
export class PerformanceOptimizedAuditService {
  private readonly logger = new Logger(PerformanceOptimizedAuditService.name);

  /**
   * High-frequency API calls with batch audit logging
   */
  @AuditLog({
    enabled: true,
    logLevel: 'minimal',
    logSuccess: false, // Don't log successful API calls to reduce volume
    logFailures: true,  // Only log failures for monitoring
    storage: {
      storeInNeo4j: false, // Use high-performance external service
      externalService: 'time-series-audit-db',
      retentionDays: 30 // Short retention for high-volume logs
    }
  })
  @CypherQuery({
    query: `
      MATCH (data:ApiData {key: $key})
      RETURN data
      LIMIT 1
    `,
    mode: 'READ',
    description: 'High-frequency data access'
  })
  async getApiData(key: string): Promise<any> {
    // High-volume operation with minimal audit overhead
    return {};
  }

  /**
   * Bulk operations with aggregated audit logging
   */
  @AuditLog({
    enabled: true,
    logLevel: 'standard',
    customFields: {
      operation: 'bulk_operation',
      category: 'batch_processing'
    },
    storage: {
      storeInNeo4j: true,
      retentionDays: 365
    }
  })
  @CypherQuery({
    query: `
      UNWIND $records as record
      CREATE (n:BulkProcessedRecord {
        id: record.id,
        data: record.data,
        processedAt: datetime(),
        batchId: $batchId
      })
      RETURN count(n) as recordsCreated
    `,
    mode: 'WRITE',
    description: 'Bulk record processing with batch audit'
  })
  async processBulkRecords(records: any[], batchId: string): Promise<number> {
    this.logger.log(`Processing bulk batch ${batchId} with ${records.length} records`);
    // Single audit entry for entire batch operation
    return 0;
  }

  /**
   * Real-time monitoring with sampling-based audit
   */
  @AuditLog({
    enabled: true,
    logLevel: 'minimal',
    customFields: {
      operation: 'real_time_monitoring',
      samplingRate: 0.1 // Log 10% of operations
    },
    storage: {
      storeInNeo4j: false,
      externalService: 'monitoring-service'
    }
  })
  @CypherQuery({
    query: `
      MATCH (metrics:SystemMetrics)
      WHERE metrics.timestamp >= datetime() - duration('PT5M')
      RETURN metrics
      ORDER BY metrics.timestamp DESC
      LIMIT 100
    `,
    mode: 'READ',
    description: 'Real-time system monitoring'
  })
  async getSystemMetrics(): Promise<any[]> {
    // Sampled audit logging for high-frequency monitoring
    return [];
  }
}

/**
 * EXAMPLE 6: CUSTOM AUDIT FIELDS AND METADATA
 * 
 * Advanced audit logging with business-specific metadata
 */
@Injectable()
export class CustomAuditFieldsService {
  private readonly logger = new Logger(CustomAuditFieldsService.name);

  /**
   * Contract management with custom audit metadata
   */
  @AuditLog({
    enabled: true,
    logLevel: 'detailed',
    customFields: {
      operation: 'contract_management',
      category: 'legal',
      businessUnit: 'sales',
      contractValue: 'high', // Will be overridden with actual value
      riskAssessment: 'required',
      approvalWorkflow: 'multi-level',
      documentRetention: '7-years',
      complianceFrameworks: ['SOX', 'GDPR'],
      auditTrail: 'required'
    },
    storage: {
      storeInNeo4j: true,
      externalService: 'contract-audit-service',
      retentionDays: 2555 // 7 years
    }
  })
  @CreateEntity(() => ({ 
    contractNumber: '', 
    clientName: '', 
    value: 0, 
    status: 'draft' 
  } as BaseEntity & { 
    contractNumber: string; 
    clientName: string; 
    value: number; 
    status: string;
  }))
  async createContract(
    contractData: any,
    salesRepId: string,
    approvalLevel: string
  ): Promise<any> {
    this.logger.log(`Contract created: ${contractData.contractNumber} for ${contractData.clientName}`);
    
    // Custom audit fields can include business context
    const customAuditContext = {
      salesRepId,
      approvalLevel,
      contractValue: contractData.value,
      riskLevel: contractData.value > 100000 ? 'high' : 'medium',
      territoryId: contractData.territoryId,
      productCategories: contractData.products?.map((p: any) => p.category)
    };
    
    return {};
  }

  /**
   * Regulatory filing with comprehensive audit metadata
   */
  @AuditLog({
    enabled: true,
    logLevel: 'full',
    customFields: {
      operation: 'regulatory_filing',
      category: 'compliance',
      regulatoryBody: 'SEC', // Securities and Exchange Commission
      filingType: '10-K',
      filingPeriod: 'annual',
      materialEvents: [],
      executiveApprovals: [],
      externalAuditorReview: 'required',
      publicDisclosure: true,
      investorImpact: 'material'
    },
    storage: {
      storeInNeo4j: true,
      externalService: 'regulatory-audit-service',
      retentionDays: 3650 // 10 years for regulatory filings
    }
  })
  @CypherQuery({
    query: `
      CREATE (filing:RegulatoryFiling {
        id: $filingId,
        type: $filingType,
        period: $period,
        submittedAt: datetime(),
        submittedBy: $submittedBy,
        status: 'submitted',
        confirmationNumber: $confirmationNumber,
        metadata: $metadata
      })
      RETURN filing
    `,
    mode: 'WRITE',
    description: 'Submit regulatory filing with audit'
  })
  async submitRegulatoryFiling(
    filingData: any,
    submittedBy: string,
    executiveApprovals: string[]
  ): Promise<any> {
    this.logger.warn(`REGULATORY FILING: ${filingData.type} submitted by ${submittedBy}`);
    
    // Rich audit metadata for regulatory compliance
    const auditMetadata = {
      filingType: filingData.type,
      reportingPeriod: filingData.period,
      executiveApprovals,
      materialEvents: filingData.materialEvents,
      financialStatements: filingData.includesFinancials,
      auditFirmReview: filingData.auditorReview,
      boardApprovalDate: filingData.boardApprovalDate
    };
    
    return {};
  }
}

/**
 * EXPORT ALL AUDIT LOGGING EXAMPLES
 * 
 * These services demonstrate:
 * ✓ Multi-level audit detail (minimal, standard, detailed, full)
 * ✓ Compliance-specific audit logging (HIPAA, SOX, GDPR, PCI)
 * ✓ Neo4j-based audit storage patterns
 * ✓ External audit service integration
 * ✓ Performance-optimized audit strategies
 * ✓ Custom audit fields and business metadata
 * ✓ Forensic analysis support
 * ✓ Regulatory compliance audit trails
 * 
 * Compliance features covered:
 * ✓ HIPAA (Healthcare) - 6 year retention
 * ✓ SOX (Financial) - 7 year retention  
 * ✓ GDPR (Privacy) - 3 year retention
 * ✓ PCI-DSS (Payment) - 1 year retention
 * ✓ Regulatory filings - 10 year retention
 * ✓ Security incidents - 10 year retention
 * ✓ Administrative actions - 5 year retention
 * ✓ High-volume operations - 30 day retention
 */
export type { PatientRecord, FinancialTransaction, UserPersonalData };
export { MinimalAuditService, StandardAuditService, DetailedComplianceAuditService, ForensicAuditService, PerformanceOptimizedAuditService, CustomAuditFieldsService };