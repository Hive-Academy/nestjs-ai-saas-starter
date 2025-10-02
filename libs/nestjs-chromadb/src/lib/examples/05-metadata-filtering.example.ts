/**
 * @fileoverview Metadata Filtering Example
 *
 * Demonstrates:
 * - Complex metadata queries with multiple operators
 * - Range queries (price, dates, numerical values)
 * - Array operations ($in, $nin, $contains, $not_contains)
 * - Logical operators ($and, $or, $not)
 * - Text matching patterns
 * - Nested metadata filtering
 * - Performance optimization for filtered queries
 *
 * Key Concepts:
 * - ChromaDB metadata query syntax
 * - Filter composition and optimization
 * - Complex business logic filtering
 * - Performance considerations for large datasets
 * - Error handling for invalid filters
 */

import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import {
  BaseChromaEntity,
  BaseChromaRepository,
  ChromaDBModule,
  ChromaDBService,
  ChromaEntity,
  ChromaId,
  ChromaProp,
  ChromaRepository,
  CreatedAt,
  CreateDocumentInput,
  JsonProperty,
  UpdatedAt,
} from '../../index';

// ============================================================================
// 1. METADATA INTERFACES
// ============================================================================

/**
 * Metadata interface for filter product entity
 */
export interface FilterProductMetadata {
  name: string;
  description: string;
  brand: string;
  category: string;
  subcategory: string;
  price: number;
  currency: string;
  salePrice?: number;
  inStock: boolean;
  stockLevel: number;
  tags: string[];
  features: string[];
  colors: string[];
  sizes: string[];
  rating: number;
  reviewCount: number;
  releaseDate: string;
  lastUpdated: string;
  weight: number;
  dimensions: { length: number; width: number; height: number };
  manufacturer: { name: string; country: string; established: number };
  warranty: { duration: number; type: string };
  availability: { regions: string[]; exclusive: boolean };
  certifications: string[];
  condition: 'new' | 'refurbished' | 'used';
  seller: { id: string; name: string; rating: number };
}

/**
 * Metadata interface for filter user entity
 */
export interface FilterUserMetadata {
  name: string;
  email: string;
  age: number;
  joinDate: string;
  lastLoginDate: string;
  accountType: 'free' | 'premium' | 'enterprise';
  status: 'active' | 'inactive' | 'suspended';
  preferences: {
    language: string;
    timezone: string;
    theme: 'light' | 'dark';
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
  profile: {
    bio: string;
    interests: string[];
    skills: string[];
    experience: number;
    location: {
      country: string;
      city: string;
      region: string;
    };
  };
  activity: {
    loginCount: number;
    lastActiveDate: string;
    engagementScore: number;
    featuresUsed: string[];
  };
  purchases: {
    totalSpent: number;
    orderCount: number;
    averageOrderValue: number;
    lastPurchaseDate: string;
    favoriteCategories: string[];
  };
  settings: {
    privacyLevel: 'public' | 'friends' | 'private';
    marketingOptIn: boolean;
    dataProcessingConsent: boolean;
    newsletterSubscribed: boolean;
  };
}

// ============================================================================
// 2. ENTITIES WITH RICH METADATA FOR FILTERING
// ============================================================================

/**
 * E-commerce product with comprehensive metadata for filtering demos
 */
@ChromaEntity({
  collection: 'products_filter_demo',
  description:
    'Product catalog with rich metadata for filtering demonstrations',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
  autoGenerateIds: true,
})
export class FilterProductEntity extends BaseChromaEntity<FilterProductMetadata> {
  @ChromaId()
  declare id: string;

  @ChromaProp({
    description: 'Product description for search',
  })
  declare content: string;

  declare metadata: FilterProductMetadata;

  declare embedding?: readonly number[];

  @CreatedAt()
  declare createdAt?: string;

  @UpdatedAt()
  declare updatedAt?: string;

  declare version?: number;
}

/**
 * User entity with complex profile metadata for filtering
 */
@ChromaEntity({
  collection: 'users_filter_demo',
  description: 'User profiles with detailed metadata for filtering',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
})
export class FilterUserEntity extends BaseChromaEntity<FilterUserMetadata> {
  @ChromaId()
  declare id: string;

  @ChromaProp()
  declare content: string;

  @JsonProperty({
    description: 'Complex user metadata with nested structures',
  })
  declare metadata: FilterUserMetadata;

  declare embedding?: readonly number[];

  @CreatedAt()
  declare createdAt?: string;

  @UpdatedAt()
  declare updatedAt?: string;

  declare version?: number;
}

// ============================================================================
// 3. REPOSITORIES WITH ADVANCED FILTERING METHODS
// ============================================================================

/**
 * Product repository with comprehensive filtering capabilities
 */
@Injectable()
@ChromaRepository<FilterProductEntity>({
  collection: 'products_filter_demo',
  autoEmbed: true,
  enableCaching: true,
})
export class FilterProductRepository extends BaseChromaRepository<FilterProductEntity> {
  constructor(chromaService: ChromaDBService) {
    super();
  }

  /**
   * Range-based filtering (price, dates, ratings)
   */
  async findByPriceRange(
    minPrice: number,
    maxPrice: number,
    options: {
      currency?: string;
      includeOnSale?: boolean;
      inStockOnly?: boolean;
    } = {}
  ): Promise<FilterProductEntity[]> {
    const where: any = {
      price: { $gte: minPrice, $lte: maxPrice },
    };

    if (options.currency) {
      where.currency = options.currency;
    }

    if (options.inStockOnly) {
      where.inStock = true;
    }

    if (options.includeOnSale) {
      where.$or = [
        { salePrice: { $gte: minPrice, $lte: maxPrice } },
        { price: { $gte: minPrice, $lte: maxPrice } },
      ];
      delete where.price; // Remove the simple price filter
    }

    return this.findAll({
      where,
      orderBy: [{ field: 'price', direction: 'asc' }],
    });
  }

  /**
   * Date range filtering
   */
  async findByDateRange(
    startDate: string,
    endDate: string,
    dateField: 'releaseDate' | 'lastUpdated' = 'releaseDate'
  ): Promise<FilterProductEntity[]> {
    return this.findAll({
      where: {
        [dateField]: { $gte: startDate, $lte: endDate },
      },
      orderBy: [{ field: dateField, direction: 'desc' }],
    });
  }

