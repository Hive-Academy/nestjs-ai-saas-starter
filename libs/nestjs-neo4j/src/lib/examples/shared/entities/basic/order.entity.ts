/**
 * @fileoverview Basic Order Entity - Relationships Showcase
 *
 * This entity demonstrates:
 * - Neo4j relationships with other entities
 * - JSON property handling for complex data
 * - Status validation with business rules
 * - Calculated properties and business logic
 * - Proper foreign key references
 *
 * Complexity Level: BASIC → INTERMEDIATE
 * Decorators Used: 7 core decorators + 2 relationships
 */

import {
  Neo4jEntity,
  Neo4jProp,
  Neo4jRelationship,
  Id,
  CreatedAt,
  UpdatedAt,
  PropIndex,
  Validate,
  JsonProperty
} from '../../../../../index';

// Forward declarations for relationships
import { User } from './user.entity';
import { Product } from './product.entity';

/**
 * Order item interface for JSON storage
 */
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/**
 * Shipping address interface
 */
export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

/**
 * Basic Order entity showcasing relationships and JSON properties
 *
 * Features:
 * - ✅ Relationships to User (customer) and Products
 * - ✅ JSON serialization for order items and addresses
 * - ✅ Status validation with business rules
 * - ✅ Calculated totals and business logic
 * - ✅ Index optimization for order queries
 */
@Neo4jEntity.Timestamped('Order', {
  description: 'Basic order entity with customer relationships and line items',
  tags: ['basic', 'order', 'e-commerce'],
  constraints: {
    index: ['status', 'totalAmount', 'customerId', 'orderDate']
  }
})
export class Order {
  @Id()
  id: string;

  @Neo4jProp()
  @PropIndex()
  customerId: string; // Foreign key reference

  @Neo4jProp()
  orderNumber: string; // Human-readable order number (e.g., ORD-2024-001)

  @Neo4jProp()
  @PropIndex()
  @Validate({
    validation: {
      custom: {
        validator: (status: string) =>
          ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status),
        message: 'Status must be one of: pending, confirmed, processing, shipped, delivered, cancelled'
      }
    }
  })
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

  @Neo4jProp()
  @PropIndex()
  @Validate({
    validation: {
      custom: {
        validator: (amount: number) => amount >= 0,
        message: 'Total amount must be non-negative'
      }
    }
  })
  totalAmount: number;

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (amount?: number) => !amount || amount >= 0,
        message: 'Subtotal must be non-negative'
      }
    }
  })
  subtotal?: number;

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (tax?: number) => !tax || tax >= 0,
        message: 'Tax amount must be non-negative'
      }
    }
  })
  taxAmount?: number;

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (shipping?: number) => !shipping || shipping >= 0,
        message: 'Shipping cost must be non-negative'
      }
    }
  })
  shippingCost?: number;

  @Neo4jProp()
  currency: string; // ISO currency code (USD, EUR, etc.)

  @Neo4jProp()
  @PropIndex()
  orderDate: Date; // When order was placed

  @Neo4jProp()
  expectedDeliveryDate?: Date;

  @Neo4jProp()
  actualDeliveryDate?: Date;

  @JsonProperty() // Store order items as JSON
  @Validate({
    validation: {
      custom: {
        validator: (items: OrderItem[]) => items && items.length > 0,
        message: 'Order must contain at least one item'
      }
    }
  })
  items: OrderItem[];

  @JsonProperty() // Store shipping address as JSON
  shippingAddress?: ShippingAddress;

  @JsonProperty() // Store billing address as JSON
  billingAddress?: ShippingAddress;

  @Neo4jProp()
  notes?: string; // Customer notes or special instructions

  @Neo4jProp()
  trackingNumber?: string; // Shipping tracking number

  // === RELATIONSHIPS ===

  @Neo4jRelationship({
    type: 'PLACED_BY',
    direction: 'OUT',
    target: () => User,
    description: 'Customer who placed this order'
  })
  customer?: User;

  @Neo4jRelationship({
    type: 'CONTAINS',
    direction: 'OUT',
    target: () => Product,
    isArray: true,
    description: 'Products in this order'
  })
  products?: Product[];

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  constructor(data?: Partial<Order>) {
    if (data) {
      Object.assign(this, data);
    }

    // Set orderDate to creation time if not provided
    if (!this.orderDate) {
      this.orderDate = new Date();
    }
  }

  // === BUSINESS LOGIC METHODS ===

  /**
   * Calculate order totals from line items
   */
  calculateTotals(): void {
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);

    // Simple tax calculation (8.5% default)
    if (!this.taxAmount) {
      this.taxAmount = this.subtotal * 0.085;
    }

    // Free shipping over $100, otherwise $9.99
    if (!this.shippingCost) {
      this.shippingCost = this.subtotal >= 100 ? 0 : 9.99;
    }

    this.totalAmount = this.subtotal + this.taxAmount + this.shippingCost;
  }

  /**
   * Get total quantity of items in order
   */
  getTotalQuantity(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Check if order can be cancelled
   */
  canBeCancelled(): boolean {
    return ['pending', 'confirmed'].includes(this.status);
  }

  /**
   * Check if order is completed
   */
  isCompleted(): boolean {
    return ['delivered', 'cancelled'].includes(this.status);
  }

  /**
   * Get formatted order total
   */
  getFormattedTotal(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency || 'USD'
    }).format(this.totalAmount);
  }

  /**
   * Get order age in days
   */
  getOrderAgeInDays(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.orderDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if order is overdue for delivery
   */
  isOverdue(): boolean {
    if (!this.expectedDeliveryDate || this.actualDeliveryDate) {
      return false;
    }
    return new Date() > this.expectedDeliveryDate;
  }

  /**
   * Update order status with validation
   */
  updateStatus(newStatus: Order['status']): void {
    const validTransitions: Record<string, string[]> = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled'],
      'shipped': ['delivered'],
      'delivered': [], // Final state
      'cancelled': [] // Final state
    };

    const allowedNext = validTransitions[this.status] || [];
    if (!allowedNext.includes(newStatus)) {
      throw new Error(
        `Cannot transition from ${this.status} to ${newStatus}. Allowed: ${allowedNext.join(', ')}`
      );
    }

    this.status = newStatus;

    // Set delivery date when marked as delivered
    if (newStatus === 'delivered') {
      this.actualDeliveryDate = new Date();
    }
  }
}
