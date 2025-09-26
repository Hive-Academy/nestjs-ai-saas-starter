/**
 * @fileoverview Auditable Product Entity - Enterprise Audit & Constraints
 *
 * This entity demonstrates:
 * - @Neo4jEntity.Auditable with comprehensive audit logging
 * - Full constraint decorator usage (@Unique, @Index, @NotNull, @Validate)
 * - Complex business validation logic
 * - Multi-tenant product management
 * - Enterprise inventory tracking
 *
 * Complexity Level: ENTERPRISE
 * Decorators Used: 10+ constraint and audit decorators
 */

import {
  Neo4jEntity,
  Neo4jProp,
  Id,
  CreatedAt,
  UpdatedAt,
  JsonProperty,
  PropUnique,
  PropIndex,
  NotNull,
  Validate,
  Neo4jRelationship,
} from '../../../../../index';

/**
 * Auditable Product entity for enterprise inventory management
 *
 * Features:
 * - ✅ Full audit trail for compliance
 * - ✅ Complex constraint validation
 * - ✅ Business rule validation
 * - ✅ Multi-tenant product catalog
 * - ✅ Inventory tracking with thresholds
 */
@Neo4jEntity.Auditable('AuditableProduct', {
  description: 'Enterprise product with full audit trail and constraints',
  tags: ['enterprise', 'product', 'auditable', 'inventory'],
  constraints: {
    unique: [['sku', 'tenantId'], ['barcode'], ['productCode']],
    index: ['name', 'category', 'brand', 'status', 'tenantId', 'createdBy'],
    key: [['sku', 'tenantId']] // Node key constraint for compound uniqueness
  }
})
export class AuditableProduct {
  @Id()
  id: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  name: string;

  @Neo4jProp()
  description?: string;

  @Neo4jProp()
  @NotNull()
  @Validate({
    validation: {
      custom: {
        validator: (price: number) => price > 0,
        message: 'Product price must be greater than 0'
      }
    }
  })
  price: number;

  @Neo4jProp()
  @PropIndex()
  @NotNull()
  category: string;

  @Neo4jProp()
  @PropIndex()
  brand?: string;

  @Neo4jProp()
  @PropUnique()
  @NotNull()
  sku: string; // Stock Keeping Unit

  @Neo4jProp()
  @PropUnique()
  barcode?: string; // Universal Product Code

  @Neo4jProp()
  @PropUnique()
  productCode?: string; // Internal product code

  @Neo4jProp()
  @PropIndex()
  @NotNull()
  tenantId: string; // Multi-tenant isolation