  /**
   * Array-based filtering (tags, features, colors)
   */
  async findByTags(
    tags: string[],
    matchType: 'any' | 'all' | 'none' = 'any'
  ): Promise<FilterProductEntity[]> {
    let where: any;

    switch (matchType) {
      case 'any':
        where = { tags: { $in: tags } };
        break;
      case 'all':
        // For "all" matching, we need each tag to be present
        where = { $and: tags.map((tag) => ({ tags: { $in: [tag] } })) };
        break;
      case 'none':
        where = { tags: { $nin: tags } };
        break;
    }

    return this.findAll({ where });
  }

  /**
   * Multi-field array filtering
   */
  async findByFeaturesAndColors(
    requiredFeatures: string[],
    availableColors: string[],
    mustHaveAllFeatures = false
  ): Promise<FilterProductEntity[]> {
    const where: any = {
      colors: { $in: availableColors },
    };

    if (mustHaveAllFeatures) {
      where.$and = requiredFeatures.map((feature) => ({
        features: { $in: [feature] },
      }));
    } else {
      where.features = { $in: requiredFeatures };
    }

    return this.findAll({ where });
  }

  /**
   * Complex logical operations
   */
  async findPremiumProducts(criteria: {
    minRating?: number;
    minReviews?: number;
    brands?: string[];
    excludeCategories?: string[];
    maxPrice?: number;
    inStockOnly?: boolean;
  }): Promise<FilterProductEntity[]> {
    const conditions: any[] = [];

    // Rating condition
    if (criteria.minRating) {
      conditions.push({ rating: { $gte: criteria.minRating } });
    }

    // Review count condition
    if (criteria.minReviews) {
      conditions.push({ reviewCount: { $gte: criteria.minReviews } });
    }

    // Price condition
    if (criteria.maxPrice) {
      conditions.push({ price: { $lte: criteria.maxPrice } });
    }

    // Stock condition
    if (criteria.inStockOnly) {
      conditions.push({ inStock: true });
    }

    const where: any = {};

    // AND conditions
    if (conditions.length > 0) {
      where.$and = conditions;
    }

    // OR condition for brands
    if (criteria.brands && criteria.brands.length > 0) {
      where.brand = { $in: criteria.brands };
    }

    // NOT condition for categories
    if (criteria.excludeCategories && criteria.excludeCategories.length > 0) {
      where.category = { $nin: criteria.excludeCategories };
    }

    return this.findAll({
      where,
      orderBy: [
        { field: 'rating', direction: 'desc' },
        { field: 'reviewCount', direction: 'desc' },
      ],
    });
  }

  /**
   * Text pattern matching
   */
  async findByTextPatterns(patterns: {
    nameContains?: string;
    descriptionContains?: string;
    brandNotContains?: string;
    tagContains?: string;
  }): Promise<FilterProductEntity[]> {
    const where: any = {};

    // Note: Text pattern matching on metadata requires exact matches or array operations
    // For partial text matching, consider using WhereDocument with the content field

    if (patterns.nameContains) {
      // For exact name match, use equality. For partial match, restructure to use content field
      where.name = patterns.nameContains;
    }

    if (patterns.descriptionContains) {
      // For exact description match, use equality
      where.description = patterns.descriptionContains;
    }

    if (patterns.brandNotContains) {
      // Use $ne for not equal
      where.brand = { $ne: patterns.brandNotContains };
    }

    if (patterns.tagContains) {
      // For array field, check if the tag is in the array
      where.tags = { $in: [patterns.tagContains] };
    }

    return this.findAll({ where });
  }

  /**
   * Nested metadata filtering (for complex objects)
   */
  async findByManufacturer(criteria: {
    country?: string;
    establishedAfter?: number;
    name?: string;
  }): Promise<FilterProductEntity[]> {
    // Note: For nested object filtering, we need to flatten the structure
    // or use the JSON path syntax if supported by ChromaDB
    const where: any = {};

    if (criteria.country) {
      where['manufacturer.country'] = criteria.country;
    }

    if (criteria.establishedAfter) {
      where['manufacturer.established'] = { $gte: criteria.establishedAfter };
    }

    if (criteria.name) {
      // For exact manufacturer name match
      where['manufacturer.name'] = criteria.name;
    }

    return this.findAll({ where });
  }

  /**
   * Advanced availability filtering
   */
  async findByAvailability(criteria: {
    regions?: string[];
    exclusiveOnly?: boolean;
    stockLevel?: { min?: number; max?: number };
  }): Promise<FilterProductEntity[]> {
    const where: any = {};

    if (criteria.regions && criteria.regions.length > 0) {
      where['availability.regions'] = { $in: criteria.regions };
    }

    if (criteria.exclusiveOnly !== undefined) {
      where['availability.exclusive'] = criteria.exclusiveOnly;
    }

    if (criteria.stockLevel) {
      const stockConditions: any = {};
      if (criteria.stockLevel.min !== undefined) {
        stockConditions.$gte = criteria.stockLevel.min;
      }
      if (criteria.stockLevel.max !== undefined) {
        stockConditions.$lte = criteria.stockLevel.max;
      }
      if (Object.keys(stockConditions).length > 0) {
        where.stockLevel = stockConditions;
      }
    }

    return this.findAll({ where });
  }
}

/**
 * User repository with profile-based filtering
 */
@Injectable()
@ChromaRepository<FilterUserEntity>({
  collection: 'users_filter_demo',
  autoEmbed: true,
  enableCaching: true,
})
export class FilterUserRepository extends BaseChromaRepository<FilterUserEntity> {
  constructor(chromaService: ChromaDBService) {
    super();
  }

  /**
   * User segmentation by activity and engagement
   */
  async findActiveUsers(criteria: {
    minEngagementScore?: number;
    loginsSince?: string;
    accountTypes?: string[];
    minExperience?: number;
  }): Promise<FilterUserEntity[]> {
    const where: any = {
      status: 'active',
    };

    if (criteria.minEngagementScore) {
      where['activity.engagementScore'] = { $gte: criteria.minEngagementScore };
    }

    if (criteria.loginsSince) {
      where['activity.lastActiveDate'] = { $gte: criteria.loginsSince };
    }

    if (criteria.accountTypes && criteria.accountTypes.length > 0) {
      where.accountType = { $in: criteria.accountTypes };
    }

    if (criteria.minExperience) {
      where['profile.experience'] = { $gte: criteria.minExperience };
    }

    return this.findAll({
      where,
      orderBy: [{ field: 'activity.engagementScore', direction: 'desc' }],
    });
  }

