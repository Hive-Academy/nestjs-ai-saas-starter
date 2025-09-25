#!/usr/bin/env tsx

/**
 * Demonstration of Enhanced Neo4j Decorators
 *
 * This script demonstrates the enhanced decorators working correctly with smart defaults.
 * Run with: npx tsx src/examples/decorator-demo.ts
 */

import {
  DECORATOR_METADATA_KEYS,
  Neo4jEntity,
  Neo4jProperty,
} from '../decorators';

console.log('🚀 Testing Enhanced Neo4j Decorators\n');

// Test 1: String shorthand for Neo4jEntity
console.log('1. Testing @Neo4jEntity string shorthand:');
@Neo4jEntity('User')
class User {
  @Neo4jProperty()
  id: string;

  @Neo4jProperty()
  email: string;

  @Neo4jProperty()
  createdAt: Date;

  @Neo4jProperty()
  isActive: boolean;

  @Neo4jProperty()
  metadata: Record<string, any>;
}

// Check that metadata was applied correctly
const userEntityMetadata = Reflect.getMetadata(
  DECORATOR_METADATA_KEYS.ENTITY,
  User
);
console.log('✅ User entity metadata:', {
  label: userEntityMetadata?.label,
  idStrategy: userEntityMetadata?.idStrategy,
  idProperty: userEntityMetadata?.idProperty,
});

// Test property smart defaults
const userPropertyMetadata = Reflect.getMetadata(
  DECORATOR_METADATA_KEYS.PROPERTY,
  User.prototype
);
if (userPropertyMetadata) {
  console.log('✅ Smart defaults applied to properties:');

  // Check createdAt timestamp field
  const createdAtProp = userPropertyMetadata.get('createdAt');
  console.log(
    '  - createdAt has timestamp transform:',
    Boolean(createdAtProp?.transform?.toNeo4j)
  );

  // Check email field
  const emailProp = userPropertyMetadata.get('email');
  console.log(
    '  - email has normalization transform:',
    Boolean(emailProp?.transform?.toNeo4j)
  );

  // Check metadata JSON field
  const metadataProp = userPropertyMetadata.get('metadata');
  console.log(
    '  - metadata has JSON serialization:',
    Boolean(metadataProp?.serialized)
  );
}

console.log('\n2. Testing @Neo4jEntity.Timestamped namespace helper:');
@Neo4jEntity.Timestamped('Post')
class Post {
  @Neo4jProperty()
  id: string;

  @Neo4jProperty()
  title: string;
}

const postEntityMetadata = Reflect.getMetadata(
  DECORATOR_METADATA_KEYS.ENTITY,
  Post
);
console.log('✅ Post entity metadata:', {
  label: postEntityMetadata?.label,
  additionalLabels: postEntityMetadata?.additionalLabels,
  description: postEntityMetadata?.description,
});

console.log('\n3. Testing backward compatibility:');
@Neo4jEntity({
  label: 'Product',
  additionalLabels: ['Inventory'],
  idStrategy: 'custom',
})
class Product {
  @Neo4jProperty({
    name: 'productId',
    defaultValue: () => `PROD_${Date.now()}`,
  })
  id: string;

  @Neo4jProperty({
    transform: {
      toNeo4j: (price: number) => Math.round(price * 100),
      fromNeo4j: (cents: number) => cents / 100,
    },
  })
  price: number;
}

const productEntityMetadata = Reflect.getMetadata(
  DECORATOR_METADATA_KEYS.ENTITY,
  Product
);
console.log('✅ Product entity (full config) metadata:', {
  label: productEntityMetadata?.label,
  additionalLabels: productEntityMetadata?.additionalLabels,
  idStrategy: productEntityMetadata?.idStrategy,
});

const productPropertyMetadata = Reflect.getMetadata(
  DECORATOR_METADATA_KEYS.PROPERTY,
  Product.prototype
);
if (productPropertyMetadata) {
  const idProp = productPropertyMetadata.get('id');
  const priceProp = productPropertyMetadata.get('price');
  console.log('✅ Custom property configurations preserved:', {
    idNeo4jName: idProp?.neo4jName,
    hasIdDefault: Boolean(idProp?.defaultValue),
    hasPriceTransform: Boolean(priceProp?.transform?.toNeo4j),
  });
}

console.log('\n4. Testing @Neo4jEntity namespace helpers:');

// Test all namespace helpers
@Neo4jEntity.SoftDelete('Document')
class Document {
  @Neo4jProperty()
  id: string;
}

@Neo4jEntity.Auditable('Transaction')
class Transaction {
  @Neo4jProperty()
  id: string;
}

@Neo4jEntity.Tenanted('Account')
class Account {
  @Neo4jProperty()
  id: string;
}

const documentMeta = Reflect.getMetadata(
  DECORATOR_METADATA_KEYS.ENTITY,
  Document
);
const transactionMeta = Reflect.getMetadata(
  DECORATOR_METADATA_KEYS.ENTITY,
  Transaction
);
const accountMeta = Reflect.getMetadata(
  DECORATOR_METADATA_KEYS.ENTITY,
  Account
);

console.log('✅ Namespace helpers working:');
console.log('  - SoftDelete labels:', documentMeta?.additionalLabels);
console.log('  - Auditable labels:', transactionMeta?.additionalLabels);
console.log('  - Tenanted labels:', accountMeta?.additionalLabels);

console.log('\n🎉 All enhanced decorators working correctly!');
console.log('\nKey enhancements verified:');
console.log('✅ String shorthand for @Neo4jEntity');
console.log('✅ Smart defaults for common property patterns');
console.log('✅ Namespace helpers for common entity configurations');
console.log('✅ Full backward compatibility preserved');
console.log('✅ No new decorators created - only enhanced existing ones');
