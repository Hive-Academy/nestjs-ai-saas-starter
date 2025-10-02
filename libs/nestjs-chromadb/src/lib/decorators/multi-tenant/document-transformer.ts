/**
 * @fileoverview Document Array Transformer
 * Extracted from tenant-transformation.ts for better architecture compliance
 */

import { Logger } from '@nestjs/common';
import type {
  TenantContext,
  TenantIsolationConfig,
} from '../../services/multi-tenant/tenant-context.service';
import type {
  ArgumentTransformer,
  ArgumentTransformationResult,
} from './transformation-types';

/**
 * Document array transformer for tenant metadata injection
 */
export class DocumentArrayTransformer implements ArgumentTransformer {
  readonly name = 'document-array';
  readonly priority = 75;
  private readonly logger = new Logger(DocumentArrayTransformer.name);

  canTransform(value: unknown, index: number): boolean {
    return Array.isArray(value) && this.isDocumentArray(value);
  }

  transform(
    value: unknown,
    index: number,
    tenantContext: TenantContext,
    config: TenantIsolationConfig
  ): ArgumentTransformationResult {
    const documents = value as unknown[];
    const transformedDocuments: unknown[] = [];
    let transformedCount = 0;
    const metadata: Record<string, unknown> = {
      originalCount: documents.length,
    };

    try {
      for (const doc of documents) {
        const transformedDoc = this.transformDocument(
          doc,
          tenantContext,
          config
        );
        transformedDocuments.push(transformedDoc.document);
        if (transformedDoc.wasTransformed) {
          transformedCount++;
        }
      }

      metadata.transformedCount = transformedCount;
      metadata.transformedDocuments = transformedCount;

      this.logger.debug(
        `Transformed ${transformedCount}/${documents.length} documents for tenant ${tenantContext.tenantId}`
      );

      return {
        originalValue: value,
        transformedValue: transformedDocuments,
        wasTransformed: transformedCount > 0,
        transformationType: this.name,
        metadata,
      };
    } catch (error) {
      this.logger.error(
        `Document array transformation failed for tenant ${tenantContext.tenantId}:`,
        error
      );

      return {
        originalValue: value,
        transformedValue: value,
        wasTransformed: false,
        transformationType: this.name,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Check if array contains document-like objects
   */
  private isDocumentArray(value: unknown[]): boolean {
    if (value.length === 0) {
      return false;
    }

    // Check first few items to see if they look like documents
    const sampleSize = Math.min(3, value.length);
    const samples = value.slice(0, sampleSize);

    return samples.some((item) => this.isDocumentLike(item));
  }

  /**
   * Check if item looks like a document
   */
  private isDocumentLike(item: unknown): boolean {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return false;
    }

    const obj = item as Record<string, unknown>;

    // Documents typically have content or text fields
    const contentFields = ['content', 'text', 'document', 'body', 'message'];
    const hasContent = contentFields.some((field) => field in obj);

    // Or they have metadata-like structure
    const metadataFields = ['id', 'metadata', 'embedding', 'vector'];
    const hasMetadata = metadataFields.some((field) => field in obj);

    return hasContent || hasMetadata;
  }

  /**
   * Transform a single document
   */
  private transformDocument(
    doc: unknown,
    tenantContext: TenantContext,
    config: TenantIsolationConfig
  ): { document: unknown; wasTransformed: boolean } {
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
      return { document: doc, wasTransformed: false };
    }

    const document = { ...(doc as Record<string, unknown>) };
    let wasTransformed = false;

    // Inject tenant metadata
    if (config.injectTenantMetadata !== false) {
      const tenantField = config.metadataFields?.tenantId || 'tenantId';

      // Ensure metadata object exists
      if (!document.metadata || typeof document.metadata !== 'object') {
        document.metadata = {};
      }

      const metadata = document.metadata as Record<string, unknown>;

      // Add tenant ID if not already present
      if (!(tenantField in metadata)) {
        metadata[tenantField] = tenantContext.tenantId;
        wasTransformed = true;
      }

      // Add tenant context fields if configured
      if (config.metadataFields?.tenantName && tenantContext.tenantName) {
        const tenantNameField = config.metadataFields.tenantName;
        if (!(tenantNameField in metadata)) {
          metadata[tenantNameField] = tenantContext.tenantName;
          wasTransformed = true;
        }
      }

      if (
        config.metadataFields?.organizationId &&
        tenantContext.organizationId
      ) {
        const orgField = config.metadataFields.organizationId;
        if (!(orgField in metadata)) {
          metadata[orgField] = tenantContext.organizationId;
          wasTransformed = true;
        }
      }
    }

    // Add tenant prefix to document content if configured
    if (config.documentFiltering === 'content_prefix' && document.content) {
      const content = String(document.content);
      const tenantPrefix = `[TENANT:${tenantContext.tenantId}]`;

      if (!content.startsWith(tenantPrefix)) {
        document.content = `${tenantPrefix} ${content}`;
        wasTransformed = true;
      }
    }

    return { document, wasTransformed };
  }
}
