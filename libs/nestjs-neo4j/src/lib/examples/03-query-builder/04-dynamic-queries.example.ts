/**
 * @fileoverview Dynamic Query Construction Examples
 * 
 * Demonstrates runtime query building based on conditions, search interfaces,
 * filtering systems, conditional query clauses, and user-driven query construction
 * using the Neo4j Query Builder.
 */

import { Injectable } from '@nestjs/common';
import { Neo4jQueryBuilder, createQueryBuilder } from '../../query-builder/neo4j-query-builder';
import type { Neo4jCompatibleEntity } from '../../types/neo4j-types';
import { CypherQuery } from '../../decorators/cypher-query.decorator';
import { User } from '../shared/entities/basic/user.entity';
import { Post } from '../shared/entities/intermediate/post.entity';

/**
 * Dynamic Query Construction using Decorated Entity Classes
 * 
 * Uses shared decorated entity classes for type safety:
 * - User: Includes proper preferences as JsonProperty, Date types for timestamps
 * - Post: Includes tags as JsonProperty, social engagement features
 * 
 * All complex objects are properly handled with @JsonProperty decorators
    language: string;
  };
}

interface Post extends Neo4jCompatibleEntity {
  id?: string;
  title: string;
  content: string;
  published: boolean;
  authorId: string;
  categoryId: string;
  tags: string[];
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt?: string;
  createdAt?: Date;
  featured: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number;
}

import { Neo4jEntity } from '../../decorators/entity.decorator';
@Neo4jEntity('Company')
export class Company {
  id?: string;
  name: string;
  industry: string;
  foundedYear: number;
  employees: number;
  headquarters: string;
  revenue?: number;
  isPublic: boolean;
  stockSymbol?: string;
  technologies: string[];
  benefits: string[];
}

/**
 * Search and filter interfaces for dynamic queries
 */
interface UserSearchFilters {
  // Basic filters
  searchTerm?: string;
  roles?: User['role'][];
  isActive?: boolean;
  
  // Reputation filters
  minReputation?: number;
  maxReputation?: number;
  
  // Skills filters
  requiredSkills?: string[];
  optionalSkills?: string[];
  skillsMatchMode?: 'all' | 'any' | 'exact';
  
  // Location filters
  cities?: string[];
  countries?: string[];
  timezones?: string[];
  
  // Date filters
  joinedAfter?: string;
  joinedBefore?: string;
  lastActiveAfter?: string;
  
  // Preference filters
  theme?: 'light' | 'dark';
  notificationsEnabled?: boolean;
  languages?: string[];
  
  // Sorting options
  sortBy?: 'firstName' | 'lastName' | 'reputation' | 'joinedAt' | 'lastActiveAt';
  sortDirection?: 'ASC' | 'DESC';
  
  // Pagination
  page?: number;
  limit?: number;
}

interface PostSearchFilters {
  searchTerm?: string;
  authorIds?: string[];
  categoryIds?: string[];
  tags?: string[];
  tagsMatchMode?: 'all' | 'any';
  
  published?: boolean;
  featured?: boolean;
  difficulty?: Post['difficulty'][];
  
  minViews?: number;
  minLikes?: number;
  minComments?: number;
  maxReadTime?: number;
  
  publishedAfter?: string;
  publishedBefore?: string;
  
  sortBy?: 'publishedAt' | 'viewCount' | 'likeCount' | 'commentCount' | 'title';
  sortDirection?: 'ASC' | 'DESC';
  
  page?: number;
  limit?: number;
}

interface CompanySearchFilters {
  searchTerm?: string;
  industries?: string[];
  
  minEmployees?: number;
  maxEmployees?: number;
  minRevenue?: number;
  maxRevenue?: number;
  
  isPublic?: boolean;
  hasStockSymbol?: boolean;
  
  foundedAfter?: number;
  foundedBefore?: number;
  
  technologies?: string[];
  technologiesMatchMode?: 'all' | 'any';
  
  benefits?: string[];
  
  headquarters?: string[];
  