  /**
   * Customer value segmentation
   */
  async findHighValueCustomers(criteria: {
    minTotalSpent?: number;
    minOrderCount?: number;
    minAverageOrderValue?: number;
    purchasedSince?: string;
    favoriteCategories?: string[];
  }): Promise<FilterUserEntity[]> {
    const conditions: any[] = [];

    if (criteria.minTotalSpent) {
      conditions.push({
        'purchases.totalSpent': { $gte: criteria.minTotalSpent },
      });
    }

    if (criteria.minOrderCount) {
      conditions.push({
        'purchases.orderCount': { $gte: criteria.minOrderCount },
      });
    }

    if (criteria.minAverageOrderValue) {
      conditions.push({
        'purchases.averageOrderValue': { $gte: criteria.minAverageOrderValue },
      });
    }

    if (criteria.purchasedSince) {
      conditions.push({
        'purchases.lastPurchaseDate': { $gte: criteria.purchasedSince },
      });
    }

    const where: any = {};

    if (conditions.length > 0) {
      where.$and = conditions;
    }

    if (criteria.favoriteCategories && criteria.favoriteCategories.length > 0) {
      where['purchases.favoriteCategories'] = {
        $in: criteria.favoriteCategories,
      };
    }

    return this.findAll({
      where,
      orderBy: [{ field: 'purchases.totalSpent', direction: 'desc' }],
    });
  }

  /**
   * Geographic and preference filtering
   */
  async findByLocationAndPreferences(criteria: {
    countries?: string[];
    cities?: string[];
    languages?: string[];
    themes?: ('light' | 'dark')[];
    timezones?: string[];
    marketingOptIn?: boolean;
  }): Promise<FilterUserEntity[]> {
    const where: any = {};

    if (criteria.countries && criteria.countries.length > 0) {
      where['profile.location.country'] = { $in: criteria.countries };
    }

    if (criteria.cities && criteria.cities.length > 0) {
      where['profile.location.city'] = { $in: criteria.cities };
    }

    if (criteria.languages && criteria.languages.length > 0) {
      where['preferences.language'] = { $in: criteria.languages };
    }

    if (criteria.themes && criteria.themes.length > 0) {
      where['preferences.theme'] = { $in: criteria.themes };
    }

    if (criteria.timezones && criteria.timezones.length > 0) {
      where['preferences.timezone'] = { $in: criteria.timezones };
    }

    if (criteria.marketingOptIn !== undefined) {
      where['settings.marketingOptIn'] = criteria.marketingOptIn;
    }

    return this.findAll({ where });
  }

  /**
   * Complex user behavior filtering
   */
  async findByBehaviorPattern(criteria: {
    featuresUsed?: string[];
    minLoginCount?: number;
    ageRange?: { min: number; max: number };
    joinedAfter?: string;
    notificationPreferences?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
    };
  }): Promise<FilterUserEntity[]> {
    const where: any = {};

    if (criteria.featuresUsed && criteria.featuresUsed.length > 0) {
      where['activity.featuresUsed'] = { $in: criteria.featuresUsed };
    }

    if (criteria.minLoginCount) {
      where['activity.loginCount'] = { $gte: criteria.minLoginCount };
    }

    if (criteria.ageRange) {
      where.age = {
        $gte: criteria.ageRange.min,
        $lte: criteria.ageRange.max,
      };
    }

    if (criteria.joinedAfter) {
      where.joinDate = { $gte: criteria.joinedAfter };
    }

    if (criteria.notificationPreferences) {
      if (criteria.notificationPreferences.email !== undefined) {
        where['preferences.notifications.email'] =
          criteria.notificationPreferences.email;
      }
      if (criteria.notificationPreferences.push !== undefined) {
        where['preferences.notifications.push'] =
          criteria.notificationPreferences.push;
      }
      if (criteria.notificationPreferences.sms !== undefined) {
        where['preferences.notifications.sms'] =
          criteria.notificationPreferences.sms;
      }
    }

    return this.findAll({ where });
  }
}

// ============================================================================
// 4. METADATA FILTERING DEMONSTRATION SERVICE
// ============================================================================

/**
 * Service demonstrating comprehensive metadata filtering patterns
 */
@Injectable()
export class MetadataFilteringDemoService implements OnModuleInit {
  constructor(
    private readonly productRepo: FilterProductRepository,
    private readonly userRepo: FilterUserRepository
  ) {}

  async onModuleInit() {
    console.log('\n🎯 Metadata Filtering Patterns Demo\n');
    await this.setupTestData();
    await this.demonstrateRangeQueries();
    await this.demonstrateArrayOperations();
    await this.demonstrateLogicalOperators();
    await this.demonstrateTextMatching();
    await this.demonstrateNestedFiltering();
    await this.demonstrateComplexBusinessLogic();
    await this.demonstratePerformanceOptimization();
    await this.cleanup();
  }

