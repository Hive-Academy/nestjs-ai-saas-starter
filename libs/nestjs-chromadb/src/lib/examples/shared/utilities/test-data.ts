/**
 * @fileoverview Test Data Utilities for ChromaDB Examples
 * 
 * Provides comprehensive test data sets for different use cases and examples.
 * All data is deterministic and safe for automated testing.
 */

import { 
  KnowledgeDocument, 
  ProductDocument, 
  SupportDocument, 
  ResearchDocument,
  TenantDocument,
  DocumentFactory 
} from '../entities/document.entity';

/**
 * Knowledge base test data
 */
export const KNOWLEDGE_BASE_DATA: KnowledgeDocument[] = [
  DocumentFactory.createKnowledgeDocument({
    id: 'kb-001',
    title: 'Getting Started with Vector Databases',
    content: 'Vector databases are specialized databases designed to store and query high-dimensional vectors. They are essential for semantic search, recommendation systems, and AI applications.',
    category: 'database',
    tags: ['vector-database', 'getting-started', 'ai'],
    author: 'Technical Writer',
    metadata: {
      source: 'manual',
      confidence: 0.98,
      language: 'en',
      wordCount: 35,
    }
  }),
  DocumentFactory.createKnowledgeDocument({
    id: 'kb-002',
    title: 'Understanding Embeddings and Similarity Search',
    content: 'Embeddings are numerical representations of data that capture semantic meaning. Similarity search uses these embeddings to find related content based on semantic similarity rather than exact keyword matches.',
    category: 'ai',
    tags: ['embeddings', 'similarity-search', 'machine-learning'],
    author: 'ML Engineer',
    metadata: {
      source: 'manual',
      confidence: 0.97,
      language: 'en',
      wordCount: 32,
    }
  }),
  DocumentFactory.createKnowledgeDocument({
    id: 'kb-003',
    title: 'Best Practices for Document Preprocessing',
    content: 'Effective document preprocessing is crucial for optimal vector search performance. This includes text cleaning, chunking strategies, metadata extraction, and embedding generation techniques.',
    category: 'best-practices',
    tags: ['preprocessing', 'text-processing', 'optimization'],
    author: 'Data Scientist',
    metadata: {
      source: 'manual',
      confidence: 0.95,
      language: 'en',
      wordCount: 26,
    }
  }),
];

/**
 * E-commerce product test data
 */
export const PRODUCT_CATALOG_DATA: ProductDocument[] = [
  DocumentFactory.createProductDocument({
    id: 'product-001',
    title: 'Wireless Bluetooth Headphones',
    content: 'Premium wireless Bluetooth headphones with active noise cancellation, 30-hour battery life, and superior sound quality. Perfect for music lovers and professionals.',
    category: 'electronics',
    subcategory: 'audio',
    brand: 'AudioPro',
    price: 199.99,
    inStock: true,
    metadata: {
      sku: 'AP-BT-001',
      weight: 0.3,
      dimensions: { length: 18, width: 16, height: 8 },
      ratings: { average: 4.7, count: 2341 },
      features: ['bluetooth-5.0', 'noise-cancellation', 'long-battery', 'foldable'],
    }
  }),
  DocumentFactory.createProductDocument({
    id: 'product-002',
    title: 'Smart Fitness Tracker',
    content: 'Advanced fitness tracker with heart rate monitoring, GPS tracking, sleep analysis, and smartphone integration. Water-resistant design for all activities.',
    category: 'electronics',
    subcategory: 'wearables',
    brand: 'FitTech',
    price: 149.99,
    inStock: true,
    metadata: {
      sku: 'FT-TRACK-002',
      weight: 0.05,
      dimensions: { length: 4, width: 2, height: 1 },
      ratings: { average: 4.3, count: 892 },
      features: ['heart-rate', 'gps', 'waterproof', 'smartphone-sync'],
    }
  }),
  DocumentFactory.createProductDocument({
    id: 'product-003',
    title: 'Ergonomic Office Chair',
    content: 'Professional ergonomic office chair with lumbar support, adjustable height, and breathable mesh fabric. Designed for long work sessions and optimal comfort.',
    category: 'furniture',
    subcategory: 'office',
    brand: 'ErgoMax',
    price: 299.99,
    inStock: false,
    metadata: {
      sku: 'EM-CHAIR-003',
      weight: 15.5,
      dimensions: { length: 60, width: 60, height: 120 },
      ratings: { average: 4.5, count: 567 },
      features: ['ergonomic', 'adjustable', 'lumbar-support', 'breathable'],
    }
  }),
];