  sortBy?: 'name' | 'employees' | 'revenue' | 'foundedYear';
  sortDirection?: 'ASC' | 'DESC';
  
  page?: number;
  limit?: number;
}

/**
 * Dynamic Query Construction Service
 * 
 * Demonstrates sophisticated runtime query building including:
 * - Conditional query construction
 * - Complex search interfaces
 * - Filter composition
 * - Dynamic sorting and pagination
 * - User-driven query building
 */
@Injectable()
export class DynamicQueryService {
  constructor(private readonly queryBuilder: Neo4jQueryBuilder) {}

  // ============================================================================
  // 1. DYNAMIC USER SEARCH
  // ============================================================================

  /**
   * Comprehensive user search with dynamic filtering
   * Builds queries based on provided filter criteria
   */
  @CypherQuery({ cache: '5m', description: 'Dynamic user search with filters' })
  async searchUsers(filters: UserSearchFilters = {}) {
    let builder = createQueryBuilder<User>()
      .match('u', () => User);

    // Apply basic filters
    if (filters.isActive !== undefined) {
      builder = builder.where('u.isActive', '=', filters.isActive);
    }

    if (filters.roles && filters.roles.length > 0) {
      builder = builder.whereRaw('u.role IN $roles', { roles: filters.roles });
    }

    // Apply reputation filters
    if (filters.minReputation !== undefined) {
      builder = builder.and('u.reputation', '>=', filters.minReputation);
    }

    if (filters.maxReputation !== undefined) {
      builder = builder.and('u.reputation', '<=', filters.maxReputation);
    }

    // Apply skills filters
    if (filters.requiredSkills && filters.requiredSkills.length > 0) {
      if (filters.skillsMatchMode === 'all' || !filters.skillsMatchMode) {
        builder = builder.whereRaw('ALL(skill IN $requiredSkills WHERE skill IN u.skills)', {
          requiredSkills: filters.requiredSkills
        });
      } else if (filters.skillsMatchMode === 'any') {
        builder = builder.whereRaw('ANY(skill IN $requiredSkills WHERE skill IN u.skills)', {
          requiredSkills: filters.requiredSkills
        });
      } else if (filters.skillsMatchMode === 'exact') {
        builder = builder.whereRaw('u.skills = $requiredSkills', {
          requiredSkills: filters.requiredSkills
        });
      }
    }

    if (filters.optionalSkills && filters.optionalSkills.length > 0) {
      builder = builder.whereRaw('ANY(skill IN $optionalSkills WHERE skill IN u.skills)', {
        optionalSkills: filters.optionalSkills
      });
    }

    // Apply location filters
    if (filters.cities && filters.cities.length > 0) {
      builder = builder.whereRaw('u.location.city IN $cities', { cities: filters.cities });
    }

    if (filters.countries && filters.countries.length > 0) {
      builder = builder.whereRaw('u.location.country IN $countries', { countries: filters.countries });
    }

    if (filters.timezones && filters.timezones.length > 0) {
      builder = builder.whereRaw('u.location.timezone IN $timezones', { timezones: filters.timezones });
    }

    // Apply date filters
    if (filters.joinedAfter) {
      builder = builder.and('u.joinedAt', '>=', filters.joinedAfter);
    }

    if (filters.joinedBefore) {
      builder = builder.and('u.joinedAt', '<=', filters.joinedBefore);
    }

    if (filters.lastActiveAfter) {
      builder = builder.whereRaw('u.lastActiveAt >= $lastActiveAfter', {
        lastActiveAfter: filters.lastActiveAfter
      });
    }

    // Apply preference filters
    if (filters.theme) {
      builder = builder.whereRaw('u.preferences.theme = $theme', { theme: filters.theme });
    }

    if (filters.notificationsEnabled !== undefined) {
      builder = builder.whereRaw('u.preferences.notifications = $notificationsEnabled', {
        notificationsEnabled: filters.notificationsEnabled
      });
    }

    if (filters.languages && filters.languages.length > 0) {
      builder = builder.whereRaw('u.preferences.language IN $languages', {
        languages: filters.languages
      });
    }

    // Apply text search
    if (filters.searchTerm) {
      const searchTermLower = filters.searchTerm.toLowerCase();
      builder = builder.whereRaw(`
        toLower(u.firstName) CONTAINS $searchTerm OR 
        toLower(u.lastName) CONTAINS $searchTerm OR 
        toLower(u.email) CONTAINS $searchTerm OR
        ANY(skill IN u.skills WHERE toLower(skill) CONTAINS $searchTerm)
      `, { searchTerm: searchTermLower });
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'firstName';
    const sortDirection = filters.sortDirection || 'ASC';
    builder = builder.orderBy(`u.${sortBy}` as any, sortDirection);

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    builder = builder.paginate(page, limit);

    return builder
      .return(`
        u {
          .id,
          .email,
          .firstName,
          .lastName,
          .role,
          .isActive,
          .reputation,
          .skills,
          .location,
          .joinedAt,
          .lastActiveAt
        } as user
      `)
      .build();
  }

  /**
   * Get total count for paginated user search
   * Reuses filter logic but returns count instead of results
   */
  @CypherQuery({ cache: '5m', description: 'Count users matching search filters' })
  async countUsersMatchingFilters(filters: UserSearchFilters = {}) {
    let builder = createQueryBuilder<User>()
      .match('u', () => User);

    // Apply same filters as searchUsers (without pagination and sorting)
    builder = this.applyUserFilters(builder, filters);

    return builder.return('COUNT(u) as totalCount').build();
  }

  // ============================================================================
  // 2. DYNAMIC POST SEARCH
  // ============================================================================

  /**
   * Advanced post search with content analysis
   * Demonstrates complex content filtering and ranking
   */
  @CypherQuery({ cache: '3m', description: 'Dynamic post search with content analysis' })
  async searchPosts(filters: PostSearchFilters = {}) {
    let builder = createQueryBuilder<Post>()
      .match('p', () => Post);

    // Basic status filters
    if (filters.published !== undefined) {
      builder = builder.where('p.published', '=', filters.published);
    }

    if (filters.featured !== undefined) {
      builder = builder.and('p.featured', '=', filters.featured);
    }

    // Author filters
    if (filters.authorIds && filters.authorIds.length > 0) {
      builder = builder.whereRaw('p.authorId IN $authorIds', { authorIds: filters.authorIds });
    }

    // Category filters
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      builder = builder.whereRaw('p.categoryId IN $categoryIds', { categoryIds: filters.categoryIds });
    }

    // Tag filters
    if (filters.tags && filters.tags.length > 0) {
      if (filters.tagsMatchMode === 'all') {
        builder = builder.whereRaw('ALL(tag IN $tags WHERE tag IN p.tags)', { tags: filters.tags });
      } else {
        builder = builder.whereRaw('ANY(tag IN $tags WHERE tag IN p.tags)', { tags: filters.tags });
      }
    }

    // Difficulty filter
    if (filters.difficulty && filters.difficulty.length > 0) {
      builder = builder.whereRaw('p.difficulty IN $difficulty', { difficulty: filters.difficulty });
    }

    // Performance metrics filters
    if (filters.minViews !== undefined) {
      builder = builder.and('p.viewCount', '>=', filters.minViews);
    }

    if (filters.minLikes !== undefined) {
      builder = builder.and('p.likeCount', '>=', filters.minLikes);
    }

    if (filters.minComments !== undefined) {
      builder = builder.and('p.commentCount', '>=', filters.minComments);
    }

    if (filters.maxReadTime !== undefined) {
      builder = builder.and('p.estimatedReadTime', '<=', filters.maxReadTime);
    }

    // Date filters
    if (filters.publishedAfter) {
      builder = builder.whereRaw('p.publishedAt >= $publishedAfter', {
        publishedAfter: filters.publishedAfter
      });
    }

    if (filters.publishedBefore) {
      builder = builder.whereRaw('p.publishedAt <= $publishedBefore', {
        publishedBefore: filters.publishedBefore
      });
    }

    // Text search with ranking
    if (filters.searchTerm) {
      const searchTermLower = filters.searchTerm.toLowerCase();
      builder = builder
        .whereRaw(`
          toLower(p.title) CONTAINS $searchTerm OR 
          toLower(p.content) CONTAINS $searchTerm OR
          ANY(tag IN p.tags WHERE toLower(tag) CONTAINS $searchTerm)
        `, { searchTerm: searchTermLower })
        .with(`
          p,
          (CASE 
            WHEN toLower(p.title) CONTAINS $searchTerm THEN 3
            WHEN ANY(tag IN p.tags WHERE toLower(tag) CONTAINS $searchTerm) THEN 2
            WHEN toLower(p.content) CONTAINS $searchTerm THEN 1
            ELSE 0
          END) as relevanceScore
        `, { searchTerm: searchTermLower });
    }

    // Join with author information
    builder = builder
      .optionalMatch('(p)<-[:AUTHORED]-(author:User)')
      .optionalMatch('(p)-[:IN_CATEGORY]->(category:Category)');

    // Apply sorting
    if (filters.searchTerm) {
      // Sort by relevance when searching
      builder = builder.raw('ORDER BY relevanceScore DESC, p.publishedAt DESC');
    } else {
      const sortBy = filters.sortBy || 'publishedAt';
      const sortDirection = filters.sortDirection || 'DESC';
      builder = builder.orderBy(`p.${sortBy}` as any, sortDirection);
    }

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    builder = builder.paginate(page, limit);

    return builder
      .return(`
        p {
          .id,
          .title,
          .content,
          .published,
          .featured,
          .tags,
          .difficulty,
          .viewCount,
          .likeCount,
          .commentCount,
          .estimatedReadTime,
          .publishedAt,
          .createdAt
        } as post,
        author {
          .id,
          .firstName,
          .lastName,
          .reputation
        } as author,
        category {
          .id,
          .name
        } as category
        ${filters.searchTerm ? ', relevanceScore' : ''}
      `)
      .build();
  }