  /**
   * Setup comprehensive test data
   */
  private async setupTestData(): Promise<void> {
    console.log('📦 Setting up comprehensive test data...');

    try {
      // Create diverse product catalog
      const products: CreateDocumentInput<FilterProductEntity>[] = [
        {
          content: 'Premium wireless headphones with active noise cancellation',
          metadata: {
            name: 'WH-1000XM5 Wireless Headphones',
            description:
              'Industry-leading noise canceling with premium comfort',
            brand: 'Sony',
            category: 'Electronics',
            subcategory: 'Audio',
            price: 399.99,
            currency: 'USD',
            salePrice: 349.99,
            inStock: true,
            stockLevel: 25,
            tags: ['wireless', 'noise-canceling', 'premium', 'bluetooth'],
            features: [
              'Active Noise Cancellation',
              '30h Battery',
              'Quick Charge',
              'Touch Controls',
            ],
            colors: ['Black', 'Silver'],
            sizes: ['One Size'],
            rating: 4.6,
            reviewCount: 1247,
            releaseDate: '2023-05-15',
            lastUpdated: '2024-02-01',
            weight: 0.25,
            dimensions: { length: 20, width: 18, height: 8 },
            manufacturer: {
              name: 'Sony Corporation',
              country: 'Japan',
              established: 1946,
            },
            warranty: { duration: 24, type: 'Limited' },
            availability: {
              regions: ['US', 'Europe', 'Asia'],
              exclusive: false,
            },
            certifications: ['CE', 'FCC', 'RoHS'],
            condition: 'new',
            seller: { id: 'seller-001', name: 'Electronics Plus', rating: 4.8 },
          },
        },
        {
          content:
            'Professional laptop for creative professionals and developers',
          metadata: {
            name: 'MacBook Pro 16" M2 Pro',
            description: 'Supercharged for pros with M2 Pro chip',
            brand: 'Apple',
            category: 'Computers',
            subcategory: 'Laptops',
            price: 2499.99,
            currency: 'USD',
            inStock: true,
            stockLevel: 8,
            tags: ['laptop', 'professional', 'creative', 'development'],
            features: [
              'M2 Pro Chip',
              '16GB RAM',
              '512GB SSD',
              'Liquid Retina XDR',
            ],
            colors: ['Space Gray', 'Silver'],
            sizes: ['16-inch'],
            rating: 4.9,
            reviewCount: 456,
            releaseDate: '2023-01-17',
            lastUpdated: '2024-01-15',
            weight: 2.15,
            dimensions: { length: 35.57, width: 24.81, height: 1.68 },
            manufacturer: {
              name: 'Apple Inc.',
              country: 'USA',
              established: 1976,
            },
            warranty: { duration: 12, type: 'Limited' },
            availability: { regions: ['Worldwide'], exclusive: true },
            certifications: ['Energy Star', 'EPEAT Gold'],
            condition: 'new',
            seller: { id: 'seller-002', name: 'Apple Store', rating: 4.9 },
          },
        },
        {
          content: 'Gaming mechanical keyboard with RGB lighting',
          metadata: {
            name: 'Corsair K95 RGB Platinum XT',
            description:
              'Premium mechanical gaming keyboard with dedicated media controls',
            brand: 'Corsair',
            category: 'Gaming',
            subcategory: 'Keyboards',
            price: 199.99,
            currency: 'USD',
            inStock: false,
            stockLevel: 0,
            tags: ['gaming', 'mechanical', 'rgb', 'programmable'],
            features: [
              'Cherry MX Speed',
              'RGB Lighting',
              'Dedicated Media Keys',
              'USB Passthrough',
            ],
            colors: ['Black'],
            sizes: ['Full Size'],
            rating: 4.4,
            reviewCount: 892,
            releaseDate: '2020-08-15',
            lastUpdated: '2024-01-20',
            weight: 1.37,
            dimensions: { length: 46.4, width: 17.1, height: 3.8 },
            manufacturer: {
              name: 'Corsair Gaming Inc.',
              country: 'USA',
              established: 1994,
            },
            warranty: { duration: 24, type: 'Limited' },
            availability: { regions: ['US', 'Europe'], exclusive: false },
            certifications: ['CE', 'FCC'],
            condition: 'new',
            seller: { id: 'seller-003', name: 'Gaming Gear Pro', rating: 4.5 },
          },
        },
        {
          content: 'Budget smartphone with good camera and battery life',
          metadata: {
            name: 'Pixel 7a',
            description: 'Google Pixel 7a with advanced camera features',
            brand: 'Google',
            category: 'Electronics',
            subcategory: 'Smartphones',
            price: 499.99,
            currency: 'USD',
            salePrice: 399.99,
            inStock: true,
            stockLevel: 45,
            tags: ['smartphone', 'camera', 'android', 'budget'],
            features: [
              '64MP Camera',
              '5G',
              'Wireless Charging',
              'Titan M Security',
            ],
            colors: ['Charcoal', 'Snow', 'Sea', 'Coral'],
            sizes: ['6.1-inch'],
            rating: 4.3,
            reviewCount: 2156,
            releaseDate: '2023-05-11',
            lastUpdated: '2024-02-10',
            weight: 0.193,
            dimensions: { length: 15.24, width: 7.35, height: 0.91 },
            manufacturer: {
              name: 'Google LLC',
              country: 'USA',
              established: 1998,
            },
            warranty: { duration: 12, type: 'Limited' },
            availability: {
              regions: ['US', 'Europe', 'Asia'],
              exclusive: false,
            },
            certifications: ['FCC', 'CE', 'ENERGY STAR'],
            condition: 'new',
            seller: { id: 'seller-004', name: 'Mobile World', rating: 4.2 },
          },
        },
        {
          content: 'Vintage refurbished vinyl record player',
          metadata: {
            name: 'Technics SL-1200MK7 Turntable',
            description:
              'Professional DJ turntable, refurbished to perfect condition',
            brand: 'Technics',
            category: 'Audio',
            subcategory: 'Turntables',
            price: 899.99,
            currency: 'USD',
            inStock: true,
            stockLevel: 3,
            tags: ['vinyl', 'dj', 'turntable', 'professional', 'vintage'],
            features: [
              'Direct Drive',
              'Pitch Control',
              'Reverse Play',
              'Anti-Skate',
            ],
            colors: ['Black', 'Silver'],
            sizes: ['Standard'],
            rating: 4.8,
            reviewCount: 89,
            releaseDate: '2019-08-30',
            lastUpdated: '2024-01-25',
            weight: 9.6,
            dimensions: { length: 45.3, width: 35.3, height: 16.9 },
            manufacturer: {
              name: 'Panasonic Corporation',
              country: 'Japan',
              established: 1918,
            },
            warranty: { duration: 6, type: 'Refurbished' },
            availability: { regions: ['US', 'Europe'], exclusive: false },
            certifications: ['CE'],
            condition: 'refurbished',
            seller: {
              id: 'seller-005',
              name: 'Vintage Audio Co.',
              rating: 4.7,
            },
          },
        },
      ];

      const createdProducts = await this.productRepo.createMany(products);
      console.log(`  ✅ Created ${createdProducts.successCount} test products`);

      // Create diverse user profiles
      const users: CreateDocumentInput<FilterUserEntity>[] = [
        {
          content: 'Tech enthusiast and software developer from San Francisco',
          metadata: {
            name: 'Alex Chen',
            email: 'alex.chen@example.com',
            age: 28,
            joinDate: '2022-03-15',
            lastLoginDate: '2024-02-01',
            accountType: 'premium',
            status: 'active',
            preferences: {
              language: 'en',
              timezone: 'America/Los_Angeles',
              theme: 'dark',
              notifications: { email: true, push: true, sms: false },
            },
            profile: {
              bio: 'Full-stack developer passionate about AI and machine learning',
              interests: ['technology', 'ai', 'programming', 'gaming'],
              skills: ['JavaScript', 'Python', 'React', 'Node.js'],
              experience: 5,
              location: {
                country: 'USA',
                city: 'San Francisco',
                region: 'California',
              },
            },
            activity: {
              loginCount: 245,
              lastActiveDate: '2024-02-01',
              engagementScore: 89.5,
              featuresUsed: ['dashboard', 'api', 'analytics', 'collaboration'],
            },
            purchases: {
              totalSpent: 2850.75,
              orderCount: 12,
              averageOrderValue: 237.56,
              lastPurchaseDate: '2024-01-20',
              favoriteCategories: ['Electronics', 'Books', 'Software'],
            },
            settings: {
              privacyLevel: 'public',
              marketingOptIn: true,
              dataProcessingConsent: true,
              newsletterSubscribed: true,
            },
          },
        },
        {
          content:
            'Marketing professional from London interested in design and creativity',
          metadata: {
            name: 'Sarah Wilson',
            email: 'sarah.wilson@example.com',
            age: 32,
            joinDate: '2021-07-22',
            lastLoginDate: '2024-01-30',
            accountType: 'enterprise',
            status: 'active',
            preferences: {
              language: 'en',
              timezone: 'Europe/London',
              theme: 'light',
              notifications: { email: true, push: false, sms: true },
            },
            profile: {
              bio: 'Creative marketing professional with focus on digital campaigns',
              interests: ['marketing', 'design', 'photography', 'travel'],
              skills: [
                'Marketing',
                'Adobe Creative Suite',
                'Analytics',
                'Strategy',
              ],
              experience: 8,
              location: { country: 'UK', city: 'London', region: 'England' },
            },
            activity: {
              loginCount: 156,
              lastActiveDate: '2024-01-30',
              engagementScore: 76.2,
              featuresUsed: ['campaigns', 'analytics', 'reports', 'team'],
            },
            purchases: {
              totalSpent: 4250.0,
              orderCount: 18,
              averageOrderValue: 236.11,
              lastPurchaseDate: '2024-01-15',
              favoriteCategories: ['Design', 'Marketing', 'Education'],
            },
            settings: {
              privacyLevel: 'friends',
              marketingOptIn: true,
              dataProcessingConsent: true,
              newsletterSubscribed: true,
            },
          },
        },
        {
          content: 'Recent graduate exploring career opportunities',
          metadata: {
            name: 'Jordan Martinez',
            email: 'jordan.martinez@example.com',
            age: 22,
            joinDate: '2024-01-10',
            lastLoginDate: '2024-01-25',
            accountType: 'free',
            status: 'active',
            preferences: {
              language: 'es',
              timezone: 'America/Mexico_City',
              theme: 'dark',
              notifications: { email: false, push: true, sms: false },
            },
            profile: {
              bio: 'Recent computer science graduate looking for opportunities',
              interests: ['programming', 'gaming', 'music', 'sports'],
              skills: ['Java', 'C++', 'Database Design'],
              experience: 1,
              location: {
                country: 'Mexico',
                city: 'Mexico City',
                region: 'CDMX',
              },
            },
            activity: {
              loginCount: 15,
              lastActiveDate: '2024-01-25',
              engagementScore: 45.8,
              featuresUsed: ['profile', 'search', 'messages'],
            },
            purchases: {
              totalSpent: 89.99,
              orderCount: 2,
              averageOrderValue: 45.0,
              lastPurchaseDate: '2024-01-18',
              favoriteCategories: ['Books', 'Gaming'],
            },
            settings: {
              privacyLevel: 'private',
              marketingOptIn: false,
              dataProcessingConsent: true,
              newsletterSubscribed: false,
            },
          },
        },
        {
          content: 'Retired teacher with interests in gardening and reading',
          metadata: {
            name: 'Margaret Johnson',
            email: 'margaret.johnson@example.com',
            age: 67,
            joinDate: '2020-09-05',
            lastLoginDate: '2024-01-28',
            accountType: 'free',
            status: 'active',
            preferences: {
              language: 'en',
              timezone: 'America/New_York',
              theme: 'light',
              notifications: { email: true, push: false, sms: false },
            },
            profile: {
              bio: 'Retired educator with passion for gardening and literature',
              interests: ['gardening', 'reading', 'cooking', 'family'],
              skills: ['Teaching', 'Writing', 'Gardening'],
              experience: 35,
              location: {
                country: 'USA',
                city: 'Boston',
                region: 'Massachusetts',
              },
            },
            activity: {
              loginCount: 89,
              lastActiveDate: '2024-01-28',
              engagementScore: 62.3,
              featuresUsed: ['reading', 'community', 'forums'],
            },
            purchases: {
              totalSpent: 567.45,
              orderCount: 8,
              averageOrderValue: 70.93,
              lastPurchaseDate: '2024-01-10',
              favoriteCategories: ['Books', 'Garden', 'Home'],
            },
            settings: {
              privacyLevel: 'friends',
              marketingOptIn: false,
              dataProcessingConsent: true,
              newsletterSubscribed: true,
            },
          },
        },
      ];

      const createdUsers = await this.userRepo.createMany(users);
      console.log(`  ✅ Created ${createdUsers.successCount} test users`);
    } catch (error) {
      console.error(
        '  ❌ Error setting up test data:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates range queries for numerical and date fields
   */
  private async demonstrateRangeQueries(): Promise<void> {
    console.log('📊 Range Queries Demo:');

    try {
      // Price range filtering
      console.log('  💰 Price Range Filtering:');

      const budgetProducts = await this.productRepo.findByPriceRange(0, 500, {
        currency: 'USD',
        inStockOnly: true,
      });
      console.log(
        `    💸 Budget products ($0-$500, in stock): ${budgetProducts.length} found`
      );

      const premiumProducts = await this.productRepo.findByPriceRange(
        1000,
        5000,
        {
          currency: 'USD',
        }
      );
      console.log(
        `    💎 Premium products ($1000-$5000): ${premiumProducts.length} found`
      );

      const saleProducts = await this.productRepo.findByPriceRange(100, 1000, {
        includeOnSale: true,
        inStockOnly: true,
      });
      console.log(
        `    🏷️  Sale products ($100-$1000, on sale, in stock): ${saleProducts.length} found`
      );

      // Date range filtering
      console.log('  📅 Date Range Filtering:');

      const recentProducts = await this.productRepo.findByDateRange(
        '2023-01-01',
        '2024-12-31',
        'releaseDate'
      );
      console.log(
        `    🆕 Products released 2023-2024: ${recentProducts.length} found`
      );

      const recentlyUpdated = await this.productRepo.findByDateRange(
        '2024-01-01',
        '2024-12-31',
        'lastUpdated'
      );
      console.log(
        `    🔄 Products updated in 2024: ${recentlyUpdated.length} found`
      );

      // Age range filtering for users
      console.log('  🎂 User Age Range Filtering:');

      const youngUsers = await this.userRepo.findByBehaviorPattern({
        ageRange: { min: 18, max: 30 },
      });
      console.log(`    👶 Young users (18-30): ${youngUsers.length} found`);

      const experiencedUsers = await this.userRepo.findByBehaviorPattern({
        ageRange: { min: 50, max: 100 },
      });
      console.log(
        `    👴 Experienced users (50+): ${experiencedUsers.length} found`
      );
    } catch (error) {
      console.error(
        '  ❌ Error in range queries:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates array operations and set-based filtering
   */
  private async demonstrateArrayOperations(): Promise<void> {
    console.log('📋 Array Operations Demo:');

    try {
      // Tag-based filtering
      console.log('  🏷️  Tag-based Filtering:');

      const wirelessProducts = await this.productRepo.findByTags(
        ['wireless', 'bluetooth'],
        'any'
      );
      console.log(
        `    📡 Products with wireless OR bluetooth: ${wirelessProducts.length} found`
      );

      const premiumWireless = await this.productRepo.findByTags(
        ['wireless', 'premium'],
        'all'
      );
      console.log(
        `    💎 Products with wireless AND premium: ${premiumWireless.length} found`
      );

      const nonGamingProducts = await this.productRepo.findByTags(
        ['gaming'],
        'none'
      );
      console.log(
        `    🚫 Non-gaming products: ${nonGamingProducts.length} found`
      );

      // Features and colors filtering
      console.log('  🎨 Features and Colors Filtering:');

      const blackHeadphones = await this.productRepo.findByFeaturesAndColors(
        ['Active Noise Cancellation'],
        ['Black'],
        true
      );
      console.log(
        `    🎧 Black products with ANC: ${blackHeadphones.length} found`
      );

      const colorfulGadgets = await this.productRepo.findByFeaturesAndColors(
        ['RGB Lighting', 'Wireless'],
        ['Black', 'Silver'],
        false
      );
      console.log(
        `    🌈 Colorful gadgets with RGB/Wireless: ${colorfulGadgets.length} found`
      );

      // User interests filtering
      console.log('  🎯 User Interest Filtering:');

      const techUsers = await this.userRepo.findByBehaviorPattern({
        featuresUsed: ['api', 'analytics', 'dashboard'],
      });
      console.log(`    💻 Tech-savvy users: ${techUsers.length} found`);

      techUsers.forEach((user) => {
        console.log(
          `      👤 ${
            user.metadata.name
          }: ${user.metadata.profile.interests.join(', ')}`
        );
      });
    } catch (error) {
      console.error(
        '  ❌ Error in array operations:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates complex logical operators ($and, $or, $not)
   */
  private async demonstrateLogicalOperators(): Promise<void> {
    console.log('🔗 Logical Operators Demo:');

    try {
      // Complex product filtering with multiple conditions
      console.log('  📱 Premium Product Filtering:');

      const premiumElectronics = await this.productRepo.findPremiumProducts({
        minRating: 4.0,
        minReviews: 100,
        brands: ['Sony', 'Apple', 'Google'],
        excludeCategories: ['Gaming'],
        maxPrice: 3000,
        inStockOnly: true,
      });

      console.log(
        `    ⭐ Premium electronics found: ${premiumElectronics.length}`
      );
      premiumElectronics.forEach((product) => {
        console.log(`      📦 ${product.metadata.name}`);
        console.log(
          `         💰 $${product.metadata.price} | ⭐ ${product.metadata.rating} | 💬 ${product.metadata.reviewCount} reviews`
        );
        console.log(
          `         🏷️  ${product.metadata.brand} | ${product.metadata.category}`
        );
      });

      // User segmentation with complex criteria
      console.log('  👥 User Segmentation:');

      const highValueCustomers = await this.userRepo.findHighValueCustomers({
        minTotalSpent: 1000,
        minOrderCount: 5,
        minAverageOrderValue: 200,
        purchasedSince: '2023-01-01',
        favoriteCategories: ['Electronics', 'Software'],
      });

      console.log(`    💎 High-value customers: ${highValueCustomers.length}`);
      highValueCustomers.forEach((user) => {
        console.log(`      👤 ${user.metadata.name}`);
        console.log(
          `         💰 $${user.metadata.purchases.totalSpent} total | 📦 ${user.metadata.purchases.orderCount} orders`
        );
        console.log(
          `         📊 $${user.metadata.purchases.averageOrderValue.toFixed(
            2
          )} avg order`
        );
      });

      // Active users with engagement criteria
      console.log('  🚀 Active User Analysis:');

      const activeEngagedUsers = await this.userRepo.findActiveUsers({
        minEngagementScore: 70,
        loginsSince: '2024-01-01',
        accountTypes: ['premium', 'enterprise'],
        minExperience: 3,
      });

      console.log(
        `    📈 Highly engaged active users: ${activeEngagedUsers.length}`
      );
      activeEngagedUsers.forEach((user) => {
        console.log(
          `      👤 ${user.metadata.name} (${user.metadata.accountType})`
        );
        console.log(
          `         📊 ${user.metadata.activity.engagementScore} engagement | ${user.metadata.activity.loginCount} logins`
        );
        console.log(
          `         💼 ${user.metadata.profile.experience} years experience`
        );
      });
    } catch (error) {
      console.error(
        '  ❌ Error in logical operators:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates text matching patterns
   */
  private async demonstrateTextMatching(): Promise<void> {
    console.log('📝 Text Matching Demo:');

    try {
      // Product text pattern matching
      console.log('  🔍 Product Text Pattern Matching:');

      const audioProducts = await this.productRepo.findByTextPatterns({
        nameContains: 'Pro',
        descriptionContains: 'professional',
      });
      console.log(`    🎵 "Pro" audio products: ${audioProducts.length} found`);

      const nonAppleProducts = await this.productRepo.findByTextPatterns({
        brandNotContains: 'Apple',
        tagContains: 'wireless',
      });
      console.log(
        `    📱 Non-Apple wireless products: ${nonAppleProducts.length} found`
      );

      const gamingKeywords = await this.productRepo.findByTextPatterns({
        descriptionContains: 'gaming',
        tagContains: 'professional',
      });
      console.log(
        `    🎮 Professional gaming products: ${gamingKeywords.length} found`
      );

      // Show detailed results
      audioProducts.forEach((product) => {
        console.log(`      📦 ${product.metadata.name}`);
        console.log(
          `         📝 ${product.metadata.description.substring(0, 60)}...`
        );
        console.log(`         🏷️  Tags: ${product.metadata.tags.join(', ')}`);
      });
    } catch (error) {
      console.error(
        '  ❌ Error in text matching:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates nested metadata filtering
   */
  private async demonstrateNestedFiltering(): Promise<void> {
    console.log('🎭 Nested Metadata Filtering Demo:');

    try {
      // Manufacturer-based filtering
      console.log('  🏭 Manufacturer Filtering:');

      const japaneseProducts = await this.productRepo.findByManufacturer({
        country: 'Japan',
        establishedAfter: 1900,
      });
      console.log(
        `    🗾 Japanese products (est. after 1900): ${japaneseProducts.length} found`
      );

      const americanTech = await this.productRepo.findByManufacturer({
        country: 'USA',
        name: 'Apple',
      });
      console.log(
        `    🇺🇸 American Apple products: ${americanTech.length} found`
      );

      // Availability filtering
      console.log('  🌍 Availability Filtering:');

      const globalProducts = await this.productRepo.findByAvailability({
        regions: ['US', 'Europe', 'Asia'],
        stockLevel: { min: 10 },
      });
      console.log(
        `    🌐 Global products (stock ≥ 10): ${globalProducts.length} found`
      );

      const exclusiveProducts = await this.productRepo.findByAvailability({
        exclusiveOnly: true,
        stockLevel: { min: 1 },
      });
      console.log(
        `    💎 Exclusive products in stock: ${exclusiveProducts.length} found`
      );

      // User location and preference filtering
      console.log('  📍 User Location & Preferences:');

      const usUsers = await this.userRepo.findByLocationAndPreferences({
        countries: ['USA'],
        themes: ['dark'],
        marketingOptIn: true,
      });
      console.log(
        `    🇺🇸 US users (dark theme, marketing opt-in): ${usUsers.length} found`
      );

      const europeanUsers = await this.userRepo.findByLocationAndPreferences({
        countries: ['UK'],
        languages: ['en'],
        timezones: ['Europe/London'],
      });
      console.log(`    🇬🇧 UK English users: ${europeanUsers.length} found`);

      // Show detailed location info
      usUsers.forEach((user) => {
        console.log(`      👤 ${user.metadata.name}`);
        console.log(
          `         📍 ${user.metadata.profile.location.city}, ${user.metadata.profile.location.region}`
        );
        console.log(
          `         🎨 Theme: ${user.metadata.preferences.theme} | 📧 Marketing: ${user.metadata.settings.marketingOptIn}`
        );
      });
    } catch (error) {
      console.error(
        '  ❌ Error in nested filtering:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates complex business logic filtering scenarios
   */
  private async demonstrateComplexBusinessLogic(): Promise<void> {
    console.log('🧠 Complex Business Logic Demo:');

    try {
      // E-commerce recommendation logic
      console.log('  🛒 E-commerce Recommendations:');

      // Find products for tech enthusiasts
      const techEnthusiastProducts = await this.productRepo.findAll({
        where: {
          $and: [
            {
              $or: [
                { category: 'Electronics' },
                { category: 'Computers' },
                { tags: { $in: ['tech'] } },
              ],
            },
            { rating: { $gte: 4.0 } },
            { inStock: true },
            {
              $or: [{ price: { $lte: 1000 } }, { salePrice: { $lte: 1000 } }],
            },
          ],
        },
      });

      console.log(
        `    💻 Tech products for enthusiasts: ${techEnthusiastProducts.length} found`
      );

      // User engagement scoring
      console.log('  📊 User Engagement Analysis:');

      const engagedUsers = await this.userRepo.findAll({
        where: {
          $and: [
            { status: 'active' },
            {
              $or: [
                { 'activity.engagementScore': { $gte: 80 } },
                {
                  $and: [
                    { 'activity.loginCount': { $gte: 50 } },
                    { 'purchases.orderCount': { $gte: 5 } },
                  ],
                },
              ],
            },
            { 'settings.marketingOptIn': true },
          ],
        },
      });

      console.log(`    🚀 Highly engaged users: ${engagedUsers.length} found`);

      // Customer lifecycle segmentation
      console.log('  🔄 Customer Lifecycle Segmentation:');

      // New customers (joined recently, low activity)
      const newCustomers = await this.userRepo.findAll({
        where: {
          $and: [
            { joinDate: { $gte: '2024-01-01' } },
            { 'activity.loginCount': { $lte: 20 } },
            { status: 'active' },
          ],
        },
      });

      // VIP customers (high value, long tenure)
      const vipCustomers = await this.userRepo.findAll({
        where: {
          $and: [
            { joinDate: { $lte: '2022-12-31' } },
            { 'purchases.totalSpent': { $gte: 2000 } },
            { accountType: { $in: ['premium', 'enterprise'] } },
            { 'activity.engagementScore': { $gte: 70 } },
          ],
        },
      });

      // At-risk customers (inactive, but valuable)
      const atRiskCustomers = await this.userRepo.findAll({
        where: {
          $and: [
            { 'purchases.totalSpent': { $gte: 500 } },
            { 'activity.lastActiveDate': { $lte: '2024-01-15' } },
            { status: 'active' },
            { 'activity.engagementScore': { $lte: 50 } },
          ],
        },
      });

      console.log(`    🆕 New customers: ${newCustomers.length}`);
      console.log(`    👑 VIP customers: ${vipCustomers.length}`);
      console.log(`    ⚠️  At-risk customers: ${atRiskCustomers.length}`);

      // Detailed analysis
      if (vipCustomers.length > 0) {
        console.log('    👑 VIP Customer Details:');
        vipCustomers.forEach((user) => {
          console.log(
            `      👤 ${user.metadata.name} (${user.metadata.accountType})`
          );
          console.log(
            `         💰 $${user.metadata.purchases.totalSpent} spent | 📊 ${user.metadata.activity.engagementScore} engagement`
          );
          console.log(`         📅 Member since: ${user.metadata.joinDate}`);
        });
      }
    } catch (error) {
      console.error(
        '  ❌ Error in complex business logic:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates performance optimization for filtered queries
   */
  private async demonstratePerformanceOptimization(): Promise<void> {
    console.log('⚡ Performance Optimization Demo:');

    try {
      console.log('  📊 Query Performance Comparison:');

      // Simple vs. complex query performance
      const simpleQueryStart = Date.now();
      const simpleResults = await this.productRepo.findAll({
        where: { inStock: true },
        limit: 10,
      });
      const simpleQueryTime = Date.now() - simpleQueryStart;

      const complexQueryStart = Date.now();
      const complexResults = await this.productRepo.findAll({
        where: {
          $and: [
            { inStock: true },
            { rating: { $gte: 4.0 } },
            {
              $or: [{ category: 'Electronics' }, { category: 'Computers' }],
            },
            { price: { $lte: 2000 } },
          ],
        },
        limit: 10,
      });
      const complexQueryTime = Date.now() - complexQueryStart;

      console.log(
        `    🚀 Simple query (inStock only): ${simpleResults.length} results in ${simpleQueryTime}ms`
      );
      console.log(
        `    🧠 Complex query (multiple conditions): ${complexResults.length} results in ${complexQueryTime}ms`
      );

      // Index effectiveness simulation
      console.log('  📋 Filter Optimization Tips:');
      console.log(
        '    ✅ Use indexed fields (like price, rating) for better performance'
      );
      console.log('    ✅ Place selective filters first in $and conditions');
      console.log(
        '    ✅ Use specific values over range queries when possible'
      );
      console.log('    ✅ Limit result sets to reduce memory usage');
      console.log('    ⚠️  Avoid $or with many conditions on unindexed fields');
      console.log('    ⚠️  Be cautious with $not operators on large datasets');

      // Memory-efficient counting
      console.log('  🔢 Efficient Counting:');

      const countStart = Date.now();
      const totalCount = await this.productRepo.count();
      const countTime = Date.now() - countStart;

      const inStockCount = await this.productRepo.count({ inStock: true });
      const expensiveCount = await this.productRepo.count({
        price: { $gte: 1000 },
      });

      console.log(`    📊 Total products: ${totalCount} (${countTime}ms)`);
      console.log(`    ✅ In stock: ${inStockCount}`);
      console.log(`    💎 Expensive (≥$1000): ${expensiveCount}`);
    } catch (error) {
      console.error(
        '  ❌ Error in performance optimization demo:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Cleanup test data
   */
  private async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test data...');

    try {
      await this.productRepo.clear();
      console.log('  ✅ Cleared products collection');

      await this.userRepo.clear();
      console.log('  ✅ Cleared users collection');
    } catch (error) {
      console.error(
        '  ❌ Error during cleanup:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }
}

// ============================================================================
// 5. MODULE DEFINITION
// ============================================================================

@Module({
  imports: [
    ChromaDBModule.forRoot({
      connection: {
        host: process.env.CHROMADB_HOST || 'localhost',
        port: parseInt(process.env.CHROMADB_PORT || '8000', 10),
        ssl: false,
      },
      embedding: {
        provider: 'openai',
        config: {
          apiKey: process.env.OPENAI_API_KEY || 'test-key',
          model: 'text-embedding-3-small',
        },
      },
      enableHealthCheck: false,
    }),
  ],
  providers: [
    FilterProductRepository,
    FilterUserRepository,
    MetadataFilteringDemoService,
  ],
  exports: [FilterProductRepository, FilterUserRepository],
})
export class MetadataFilteringExampleModule {}

// ============================================================================
// 6. METADATA FILTERING BEST PRACTICES
// ============================================================================

/**
 * Metadata Filtering Best Practices:
 *
 * 1. **Filter Design**: Structure metadata for common query patterns
 * 2. **Performance**: Use selective filters early in $and conditions
 * 3. **Indexing**: Consider which fields need fast access for filtering
 * 4. **Complexity**: Balance query complexity with performance needs
 * 5. **Validation**: Validate filter inputs to prevent injection attacks
 * 6. **Caching**: Cache frequently used filter combinations
 * 7. **Monitoring**: Track slow queries and optimize accordingly
 * 8. **Documentation**: Document complex filter logic for maintainability
 *
 * Common Patterns:
 *
 * ```typescript
 * // ✅ Efficient filtering with selective conditions
 * const where = {
 *   $and: [
 *     { inStock: true },           // Highly selective first
 *     { price: { $lte: 1000 } },   // Range filter
 *     { category: { $in: cats } }, // Set membership
 *   ],
 * };
 *
 * // ✅ Proper date range filtering
 * const dateFilter = {
 *   createdAt: {
 *     $gte: startDate,
 *     $lte: endDate,
 *   },
 * };
 *
 * // ✅ Safe array operations
 * const arrayFilter = {
 *   tags: { $in: allowedTags },
 *   excludedTags: { $nin: forbiddenTags },
 * };
 * ```
 */
