/**
 * @fileoverview Document Entity for ChromaDB Examples
 * 
 * Shared document entity used across all ChromaDB examples.
 * Provides type-safe document structures for consistent usage.
 */

/**
 * Base document interface for all ChromaDB examples
 */
export interface BaseExampleDocument {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
}

/**
 * Knowledge base document for advanced examples
 */
export interface KnowledgeDocument extends BaseExampleDocument {
  title: string;
  content: string;
  category: string;
  tags: string[];
  author?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  metadata: {
    source: 'manual' | 'imported' | 'generated';
    confidence: number;
    language: string;
    wordCount: number;
    [key: string]: unknown;
  };
}

/**
 * Product document for e-commerce examples
 */
export interface ProductDocument extends BaseExampleDocument {
  title: string;
  content: string; // product description
  category: string;
  subcategory: string;
  brand: string;
  price: number;
  inStock: boolean;
  metadata: {
    sku: string;
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    ratings: {
      average: number;
      count: number;
    };
    features: string[];
    [key: string]: unknown;
  };
}

/**
 * Customer support document for RAG examples
 */
export interface SupportDocument extends BaseExampleDocument {
  title: string;
  content: string;
  category: 'faq' | 'troubleshooting' | 'howto' | 'policy';
  priority: 'low' | 'medium' | 'high' | 'critical';
  department: string;
  metadata: {
    lastReviewed: Date;
    helpfulness: number;
    views: number;
    relatedTickets: string[];
    keywords: string[];
    [key: string]: unknown;
  };
}

/**
 * Research paper document for academic examples
 */
export interface ResearchDocument extends BaseExampleDocument {
  title: string;
  content: string; // abstract or full text
  authors: string[];
  journal: string;
  publishedYear: number;
  doi?: string;
  metadata: {
    citationCount: number;
    subjects: string[];
    methodology: string[];
    datasetSize?: number;
    peerReviewed: boolean;
    openAccess: boolean;
    [key: string]: unknown;
  };
}

/**
 * Multi-tenant document for tenant isolation examples
 */
export interface TenantDocument extends BaseExampleDocument {
  tenantId: string;
  title: string;
  content: string;
  visibility: 'private' | 'shared' | 'public';
  metadata: {
    tenantMetadata: {
      organizationId: string;
      departmentId: string;
      userId: string;
    };
    accessLevel: 'read' | 'write' | 'admin';
    sharePermissions: string[];
    [key: string]: unknown;
  };
}

/**
 * Document type union for polymorphic examples
 */
export type ExampleDocument = 
  | BaseExampleDocument 
  | KnowledgeDocument 
  | ProductDocument 
  | SupportDocument 
  | ResearchDocument 
  | TenantDocument;

/**
 * Document type guard utilities
 */
export const DocumentTypeGuards = {
  isKnowledgeDocument: (doc: ExampleDocument): doc is KnowledgeDocument => {
    return 'title' in doc && 'category' in doc && 'tags' in doc;
  },
  
  isProductDocument: (doc: ExampleDocument): doc is ProductDocument => {
    return 'title' in doc && 'brand' in doc && 'price' in doc;
  },
  
  isSupportDocument: (doc: ExampleDocument): doc is SupportDocument => {
    return 'title' in doc && 'category' in doc && 
           ['faq', 'troubleshooting', 'howto', 'policy'].includes((doc as any).category);
  },
  
  isResearchDocument: (doc: ExampleDocument): doc is ResearchDocument => {
    return 'authors' in doc && 'journal' in doc && 'publishedYear' in doc;
  },
  
  isTenantDocument: (doc: ExampleDocument): doc is TenantDocument => {
    return 'tenantId' in doc && 'visibility' in doc;
  }
};

/**
 * Document factory utilities for generating test data
 */
export const DocumentFactory = {
  createKnowledgeDocument: (overrides: Partial<KnowledgeDocument> = {}): KnowledgeDocument => ({
    id: `knowledge-${Date.now()}`,
    title: 'Sample Knowledge Article',
    content: 'This is a sample knowledge base article for demonstration purposes.',
    category: 'general',
    tags: ['sample', 'demo'],
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    metadata: {
      source: 'manual',
      confidence: 0.95,
      language: 'en',
      wordCount: 12,
    },
    ...overrides,
  }),
  
  createProductDocument: (overrides: Partial<ProductDocument> = {}): ProductDocument => ({
    id: `product-${Date.now()}`,
    title: 'Sample Product',
    content: 'High-quality sample product with excellent features and competitive pricing.',
    category: 'electronics',
    subcategory: 'accessories',
    brand: 'SampleBrand',
    price: 99.99,
    inStock: true,
    metadata: {
      sku: 'SAMPLE-001',
      weight: 0.5,
      dimensions: { length: 10, width: 5, height: 2 },
      ratings: { average: 4.5, count: 128 },
      features: ['durable', 'lightweight', 'versatile'],
    },
    ...overrides,
  }),
  
  createSupportDocument: (overrides: Partial<SupportDocument> = {}): SupportDocument => ({
    id: `support-${Date.now()}`,
    title: 'How to Use Sample Feature',
    content: 'Step-by-step guide on using the sample feature effectively.',
    category: 'howto',
    priority: 'medium',
    department: 'technical-support',
    metadata: {
      lastReviewed: new Date(),
      helpfulness: 4.2,
      views: 1542,
      relatedTickets: [],
      keywords: ['guide', 'tutorial', 'howto'],
    },
    ...overrides,
  }),
  
  createResearchDocument: (overrides: Partial<ResearchDocument> = {}): ResearchDocument => ({
    id: `research-${Date.now()}`,
    title: 'Sample Research Paper',
    content: 'Abstract of a sample research paper demonstrating vector similarity search capabilities.',
    authors: ['Dr. Jane Smith', 'Dr. John Doe'],
    journal: 'Journal of Sample Research',
    publishedYear: 2024,
    doi: '10.1000/sample.2024.001',
    metadata: {
      citationCount: 15,
      subjects: ['computer-science', 'machine-learning'],
      methodology: ['experimental', 'quantitative'],
      datasetSize: 10000,
      peerReviewed: true,
      openAccess: true,
    },
    ...overrides,
  }),
  
  createTenantDocument: (overrides: Partial<TenantDocument> = {}): TenantDocument => ({
    id: `tenant-${Date.now()}`,
    tenantId: 'tenant-sample',
    title: 'Tenant-Specific Document',
    content: 'This document belongs to a specific tenant and demonstrates multi-tenancy.',
    visibility: 'private',
    metadata: {
      tenantMetadata: {
        organizationId: 'org-123',
        departmentId: 'dept-456',
        userId: 'user-789',
      },
      accessLevel: 'write',
      sharePermissions: [],
    },
    ...overrides,
  }),
};