  // ============================================================================
  // 3. DYNAMIC COMPANY SEARCH
  // ============================================================================

  /**
   * Company search with technology and benefits filtering
   * Demonstrates complex multi-criteria business searches
   */
  @CypherQuery({ cache: '10m', description: 'Dynamic company search with technology filters' })
  async searchCompanies(filters: CompanySearchFilters = {}) {
    let builder = createQueryBuilder<Company>()
      .match('c', () => Company);

    // Basic filters
    if (filters.isPublic !== undefined) {
      builder = builder.where('c.isPublic', '=', filters.isPublic);
    }

    if (filters.hasStockSymbol !== undefined) {
      if (filters.hasStockSymbol) {
        builder = builder.whereRaw('c.stockSymbol IS NOT NULL');
      } else {
        builder = builder.whereRaw('c.stockSymbol IS NULL');
      }
    }

    // Industry filters
    if (filters.industries && filters.industries.length > 0) {
      builder = builder.whereRaw('c.industry IN $industries', { industries: filters.industries });
    }

    // Size filters
    if (filters.minEmployees !== undefined) {
      builder = builder.and('c.employees', '>=', filters.minEmployees);
    }

    if (filters.maxEmployees !== undefined) {
      builder = builder.and('c.employees', '<=', filters.maxEmployees);
    }

    // Revenue filters
    if (filters.minRevenue !== undefined) {
      builder = builder.whereRaw('c.revenue >= $minRevenue', { minRevenue: filters.minRevenue });
    }

    if (filters.maxRevenue !== undefined) {
      builder = builder.whereRaw('c.revenue <= $maxRevenue', { maxRevenue: filters.maxRevenue });
    }

    // Founded date filters
    if (filters.foundedAfter !== undefined) {
      builder = builder.and('c.foundedYear', '>=', filters.foundedAfter);
    }

    if (filters.foundedBefore !== undefined) {
      builder = builder.and('c.foundedYear', '<=', filters.foundedBefore);
    }

    // Technology filters
    if (filters.technologies && filters.technologies.length > 0) {
      if (filters.technologiesMatchMode === 'all') {
        builder = builder.whereRaw('ALL(tech IN $technologies WHERE tech IN c.technologies)', {
          technologies: filters.technologies
        });
      } else {
        builder = builder.whereRaw('ANY(tech IN $technologies WHERE tech IN c.technologies)', {
          technologies: filters.technologies
        });
      }
    }

    // Benefits filters
    if (filters.benefits && filters.benefits.length > 0) {
      builder = builder.whereRaw('ANY(benefit IN $benefits WHERE benefit IN c.benefits)', {
        benefits: filters.benefits
      });
    }

    // Location filters
    if (filters.headquarters && filters.headquarters.length > 0) {
      builder = builder.whereRaw('c.headquarters IN $headquarters', {
        headquarters: filters.headquarters
      });
    }

    // Text search
    if (filters.searchTerm) {
      const searchTermLower = filters.searchTerm.toLowerCase();
      builder = builder.whereRaw(`
        toLower(c.name) CONTAINS $searchTerm OR 
        toLower(c.industry) CONTAINS $searchTerm OR
        toLower(c.headquarters) CONTAINS $searchTerm OR
        ANY(tech IN c.technologies WHERE toLower(tech) CONTAINS $searchTerm)
      `, { searchTerm: searchTermLower });
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'employees';
    const sortDirection = filters.sortDirection || 'DESC';
    builder = builder.orderBy(`c.${sortBy}` as any, sortDirection);

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    builder = builder.paginate(page, limit);

    return builder
      .return(`
        c {
          .id,
          .name,
          .industry,
          .foundedYear,
          .employees,
          .headquarters,
          .revenue,
          .isPublic,
          .stockSymbol,
          .technologies,
          .benefits
        } as company
      `)
      .build();
  }

  // ============================================================================
  // 4. FACETED SEARCH WITH DYNAMIC AGGREGATIONS
  // ============================================================================

  /**
   * Generate search facets for user filtering
   * Provides dynamic facet counts for building search interfaces
   */
  @CypherQuery({ cache: '10m', description: 'Generate user search facets' })
  async getUserSearchFacets(filters: Partial<UserSearchFilters> = {}) {
    let builder = createQueryBuilder<User>()
      .match('u', () => User);

    // Apply current filters (excluding the facet we're calculating)
    const { roles, countries, ...otherFilters } = filters;
    builder = this.applyUserFilters(builder, otherFilters);

    return builder
      .return(`
        // Role facets
        COUNT(u) as totalUsers,
        COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as adminCount,
        COUNT(CASE WHEN u.role = 'moderator' THEN 1 END) as moderatorCount,
        COUNT(CASE WHEN u.role = 'user' THEN 1 END) as userCount,
        
        // Activity facets
        COUNT(CASE WHEN u.isActive THEN 1 END) as activeCount,
        COUNT(CASE WHEN NOT u.isActive THEN 1 END) as inactiveCount,
        
        // Location facets
        COLLECT(DISTINCT u.location.country) as availableCountries,
        COLLECT(DISTINCT u.location.city) as availableCities,
        
        // Skill facets (top 20)
        [skill IN REDUCE(s = [], user IN COLLECT(u) | s + user.skills) 
         | { skill: skill, count: SIZE([user IN COLLECT(u) WHERE skill IN user.skills]) }
        ][0..20] as skillFacets,
        
        // Reputation ranges
        MIN(u.reputation) as minReputation,
        MAX(u.reputation) as maxReputation,
        AVG(u.reputation) as avgReputation,
        PERCENTILE_CONT(u.reputation, 0.25) as reputation25th,
        PERCENTILE_CONT(u.reputation, 0.75) as reputation75th
      `)
      .build();
  }

  /**
   * Generate search facets for post filtering
   * Provides counts and available options for post search interface
   */
  @CypherQuery({ cache: '10m', description: 'Generate post search facets' })
  async getPostSearchFacets(filters: Partial<PostSearchFilters> = {}) {
    let builder = createQueryBuilder<Post>()
      .match('p', () => Post);

    // Apply current filters
    builder = this.applyPostFilters(builder, filters);

    return builder
      .optionalMatch('(p)<-[:AUTHORED]-(author:User)')
      .optionalMatch('(p)-[:IN_CATEGORY]->(category:Category)')
      .return(`
        COUNT(p) as totalPosts,
        
        // Publication status
        COUNT(CASE WHEN p.published THEN 1 END) as publishedCount,
        COUNT(CASE WHEN NOT p.published THEN 1 END) as draftCount,
        COUNT(CASE WHEN p.featured THEN 1 END) as featuredCount,
        
        // Difficulty distribution
        COUNT(CASE WHEN p.difficulty = 'beginner' THEN 1 END) as beginnerCount,
        COUNT(CASE WHEN p.difficulty = 'intermediate' THEN 1 END) as intermediateCount,
        COUNT(CASE WHEN p.difficulty = 'advanced' THEN 1 END) as advancedCount,
        
        // Category facets
        COLLECT(DISTINCT category { .id, .name, 
          postCount: SIZE([post IN COLLECT(p) WHERE post.categoryId = category.id])
        }) as categoryFacets,
        
        // Author facets (top 10)
        [author IN COLLECT(DISTINCT author) | author {
          .id, .firstName, .lastName,
          postCount: SIZE([post IN COLLECT(p) WHERE post.authorId = author.id])
        }][0..10] as topAuthorFacets,
        
        // Tag facets (top 20)
        [tag IN REDUCE(t = [], post IN COLLECT(p) | t + post.tags)
         | { tag: tag, count: SIZE([post IN COLLECT(p) WHERE tag IN post.tags]) }
        ][0..20] as tagFacets,
        
        // Performance metrics
        MIN(p.viewCount) as minViews,
        MAX(p.viewCount) as maxViews,
        AVG(p.viewCount) as avgViews,
        MIN(p.estimatedReadTime) as minReadTime,
        MAX(p.estimatedReadTime) as maxReadTime
      `)
      .build();
  }

  // ============================================================================
  // 5. SAVED SEARCHES AND QUERY TEMPLATES
  // ============================================================================

  /**
   * Save user search criteria for later reuse
   * Demonstrates persisting dynamic query configurations
   */
  @CypherQuery({ mode: 'WRITE', cache: false, description: 'Save user search template' })
  async saveUserSearchTemplate(
    userId: string, 
    templateName: string, 
    filters: UserSearchFilters,
    isPublic = false
  ) {
    const templateId = `template_${Date.now()}`;
    const timestamp = new Date().toISOString();

    return this.queryBuilder
      .match('u', () => User)
      .where('u.id', '=', userId)
      .create(`(template:SearchTemplate {
        id: $templateId,
        name: $templateName,
        type: 'user',
        filters: $filters,
        isPublic: $isPublic,
        createdAt: $timestamp
      })`, {
        templateId,
        templateName,
        filters: JSON.stringify(filters),
        isPublic,
        timestamp
      })
      .create('(u)-[:CREATED]->(template)')
      .return('template')
      .build();
  }

  /**
   * Execute saved search template
   * Shows how to reconstruct and execute saved queries
   */
  @CypherQuery({ cache: '5m', description: 'Execute saved search template' })
  async executeSavedSearchTemplate(templateId: string) {
    // First, get the template
    const templateQuery = this.queryBuilder
      .match('template:SearchTemplate')
      .where('template.id', '=', templateId)
      .return('template.filters as filtersJson')
      .build();

    // Note: In real implementation, you'd execute this query first,
    // then parse the filters and call the appropriate search method
    return {
      templateQuery,
      note: 'Execute templateQuery first, then parse filters and call searchUsers() with parsed filters'
    };
  }

  // ============================================================================
  // 6. QUERY BUILDER HELPER METHODS
  // ============================================================================

  /**
   * Helper method to apply user filters to query builder
   * Centralizes filter logic for reuse
   */
  private applyUserFilters(
    builder: Neo4jQueryBuilder<User>, 
    filters: Partial<UserSearchFilters>
  ): Neo4jQueryBuilder<User> {
    if (filters.isActive !== undefined) {
      builder = builder.where('u.isActive', '=', filters.isActive);
    }

    if (filters.roles && filters.roles.length > 0) {
      builder = builder.whereRaw('u.role IN $roles', { roles: filters.roles });
    }

    if (filters.minReputation !== undefined) {
      builder = builder.and('u.reputation', '>=', filters.minReputation);
    }

    if (filters.maxReputation !== undefined) {
      builder = builder.and('u.reputation', '<=', filters.maxReputation);
    }

    if (filters.countries && filters.countries.length > 0) {
      builder = builder.whereRaw('u.location.country IN $countries', { 
        countries: filters.countries 
      });
    }

    if (filters.searchTerm) {
      const searchTermLower = filters.searchTerm.toLowerCase();
      builder = builder.whereRaw(`
        toLower(u.firstName) CONTAINS $searchTerm OR 
        toLower(u.lastName) CONTAINS $searchTerm OR 
        toLower(u.email) CONTAINS $searchTerm
      `, { searchTerm: searchTermLower });
    }

    return builder;
  }

  /**
   * Helper method to apply post filters to query builder
   */
  private applyPostFilters(
    builder: Neo4jQueryBuilder<Post>, 
    filters: Partial<PostSearchFilters>
  ): Neo4jQueryBuilder<Post> {
    if (filters.published !== undefined) {
      builder = builder.where('p.published', '=', filters.published);
    }

    if (filters.featured !== undefined) {
      builder = builder.and('p.featured', '=', filters.featured);
    }

    if (filters.difficulty && filters.difficulty.length > 0) {
      builder = builder.whereRaw('p.difficulty IN $difficulty', { 
        difficulty: filters.difficulty 
      });
    }

    if (filters.minViews !== undefined) {
      builder = builder.and('p.viewCount', '>=', filters.minViews);
    }

    if (filters.tags && filters.tags.length > 0) {
      if (filters.tagsMatchMode === 'all') {
        builder = builder.whereRaw('ALL(tag IN $tags WHERE tag IN p.tags)', { 
          tags: filters.tags 
        });
      } else {
        builder = builder.whereRaw('ANY(tag IN $tags WHERE tag IN p.tags)', { 
          tags: filters.tags 
        });
      }
    }

    return builder;
  }

  // ============================================================================
  // 7. ADVANCED DYNAMIC QUERY PATTERNS
  // ============================================================================

  /**
   * Build query based on user permissions and context
   * Demonstrates security-aware dynamic queries
   */
  @CypherQuery({ cache: '2m', description: 'Context-aware dynamic query building' })
  async contextAwareUserSearch(
    requestingUserId: string,
    filters: UserSearchFilters,
    permissions: {
      canViewInactiveUsers: boolean;
      canViewPrivateProfiles: boolean;
      canViewAllRoles: boolean;
    }
  ) {
    let builder = createQueryBuilder<User>()
      .match('u', () => User);

    // Apply permission-based filters
    if (!permissions.canViewInactiveUsers) {
      builder = builder.where('u.isActive', '=', true);
    }

    if (!permissions.canViewAllRoles) {
      builder = builder.whereRaw('u.role IN $allowedRoles', { 
        allowedRoles: ['user', 'moderator'] 
      });
    }

    // Apply user filters
    builder = this.applyUserFilters(builder, filters);

    // Add privacy filters
    if (!permissions.canViewPrivateProfiles) {
      builder = builder.whereRaw('u.preferences.profileVisible = true OR u.id = $requestingUserId', {
        requestingUserId
      });
    }

    return builder
      .return(`
        u {
          .id,
          .firstName,
          .lastName,
          .email,
          .role,
          .reputation,
          .skills
        } as user
      `)
      .orderBy('u.reputation', 'DESC')
      .limit(50)
      .build();
  }

  /**
   * Generate analytics queries dynamically
   * Shows how to build complex analytical queries at runtime
   */
  @CypherQuery({ cache: '15m', description: 'Dynamic analytics query generation' })
  async generateDynamicAnalytics(
    dimensions: Array<'role' | 'location' | 'joinPeriod' | 'skillCategory'>,
    metrics: Array<'userCount' | 'avgReputation' | 'totalPosts' | 'avgEngagement'>,
    filters: Partial<UserSearchFilters> = {}
  ) {
    let builder = createQueryBuilder<User>()
      .match('u', () => User);

    // Apply base filters
    builder = this.applyUserFilters(builder, filters);

    // Add relationships for metrics that need them
    if (metrics.includes('totalPosts') || metrics.includes('avgEngagement')) {
      builder = builder.optionalMatch('(u)-[:AUTHORED]->(p:Post {published: true})');
    }

    // Build dynamic grouping
    const groupByFields: string[] = [];
    const selectFields: string[] = [];

    dimensions.forEach(dimension => {
      switch (dimension) {
        case 'role':
          groupByFields.push('u.role');
          selectFields.push('u.role as role');
          break;
        case 'location':
          groupByFields.push('u.location.country');
          selectFields.push('u.location.country as country');
          break;
        case 'joinPeriod':
          groupByFields.push('substring(u.joinedAt, 0, 7)');
          selectFields.push('substring(u.joinedAt, 0, 7) as joinMonth');
          break;
        case 'skillCategory':
          // This would need more complex logic in real implementation
          selectFields.push('u.skills[0] as primarySkill');
          break;
      }
    });

    // Build dynamic metrics
    metrics.forEach(metric => {
      switch (metric) {
        case 'userCount':
          selectFields.push('COUNT(DISTINCT u) as userCount');
          break;
        case 'avgReputation':
          selectFields.push('AVG(u.reputation) as avgReputation');
          break;
        case 'totalPosts':
          selectFields.push('COUNT(p) as totalPosts');
          break;
        case 'avgEngagement':
          selectFields.push('AVG(p.likeCount + p.commentCount) as avgEngagement');
          break;
      }
    });

    return builder
      .return(selectFields.join(', '))
      .raw(groupByFields.length > 0 ? `ORDER BY ${groupByFields[0]}` : '')
      .build();
  }
}

/**
 * Dynamic Query Examples Usage
 * 
 * Shows how to integrate dynamic queries into controllers and services
 */
export class DynamicQueryUsageExamples {
  constructor(private readonly dynamicQueryService: DynamicQueryService) {}

