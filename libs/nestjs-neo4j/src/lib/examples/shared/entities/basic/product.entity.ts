/**
 * @fileoverview Basic Product Entity - Core Decorator Showcase
 *
 * This entity demonstrates:
 * - Timestamped entity helper for automatic createdAt/updatedAt
 * - Smart property validation and constraints
 * - Index optimization for common queries
 * - Proper Date types with ISO transforms
 * - Business validation rules
 *
 * Complexity Level: BASIC
 * Decorators Used: 6 core decorators + constraints
 */

import {
  Neo4jEntity,
  Neo4jProp,
  Id,
  CreatedAt,
  UpdatedAt,
  ClassUnique,
  PropUnique,
  PropIndex,
  Validate,
  JsonProperty
} from '../../../../../index';

/**
 * Basic Product entity with core decorators and constraints
 *
 * Features:
 * - ✅ Timestamped entity with automatic Date handling
 * - ✅ SKU uniqueness constraint for inventory management
 * - ✅ Price and category indexing for fast queries
 * - ✅ Business rule validation (price must be positive)
 * - ✅ JSON serialization for specifications
 */
@Neo4jEntity.Timestamped('Product', {
  description: 'Basic product entity with inventory management features',
  tags: ['basic', 'product', 'inventory'],
  constraints: {
    unique: [['sku']], // SKU must be unique globally
    index: ['name', 'category', 'price'] // Fast queries by these fields
  }
})
@ClassUnique(['sku']) // Explicit unique constraint on SKU
export class Product {
  @Id()
  id: string;

  @Neo4jProp()
  @PropIndex()
  name: string;

  @Neo4jProp()
  description: string;

  @Neo4jProp()
  @PropIndex()
  @Validate({
    validator: (price: number) => price >= 0,
    message: 'Price must be non-negative'
  })
  price: number;

  @Neo4jProp()
  @PropIndex()
  category: string;

  @Neo4jProp()
  @PropUnique() // SKU must be unique
  @Validate({
    validator: (sku: string) => /^[A-Z0-9-]{6,20}$/.test(sku),
    message: 'SKU must be 6-20 characters, uppercase letters, numbers, and hyphens only'
  })
  sku: string;

  @Neo4jProp()
  inStock: boolean;

  @Neo4jProp()
  @PropIndex()
  featured: boolean; // Featured products for highlighting

  @Neo4jProp()
  @Validate({
    validator: (quantity?: number) => !quantity || quantity >= 0,
    message: 'Quantity must be non-negative'
  })
  stockQuantity?: number;

  @Neo4jProp()
  @Validate({
    validator: (weight?: number) => !weight || weight > 0,
    message: 'Weight must be positive'
  })
  weight?: number; // in grams

  @JsonProperty() // JSON serialization for complex object
  specifications?: {
    dimensions?: {
      length: number;
      width: number;
      height: number;
      unit: 'cm' | 'in';
    };
    material?: string;
    color?: string;
    warranty?: string;
    features?: string[];
  };

  @CreatedAt() // Auto-managed with Date type
  createdAt: Date;

  @UpdatedAt() // Auto-managed with Date type
  updatedAt: Date;

  constructor(data?: Partial<Product>) {
    if (data) {
      Object.assign(this, data);
    }

    // Set defaults
    this.featured = this.featured !== undefined ? this.featured : false;
    this.inStock = this.inStock !== undefined ? this.inStock : true;
  }

  // Business logic methods
  isAvailable(): boolean {
    return this.inStock && (this.stockQuantity || 0) > 0;
  }

  getFormattedPrice(currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(this.price);
  }

  isLowStock(threshold = 5): boolean {
    return (this.stockQuantity || 0) <= threshold;
  }

  getDimensions(): string | null {
    if (!this.specifications?.dimensions) return null;

    const { length, width, height, unit } = this.specifications.dimensions;
    return `${length} × ${width} × ${height} ${unit}`;
  }
}
