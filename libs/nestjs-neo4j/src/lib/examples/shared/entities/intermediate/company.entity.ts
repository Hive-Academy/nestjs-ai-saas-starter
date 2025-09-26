/**
 * @fileoverview Intermediate Company Entity - Constraints + Relationships
 *
 * This entity demonstrates:
 * - Constraint decorators (@Unique, @Index)
 * - Relationship mapping (@Neo4jRelationship)
 * - Custom validation (@Validate)
 * - Compound uniqueness constraints
 * - Performance optimization with indexes
 *
 * Complexity Level: INTERMEDIATE
 * Decorators Used: 8 decorators including constraints
 */

import {
  Neo4jEntity,
  Neo4jProp,
  Neo4jRelationship,
  Id,
  CreatedAt,
  UpdatedAt,
  Unique,
  PropIndex,
  NotNull,
  Validate
} from '../../../../../index';

// Forward declare related entities (would be imported in real usage)
declare class User {
  id: string;
  // ... other properties
}

declare class Department {
  id: string;
  name: string;
  // ... other properties
}

/**
 * Company entity demonstrating constraint system and relationships
 *
 * Features:
 * - ✅ Unique constraints on name and registration number
 * - ✅ Performance indexes on searchable fields
 * - ✅ NOT NULL constraints on required fields
 * - ✅ Custom validation for business rules
 * - ✅ Type-safe relationships with User and Department entities
 * - ✅ Compound uniqueness across multiple fields
 */
@Neo4jEntity.Timestamped('Company', {
  description: 'Company entity with constraints and relationships',
  tags: ['intermediate', 'company', 'constraints'],
  constraints: {
    // Database-level constraint configuration
    unique: [['name'], ['registrationNumber'], ['name', 'country']], // Multiple unique constraints
    index: ['industry', 'size', 'country', 'foundedYear'] // Performance indexes
  }
})
@Unique(['name', 'country']) // Company names must be unique per country
@Unique(['registrationNumber']) // Registration numbers are globally unique
export class Company {
  @Id()
  id: string;

  @Neo4jProp()
  @NotNull({
    errorMessage: 'Company name is required',
    treatEmptyAsNull: true
  })
  @PropIndex({
    type: 'BTREE',
    name: 'company_name_idx'
  })
  name: string;

  @Neo4jProp()
  @PropIndex()
  industry: string;

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (value: string) => ['startup', 'small', 'medium', 'large', 'enterprise'].includes(value),
        message: 'Company size must be one of: startup, small, medium, large, enterprise'
      }
    }
  })
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (value?: number) => !value || (value >= 0 && value <= 1000000000000), // $1T max
        message: 'Revenue must be between 0 and 1 trillion'
      }
    }
  })
  revenue?: number;

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (value?: number) => !value || (value >= 1800 && value <= new Date().getFullYear()),
        message: 'Founded year must be between 1800 and current year'
      }
    }
  })
  @PropIndex()
  foundedYear?: number;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  country: string;

  @Neo4jProp()
  registrationNumber: string;

  @Neo4jProp()
  isPublic?: boolean;

  @Neo4jProp()
  stockSymbol?: string;

  @Neo4jProp()
  website?: string; // Smart auto-detection: URL normalization

  @Neo4jProp()
  description?: string;

  @Neo4jProp()
  employeeCount?: number;

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (value?: string) => !value || ['active', 'inactive', 'suspended', 'dissolved'].includes(value),
        message: 'Status must be one of: active, inactive, suspended, dissolved'
      }
    }
  })
  status: 'active' | 'inactive' | 'suspended' | 'dissolved';

  // Relationship: Company has many employees (Users)
  @Neo4jRelationship({
    type: 'EMPLOYS',
    direction: 'OUT',
    target: () => User,
    isArray: true,
    eager: false, // Lazy loading for performance
    description: 'Company employees relationship'
  })
  employees?: User[];

  // Relationship: Company has many departments
  @Neo4jRelationship({
    type: 'HAS_DEPARTMENT',
    direction: 'OUT',
    target: () => Department,
    isArray: true,
    cascade: ['create', 'update'], // Cascade operations
    description: 'Company departments relationship'
  })
  departments?: Department[];

  // Relationship: Company belongs to parent company (optional)
  @Neo4jRelationship({
    type: 'SUBSIDIARY_OF',
    direction: 'OUT',
    target: () => Company,
    optional: true,
    description: 'Parent company relationship for subsidiaries'
  })
  parentCompany?: Company;

  // Relationship: Company has subsidiaries
  @Neo4jRelationship({
    type: 'SUBSIDIARY_OF',
    direction: 'IN',
    target: () => Company,
    isArray: true,
    description: 'Subsidiary companies relationship'
  })
  subsidiaries?: Company[];

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  constructor(data?: Partial<Company>) {
    if (data) {
      Object.assign(this, data);
    }
  }

  // Business logic methods
  getDisplayName(): string {
    return `${this.name} (${this.country})`;
  }

  isStartup(): boolean {
    return this.size === 'startup';
  }

  getAgeInYears(): number | null {
    if (!this.foundedYear) return null;
    return new Date().getFullYear() - this.foundedYear;
  }

  isPubliclyTraded(): boolean {
    return this.isPublic === true && !!this.stockSymbol;
  }

  // Auto-generated constraint validation methods:
  // - validateUnique_name_country(): Validates compound uniqueness
  // - validateUnique_registrationNumber(): Validates registration number uniqueness
  // - getUniqueValues_name_country(): Extracts values for uniqueness check
  // - getUniqueQuery_name_country(): Generates Cypher for uniqueness verification
}

/**
 * Expected Neo4j Graph Structure:
 *
 * (:Company {name: "TechCorp", country: "USA"})-[:EMPLOYS]->(:User)
 * (:Company)-[:HAS_DEPARTMENT]->(:Department {name: "Engineering"})
 * (:Company {name: "SubsidiaryCorp"})-[:SUBSIDIARY_OF]->(:Company {name: "ParentCorp"})
 *
 * Constraint Queries Generated:
 *
 * CREATE CONSTRAINT company_name_country_unique
 * FOR (n:Company) REQUIRE (n.name, n.country) IS UNIQUE
 *
 * CREATE CONSTRAINT company_registrationNumber_unique
 * FOR (n:Company) REQUIRE (n.registrationNumber) IS UNIQUE
 *
 * CREATE INDEX company_industry_idx FOR (n:Company) ON (n.industry)
 * CREATE INDEX company_size_idx FOR (n:Company) ON (n.size)
 *
 * Runtime Validation:
 * - Name and country combination must be unique
 * - Registration number must be globally unique
 * - Founded year must be realistic (1800-current)
 * - Revenue must be within reasonable bounds
 * - Size must be valid enum value
 * - Status must be valid enum value
 */

/**
 * Usage with Repository Pattern:
 *
 * @Injectable()
 * @Repository(() => Company)
 * export class CompanyService extends BaseRepositoryService<Company> {
 *   async createCompany(data: CreateCompanyDto): Promise<Company> {
 *     // All constraints automatically validated
 *     // Uniqueness checks performed automatically
 *     // Indexes used for performance automatically
 *     return this.create(data);
 *   }
 *
 *   async findCompaniesByIndustry(industry: string): Promise<Company[]> {
 *     // Uses industry index automatically for performance
 *     return this.findAll({ where: { industry } });
 *   }
 *
 *   async getCompanyWithEmployees(id: string): Promise<Company> {
 *     // Relationship loading handled by decorators
 *     return this.findById(id, { include: ['employees'] });
 *   }
 * }
 */
