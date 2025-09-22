import { SetMetadata } from '@nestjs/common';
import {
  DECORATOR_METADATA_KEYS,
  type EntityConfig,
  type PropertyMapping,
  type RelationshipMapping,
} from './decorator-metadata.interface';

/**
 * Configuration for the @Neo4jEntity decorator
 */
export interface Neo4jEntityConfig {
  /** Primary Neo4j label for this entity */
  label: string;
  /** Additional labels to apply */
  additionalLabels?: string[];
  /** ID generation strategy */
  idStrategy?: 'uuid' | 'auto' | 'custom';
  /** Property name for the ID field */
  idProperty?: string;
  /** Description for documentation */
  description?: string;
  /** Tags for categorization */
  tags?: string[];
}

/**
 * Configuration for the @Neo4jProperty decorator
 */
export interface Neo4jPropertyConfig {
  /** Property name in Neo4j (defaults to TypeScript property name) */
  name?: string;
  /** Whether this property should be serialized as JSON */
  serialized?: boolean;
  /** Default value for this property */
  defaultValue?: any;
  /** Whether this property is optional */
  optional?: boolean;
  /** Transformation functions */
  transform?: {
    /** Transform value when saving to Neo4j */
    toNeo4j?: (value: any) => any;
    /** Transform value when loading from Neo4j */
    fromNeo4j?: (value: any) => any;
  };
  /** Validation function */
  validate?: (value: any) => boolean | string;
  /** Description for documentation */
  description?: string;
}

/**
 * Configuration for the @Neo4jRelationship decorator
 */
export interface Neo4jRelationshipConfig {
  /** Relationship type in Neo4j */
  type: string;
  /** Direction of the relationship */
  direction: 'IN' | 'OUT' | 'BOTH';
  /** Target entity type factory */
  targetType: () => any;
  /** Whether this relationship is optional */
  optional?: boolean;
  /** Whether this is a collection of relationships */
  isArray?: boolean;
  /** Relationship properties type factory */
  propertiesType?: () => any;
  /** Eager loading configuration */
  eager?: boolean;
  /** Cascade operations */
  cascade?: ('create' | 'update' | 'delete')[];
  /** Description for documentation */
  description?: string;
}

/**
 *  @Neo4jEntity decorator for entity mapping
 *
 * Features:
 * - Automatic property and relationship mapping
 * - Type-safe entity definitions
 * - Flexible ID generation strategies
 * - Support for multiple labels
 * - Serialization/deserialization hooks
 *
 * @example
 * ```typescript
 * @Neo4jEntity({
 *   label: 'User',
 *   additionalLabels: ['Person'],
 *   idStrategy: 'uuid'
 * })
 * export class User {
 *   @Neo4jProperty()
 *   id: string;
 *
 *   @Neo4jProperty({ name: 'fullName' })
 *   name: string;
 *
 *   @Neo4jProperty({
 *     serialized: true,
 *     transform: {
 *       toNeo4j: (date) => date.toISOString(),
 *       fromNeo4j: (str) => new Date(str)
 *     }
 *   })
 *   createdAt: Date;
 *
 *   @Neo4jRelationship({
 *     type: 'AUTHORED',
 *     direction: 'OUT',
 *     targetType: () => Post,
 *     isArray: true
 *   })
 *   posts: Post[];
 * }
 * ```
 */
export function Neo4jEntity(config: Neo4jEntityConfig): ClassDecorator {
  return function (constructor: any) {
    // Validate configuration
    validateEntityConfig(config);

    // Create entity metadata
    const metadata: EntityConfig = {
      id: `Entity:${constructor.name}`,
      label: config.label,
      additionalLabels: config.additionalLabels,
      idStrategy: config.idStrategy || 'auto',
      idProperty: config.idProperty || 'id',
      description: config.description || `Entity mapping for ${config.label}`,
      tags: config.tags || ['entity', config.label.toLowerCase()],
      enabled: true,
    };

    // Set metadata on the class
    SetMetadata(DECORATOR_METADATA_KEYS.ENTITY, metadata)(constructor);

    // Add utility methods to the prototype
    addEntityMethods(constructor.prototype, metadata);

    return constructor;
  };
}

/**
 *  @Neo4jProperty decorator for property mapping
 *
 * Features:
 * - Automatic type inference
 * - Custom serialization/deserialization
 * - Property validation
 * - Default value support
 * - Optional property handling
 */