/**
 * Customer support documentation test data
 */
export const SUPPORT_DOCUMENTATION_DATA: SupportDocument[] = [
  DocumentFactory.createSupportDocument({
    id: 'support-001',
    title: 'How to Reset Your Password',
    content: 'To reset your password: 1) Go to the login page, 2) Click "Forgot Password", 3) Enter your email address, 4) Check your email for reset instructions, 5) Follow the link and create a new password.',
    category: 'howto',
    priority: 'medium',
    department: 'user-support',
    metadata: {
      lastReviewed: new Date('2024-01-15'),
      helpfulness: 4.8,
      views: 15420,
      relatedTickets: ['TICK-001', 'TICK-045'],
      keywords: ['password', 'reset', 'login', 'account'],
    }
  }),
  DocumentFactory.createSupportDocument({
    id: 'support-002',
    title: 'Troubleshooting Connection Issues',
    content: 'If you experience connection problems: 1) Check your internet connection, 2) Clear browser cache and cookies, 3) Disable browser extensions, 4) Try a different browser, 5) Contact support if issues persist.',
    category: 'troubleshooting',
    priority: 'high',
    department: 'technical-support',
    metadata: {
      lastReviewed: new Date('2024-01-20'),
      helpfulness: 4.2,
      views: 8930,
      relatedTickets: ['TICK-012', 'TICK-034', 'TICK-067'],
      keywords: ['connection', 'troubleshooting', 'browser', 'cache'],
    }
  }),
  DocumentFactory.createSupportDocument({
    id: 'support-003',
    title: 'Data Privacy and GDPR Compliance',
    content: 'Our platform complies with GDPR regulations. Users have the right to access, modify, and delete their personal data. We implement encryption, access controls, and regular security audits to protect user information.',
    category: 'policy',
    priority: 'critical',
    department: 'legal-compliance',
    metadata: {
      lastReviewed: new Date('2024-02-01'),
      helpfulness: 4.9,
      views: 3420,
      relatedTickets: [],
      keywords: ['gdpr', 'privacy', 'compliance', 'data-protection'],
    }
  }),
];

/**
 * Research paper test data
 */
export const RESEARCH_PAPERS_DATA: ResearchDocument[] = [
  DocumentFactory.createResearchDocument({
    id: 'research-001',
    title: 'Efficient Vector Similarity Search in High-Dimensional Spaces',
    content: 'This paper presents novel approaches to vector similarity search optimization, focusing on indexing strategies and query performance in high-dimensional embedding spaces.',
    authors: ['Dr. Alice Chen', 'Dr. Bob Wilson', 'Dr. Carol Martinez'],
    journal: 'IEEE Transactions on Data Engineering',
    publishedYear: 2024,
    doi: '10.1109/TDE.2024.001',
    metadata: {
      citationCount: 45,
      subjects: ['information-retrieval', 'database-systems', 'machine-learning'],
      methodology: ['experimental', 'theoretical'],
      datasetSize: 1000000,
      peerReviewed: true,
      openAccess: false,
    }
  }),
  DocumentFactory.createResearchDocument({
    id: 'research-002',
    title: 'Semantic Search Applications in Enterprise Knowledge Management',
    content: 'An empirical study on implementing semantic search systems in enterprise environments, analyzing user satisfaction, search accuracy, and system adoption patterns.',
    authors: ['Dr. David Kumar', 'Dr. Eva Rodriguez'],
    journal: 'ACM Computing Surveys',
    publishedYear: 2023,
    doi: '10.1145/ACM.2023.002',
    metadata: {
      citationCount: 123,
      subjects: ['human-computer-interaction', 'enterprise-systems', 'information-retrieval'],
      methodology: ['empirical', 'case-study'],
      datasetSize: 50000,
      peerReviewed: true,
      openAccess: true,
    }
  }),
];