  @Neo4jProp()
  @PropIndex()
  status: 'active' | 'discontinued' | 'draft' | 'archived';

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (quantity: number) => quantity >= 0,
        message: 'Stock quantity cannot be negative'
      }
    }
  })
  stockQuantity: number;

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (threshold: number) => threshold >= 0,
        message: 'Low stock threshold cannot be negative'
      }
    }
  })
  lowStockThreshold?: number;

  @Neo4jProp()
  reorderPoint?: number;

  @Neo4jProp()
  maxStockLevel?: number;

  @JsonProperty()
  tags?: string[];

  @Neo4jProp()
  featured: boolean;

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (rating: number) => rating >= 0 && rating <= 5,
        message: 'Rating must be between 0 and 5'
      }
    }
  })
  rating?: number;

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (count: number) => count >= 0,
        message: 'Review count cannot be negative'
      }
    }
  })
  reviewCount: number;

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (weight: number) => weight > 0,
        message: 'Product weight must be greater than 0'
      }
    }
  })
  weight?: number; // in grams

  @JsonProperty()
  dimensions?: {
    length: number; // in cm
    width: number;  // in cm
    height: number; // in cm
  };

  @JsonProperty()
  specifications?: Record<string, any>;

  @JsonProperty()
  images?: string[];

  @Neo4jProp()
  manufacturerPartNumber?: string;

  @Neo4jProp()
  supplierInfo?: string;

  @Neo4jProp()
  warrantyMonths?: number;

  @Neo4jProp()
  isActive: boolean;

  @Neo4jProp()
  isDigital: boolean; // Digital vs physical product

  @Neo4jProp()
  requiresShipping: boolean;

  @Neo4jProp()
  taxCategory?: string;

  @Neo4jProp()
  minimumOrderQuantity?: number;

  @Neo4jProp()
  maximumOrderQuantity?: number;

  @JsonProperty()
  pricingTiers?: Array<{
    minQuantity: number;
    unitPrice: number;
    discountPercent?: number;
  }>;

  @Neo4jProp()
  lastInventoryCheck?: Date;

  @Neo4jProp()
  lastSoldAt?: Date;

  @Neo4jProp()
  launchedAt?: Date;

  @Neo4jProp()
  discontinuedAt?: Date;

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  createdBy: string; // Audit: who created this product

  @Neo4jProp()
  @PropIndex()
  lastModifiedBy?: string; // Audit: who last modified

  @Neo4jProp()
  approvedBy?: string; // Audit: who approved for sale

  @Neo4jProp()
  approvedAt?: Date;

  @Neo4jProp()
  deletedAt?: Date;

  @Neo4jProp()
  deletedBy?: string; // Audit: who archived/deleted

  @Neo4jProp()
  lastAuditedAt?: Date;

  @Neo4jProp()
  auditNotes?: string;

  // Relationships to other entities
  @Neo4jRelationship({
    type: 'BELONGS_TO_CATEGORY',
    direction: 'OUT',
    target: () => Object // ProductCategory in real implementation
  })
  categoryRelation?: any;

  @Neo4jRelationship({
    type: 'MANUFACTURED_BY',
    direction: 'OUT',
    target: () => Object // Company in real implementation
  })
  manufacturer?: any;

  @Neo4jRelationship({
    type: 'SUPPLIED_BY',
    direction: 'OUT',
    target: () => Object, // Supplier in real implementation
    isArray: true
  })
  suppliers?: any[];

  constructor(data?: Partial<AuditableProduct>) {
    if (data) {
      Object.assign(this, data);
    }

    // Business logic defaults
    this.stockQuantity = this.stockQuantity || 0;
    this.reviewCount = this.reviewCount || 0;
    this.featured = this.featured !== undefined ? this.featured : false;
    this.isActive = this.isActive !== undefined ? this.isActive : true;
    this.isDigital = this.isDigital !== undefined ? this.isDigital : false;
    this.requiresShipping = this.requiresShipping !== undefined ? this.requiresShipping : !this.isDigital;
    this.status = this.status || 'draft';
  }

  /**
   * Business logic methods with validation
   */
  isLowStock(): boolean {
    return this.lowStockThreshold ? this.stockQuantity <= this.lowStockThreshold : false;
  }

  needsReorder(): boolean {
    return this.reorderPoint ? this.stockQuantity <= this.reorderPoint : this.isLowStock();
  }

  canOrder(quantity: number): boolean {
    if (this.minimumOrderQuantity && quantity < this.minimumOrderQuantity) return false;
    if (this.maximumOrderQuantity && quantity > this.maximumOrderQuantity) return false;
    if (!this.isDigital && quantity > this.stockQuantity) return false;
    return this.isActive && this.status === 'active';
  }

  calculatePrice(quantity: number): number {
    if (!this.pricingTiers || this.pricingTiers.length === 0) {
      return this.price * quantity;
    }

    // Find applicable pricing tier
    const tier = this.pricingTiers
      .filter(tier => quantity >= tier.minQuantity)
      .sort((a, b) => b.minQuantity - a.minQuantity)[0];

    if (tier) {
      return tier.unitPrice * quantity;
    }

    return this.price * quantity;
  }

  updateStock(quantity: number, operation: 'add' | 'subtract'): void {
    if (operation === 'add') {
      this.stockQuantity += quantity;
    } else {
      this.stockQuantity = Math.max(0, this.stockQuantity - quantity);
    }
    this.lastInventoryCheck = new Date();
  }

  getStockStatus(): 'in-stock' | 'low-stock' | 'out-of-stock' | 'reorder-needed' {
    if (this.stockQuantity === 0) return 'out-of-stock';
    if (this.needsReorder()) return 'reorder-needed';
    if (this.isLowStock()) return 'low-stock';
    return 'in-stock';
  }

  getAuditSummary(): {
    createdBy: string;
    createdAt: Date;
    lastModifiedBy?: string;
    lastModified?: Date;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    lastAudit?: Date;
  } {
    return {
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      lastModifiedBy: this.lastModifiedBy,
      lastModified: this.updatedAt,
      approvalStatus: this.approvedAt ? 'approved' : 'pending',
      lastAudit: this.lastAuditedAt
    };
  }

  isAvailableForSale(): boolean {
    return this.isActive &&
           this.status === 'active' &&
           this.approvedAt !== undefined &&
           (this.isDigital || this.stockQuantity > 0);
  }
}

/**
 * Expected Neo4j Storage Format:
 *
 * Labels: [:AuditableProduct:Auditable:Timestamped]
 *
 * Constraints:
 * - UNIQUE: (sku, tenantId), barcode, productCode
 * - INDEX: name, category, brand, status, tenantId, createdBy
 * - NODE KEY: (sku, tenantId)
 *
 * {
 *   id: "uuid-generated-string",
 *   name: "Premium Laptop",
 *   price: 1299.99,
 *   category: "electronics",
 *   sku: "LAPTOP-PREM-001",
 *   tenantId: "tenant-abc-123",
 *   status: "active",
 *   stockQuantity: 150,
 *   lowStockThreshold: 10,
 *   tags: "[\"laptop\",\"premium\",\"business\"]",
 *   rating: 4.5,
 *   reviewCount: 89,
 *   dimensions: "{\"length\":35.5,\"width\":24.2,\"height\":2.1}",
 *   specifications: "{\"cpu\":\"Intel i7\",\"ram\":\"16GB\",\"storage\":\"512GB SSD\"}",
 *   images: "[\"laptop1.jpg\",\"laptop2.jpg\"]",
 *   pricingTiers: "[{\"minQuantity\":10,\"unitPrice\":1199.99},{\"minQuantity\":50,\"unitPrice\":1149.99}]",
 *   createdAt: "2024-01-01T00:00:00.000Z",
 *   updatedAt: "2024-01-15T10:30:00.000Z",
 *   createdBy: "admin-user-id",
 *   lastModifiedBy: "inventory-manager-id",
 *   approvedBy: "product-manager-id",
 *   approvedAt: "2024-01-02T09:00:00.000Z",
 *   lastAuditedAt: "2024-01-15T10:30:00.000Z"
 * }
 *
 * Business Features:
 * - Multi-tier pricing based on quantity
 * - Advanced inventory management with reorder points
 * - Comprehensive audit trail for compliance
 * - Business rule validation for stock and pricing
 * - Multi-tenant product catalog support
 */