export function Neo4jProperty(
  config: Neo4jPropertyConfig = {}
): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    // Get property type information
    const propertyType = Reflect.getMetadata(
      'design:type',
      target,
      propertyKey
    );

    // Create property metadata
    const metadata: PropertyMapping = {
      neo4jName: config.name || String(propertyKey),
      tsName: String(propertyKey),
      serialized: config.serialized || false,
      defaultValue: config.defaultValue,
      type: {
        type: () => propertyType,
        optional: config.optional,
        validate: config.validate
          ? (value: any) => Boolean(config.validate!(value))
          : undefined,
        transform: config.transform?.fromNeo4j,
      },
      transform: config.transform,
    };

    // Store property metadata
    const existingProperties =
      Reflect.getMetadata(DECORATOR_METADATA_KEYS.PROPERTY, target) ||
      new Map();
    existingProperties.set(propertyKey, metadata);
    SetMetadata(DECORATOR_METADATA_KEYS.PROPERTY, existingProperties)(target);
  };
}

/**
 *  @Neo4jRelationship decorator for relationship mapping
 *
 * Features:
 * - Type-safe relationship definitions
 * - Bidirectional relationship support
 * - Relationship properties mapping
 * - Eager/lazy loading configuration
 * - Cascade operations
 */
export function Neo4jRelationship(
  config: Neo4jRelationshipConfig
): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    // Validate relationship configuration
    validateRelationshipConfig(config);

    // Create relationship metadata
    const metadata: RelationshipMapping = {
      type: config.type,
      direction: config.direction,
      targetType: config.targetType,
      optional: config.optional || false,
      isArray: config.isArray || false,
      propertiesType: config.propertiesType,
    };

    // Store relationship metadata
    const existingRelationships =
      Reflect.getMetadata(DECORATOR_METADATA_KEYS.RELATIONSHIP, target) ||
      new Map();
    existingRelationships.set(propertyKey, metadata);
    SetMetadata(
      DECORATOR_METADATA_KEYS.RELATIONSHIP,
      existingRelationships
    )(target);

    // Add relationship management methods
    addRelationshipMethods(target, propertyKey, metadata);
  };
}

/**
 * Shorthand decorators for common property types
 */

/**
 * @Id decorator for ID properties
 */
export function Id(
  config: Omit<Neo4jPropertyConfig, 'name'> = {}
): PropertyDecorator {
  return Neo4jProperty({
    ...config,
    name: 'id',
  });
}

/**
 * @CreatedAt decorator for creation timestamp
 */
export function CreatedAt(
  config: Omit<Neo4jPropertyConfig, 'transform'> = {}
): PropertyDecorator {
  return Neo4jProperty({
    ...config,
    transform: {
      toNeo4j: (date: Date) => date?.toISOString(),
      fromNeo4j: (str: string) => (str ? new Date(str) : null),
    },
  });
}

/**
 * @UpdatedAt decorator for update timestamp
 */
export function UpdatedAt(
  config: Omit<Neo4jPropertyConfig, 'transform'> = {}
): PropertyDecorator {
  return Neo4jProperty({
    ...config,
    transform: {
      toNeo4j: (date: Date) => date?.toISOString(),
      fromNeo4j: (str: string) => (str ? new Date(str) : null),
    },
  });
}

/**
 * @JsonProperty decorator for JSON serialized properties
 */
export function JsonProperty(
  config: Omit<Neo4jPropertyConfig, 'serialized' | 'transform'> = {}
): PropertyDecorator {
  return Neo4jProperty({
    ...config,
    serialized: true,
    transform: {
      toNeo4j: (obj: any) => (obj ? JSON.stringify(obj) : null),
      fromNeo4j: (str: string) => {
        try {
          return str ? JSON.parse(str) : null;
        } catch {
          return str;
        }
      },
    },
  });
}

/**
 * Add utility methods to entity prototype
 */