/**
 * Multi-tenant test data
 */
export const MULTI_TENANT_DATA: TenantDocument[] = [
  DocumentFactory.createTenantDocument({
    id: 'tenant-001',
    tenantId: 'acme-corp',
    title: 'ACME Corp Internal Policy Document',
    content: 'Internal company policy regarding remote work guidelines, communication protocols, and performance evaluation criteria.',
    visibility: 'private',
    metadata: {
      tenantMetadata: {
        organizationId: 'acme-corp-123',
        departmentId: 'hr-dept',
        userId: 'manager-001',
      },
      accessLevel: 'admin',
      sharePermissions: ['hr-team', 'executives'],
    }
  }),
  DocumentFactory.createTenantDocument({
    id: 'tenant-002',
    tenantId: 'tech-startup',
    title: 'Product Development Roadmap',
    content: 'Quarterly product development roadmap including feature priorities, technical requirements, and resource allocation for the upcoming release cycle.',
    visibility: 'shared',
    metadata: {
      tenantMetadata: {
        organizationId: 'tech-startup-456',
        departmentId: 'product-dept',
        userId: 'pm-002',
      },
      accessLevel: 'write',
      sharePermissions: ['product-team', 'engineering-team'],
    }
  }),
];

/**
 * Test data collections organized by use case
 */
export const TEST_DATA_COLLECTIONS = {
  knowledgeBase: KNOWLEDGE_BASE_DATA,
  productCatalog: PRODUCT_CATALOG_DATA,
  supportDocs: SUPPORT_DOCUMENTATION_DATA,
  researchPapers: RESEARCH_PAPERS_DATA,
  multiTenant: MULTI_TENANT_DATA,
  
  // Combined collections for comprehensive testing
  allDocuments: [
    ...KNOWLEDGE_BASE_DATA,
    ...PRODUCT_CATALOG_DATA,
    ...SUPPORT_DOCUMENTATION_DATA,
    ...RESEARCH_PAPERS_DATA,
    ...MULTI_TENANT_DATA,
  ],
  
  // Filtered collections
  getByCategory: (category: string) => {
    return TEST_DATA_COLLECTIONS.allDocuments.filter(doc => 
      'category' in doc && doc.category === category
    );
  },
  
  getByTenant: (tenantId: string) => {
    return MULTI_TENANT_DATA.filter(doc => doc.tenantId === tenantId);
  },
  
  getPublicDocuments: () => {
    return TEST_DATA_COLLECTIONS.allDocuments.filter(doc => 
      !('visibility' in doc) || (doc as any).visibility === 'public'
    );
  },
};

/**
 * Collection configurations for different test scenarios
 */
export const TEST_COLLECTIONS = {
  basic: {
    name: 'basic-example-collection',
    data: KNOWLEDGE_BASE_DATA.slice(0, 2),
    metadata: { purpose: 'basic-examples', environment: 'test' }
  },
  
  advanced: {
    name: 'advanced-example-collection',
    data: TEST_DATA_COLLECTIONS.allDocuments.slice(0, 10),
    metadata: { purpose: 'advanced-examples', environment: 'test' }
  },
  
  performance: {
    name: 'performance-test-collection',
    data: Array.from({ length: 100 }, (_, i) => 
      DocumentFactory.createKnowledgeDocument({
        id: `perf-${i}`,
        title: `Performance Test Document ${i}`,
        content: `This is performance test document number ${i} with content for testing search and retrieval performance.`,
      })
    ),
    metadata: { purpose: 'performance-testing', environment: 'test' }
  },
  
  multiTenant: {
    name: 'multi-tenant-collection',
    data: MULTI_TENANT_DATA,
    metadata: { purpose: 'multi-tenant-examples', environment: 'test' }
  },
};