  /**
   * Example of using dynamic search in a REST API endpoint
   */
  async handleUserSearchRequest(queryParams: any) {
    // Parse and validate query parameters
    const filters: UserSearchFilters = {
      searchTerm: queryParams.q,
      roles: queryParams.roles ? queryParams.roles.split(',') : undefined,
      isActive: queryParams.active === 'true' ? true : queryParams.active === 'false' ? false : undefined,
      minReputation: queryParams.minReputation ? parseInt(queryParams.minReputation) : undefined,
      requiredSkills: queryParams.skills ? queryParams.skills.split(',') : undefined,
      page: queryParams.page ? parseInt(queryParams.page) : 1,
      limit: Math.min(queryParams.limit ? parseInt(queryParams.limit) : 20, 100), // Max 100
      sortBy: queryParams.sort || 'firstName',
      sortDirection: queryParams.order === 'desc' ? 'DESC' : 'ASC'
    };

    // Execute search
    const [users, totalCount, facets] = await Promise.all([
      this.dynamicQueryService.searchUsers(filters),
      this.dynamicQueryService.countUsersMatchingFilters(filters),
      this.dynamicQueryService.getUserSearchFacets(filters)
    ]);

    return {
      users,
      pagination: {
        page: filters.page!,
        limit: filters.limit!,
        total: (totalCount as any)[0]?.totalCount || 0,
        hasMore: (filters.page! * filters.limit!) < ((totalCount as any)[0]?.totalCount || 0)
      },
      facets
    };
  }
}