function addEntityMethods(prototype: any, metadata: EntityConfig): void {
  // Add toNeo4j method for serialization
  if (!prototype.toNeo4j) {
    prototype.toNeo4j = function (): Record<string, any> {
      const result: Record<string, any> = {};
      const properties =
        Reflect.getMetadata(DECORATOR_METADATA_KEYS.PROPERTY, this) ||
        new Map();

      properties.forEach(
        (propertyMetadata: PropertyMapping, propertyKey: string) => {
          const value = this[propertyKey];

          if (value !== undefined) {
            const neo4jName = propertyMetadata.neo4jName || propertyKey;

            if (propertyMetadata.transform?.toNeo4j) {
              result[neo4jName] = propertyMetadata.transform.toNeo4j(value);
            } else if (propertyMetadata.serialized) {
              result[neo4jName] = JSON.stringify(value);
            } else {
              result[neo4jName] = value;
            }
          }
        }
      );

      return result;
    };
  }

  // Add fromNeo4j static method for deserialization
  if (!prototype.constructor.fromNeo4j) {
    prototype.constructor.fromNeo4j = function (
      data: Record<string, any>
    ): any {
      const instance = new this();
      const properties =
        Reflect.getMetadata(DECORATOR_METADATA_KEYS.PROPERTY, instance) ||
        new Map();

      properties.forEach(
        (propertyMetadata: PropertyMapping, propertyKey: string) => {
          const neo4jName = propertyMetadata.neo4jName || propertyKey;
          const value = data[neo4jName];

          if (value !== undefined) {
            if (propertyMetadata.transform?.fromNeo4j) {
              instance[propertyKey] =
                propertyMetadata.transform.fromNeo4j(value);
            } else if (propertyMetadata.serialized) {
              try {
                instance[propertyKey] = JSON.parse(value);
              } catch {
                instance[propertyKey] = value;
              }
            } else {
              instance[propertyKey] = value;
            }
          } else if (propertyMetadata.defaultValue !== undefined) {
            instance[propertyKey] = propertyMetadata.defaultValue;
          }
        }
      );

      return instance;
    };
  }

  // Add getLabel method
  if (!prototype.getLabel) {
    prototype.getLabel = function (): string {
      return metadata.label;
    };
  }

  // Add getLabels method
  if (!prototype.getLabels) {
    prototype.getLabels = function (): string[] {
      const labels = [metadata.label];
      if (metadata.additionalLabels) {
        labels.push(...metadata.additionalLabels);
      }
      return labels;
    };
  }
}

/**
 * Add relationship management methods
 */
function addRelationshipMethods(
  prototype: any,
  propertyKey: string | symbol,
  metadata: RelationshipMapping
): void {
  const methodPrefix = String(propertyKey);

  // Add relationship query method
  const queryMethodName = `get${capitalize(methodPrefix)}Query`;
  if (!prototype[queryMethodName]) {
    prototype[queryMethodName] = function (): string {
      const direction =
        metadata.direction === 'IN'
          ? '<-'
          : metadata.direction === 'OUT'
          ? '->'
          : '-';
      const relationshipPattern =
        metadata.direction === 'BOTH'
          ? `-[:${metadata.type}]-`
          : metadata.direction === 'IN'
          ? `<-[:${metadata.type}]-`
          : `-[:${metadata.type}]->`;

      return `MATCH (source) ${relationshipPattern} (target) WHERE source.id = $sourceId RETURN target`;
    };
  }
}

/**
 * Validate entity configuration
 */
function validateEntityConfig(config: Neo4jEntityConfig): void {
  if (!config.label || typeof config.label !== 'string') {
    throw new Error('Neo4jEntity decorator requires a valid label string');
  }

  if (config.label.trim().length === 0) {
    throw new Error('Neo4jEntity label cannot be empty');
  }

  // Validate label format (basic Neo4j label rules)
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(config.label)) {
    throw new Error('Neo4jEntity label must be a valid Neo4j identifier');
  }

  if (config.additionalLabels) {
    config.additionalLabels.forEach((label) => {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(label)) {
        throw new Error(`Invalid additional label: ${label}`);
      }
    });
  }
}

/**
 * Validate relationship configuration
 */
function validateRelationshipConfig(config: Neo4jRelationshipConfig): void {
  if (!config.type || typeof config.type !== 'string') {
    throw new Error('Neo4jRelationship decorator requires a valid type string');
  }

  if (!['IN', 'OUT', 'BOTH'].includes(config.direction)) {
    throw new Error('Neo4jRelationship direction must be IN, OUT, or BOTH');
  }

  if (!config.targetType || typeof config.targetType !== 'function') {
    throw new Error(
      'Neo4jRelationship decorator requires a valid targetType function'
    );
  }

  // Validate relationship type format
  if (!/^[A-Z_][A-Z0-9_]*$/.test(config.type)) {
    throw new Error(
      'Neo4jRelationship type should follow UPPER_CASE convention'
    );
  }
}

/**
 * Capitalize first letter of string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
