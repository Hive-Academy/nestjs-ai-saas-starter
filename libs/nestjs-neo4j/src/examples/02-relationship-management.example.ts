/**
 * @fileoverview Relationship Management Example
 *
 * Demonstrates:
 * - Relationship decorators and modeling
 * - Graph traversal and pathfinding
 * - RelationshipRepository usage
 * - Multi-entity relationship queries
 * - Social network patterns
 */

import { Injectable } from '@nestjs/common';
import {
  Neo4jEntity,
  Neo4jProp,
  Id,
  CreatedAt,
  UpdatedAt,
  PropIndex,
  NotNull,
  InjectNeogma,
  NeogmaService,
  Safe,
  Authorize,
  AuditLog,
  RelationshipRepository,
  GraphRepository,
  Neo4jCrudService,
  FindOptions,
} from '../index';

// ============================================================================
// 1. ENTITY DEFINITIONS WITH RELATIONSHIPS
// ============================================================================

@Neo4jEntity('Person')
export class Person {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex({ name: 'person_name_index' })
  name: string;

  @Neo4jProp()
  @PropIndex({ name: 'person_email_index' })
  email: string;

  @Neo4jProp()
  age: number;

  @Neo4jProp()
  location: string;

  @Neo4jProp()
  profession: string;

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  // Relationship properties (virtual - managed by relationships)
  friends?: Person[];
  colleagues?: Person[];
  followers?: Person[];
  following?: Person[];

  [key: string]: any;
}

@Neo4jEntity('Company')
export class Company {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex({ name: 'company_name_index' })
  name: string;

  @Neo4jProp()
  industry: string;

  @Neo4jProp()
  location: string;

  @Neo4jProp()
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';

  @Neo4jProp()
  founded: Date;

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  // Virtual relationship properties
  employees?: Person[];

  [key: string]: any;
}

// ============================================================================
// 2. RELATIONSHIP TYPES AND INTERFACES
// ============================================================================

export interface FriendshipRelationship {
  id: string;
  type: 'FRIEND';
  since: Date;
  closeness: 'acquaintance' | 'friend' | 'close_friend' | 'best_friend';
  mutualFriends?: number;
  commonInterests?: string[];
  createdAt: Date;
}

export interface ColleagueRelationship {
  id: string;
  type: 'COLLEAGUE';
  department: string;
  startDate: Date;
  endDate?: Date;
  worksTogether: boolean;
  projectsShared: number;
  createdAt: Date;
}

export interface FollowsRelationship {
  id: string;
  type: 'FOLLOWS';
  followedAt: Date;
  notifications: boolean;
  category: 'professional' | 'personal' | 'both';
}

export interface WorksAtRelationship {
  id: string;
  type: 'WORKS_AT';
  position: string;
  department: string;
  startDate: Date;
  endDate?: Date;
  salary?: number;
  isActive: boolean;
  createdAt: Date;
  [key: string]: unknown;
}

export type SocialRelationship =
  | FriendshipRelationship
  | ColleagueRelationship
  | FollowsRelationship
  | WorksAtRelationship;

// ============================================================================
// 3. REPOSITORY SERVICES
// ============================================================================

/**
 * PersonRepository - demonstrates current composition pattern
 *
 * Uses Neo4jCrudService for CRUD operations via delegation:
 * - findById, findAll, create, update, delete, count, exists
 */
@Injectable()
export class PersonRepository {
  private readonly label = 'Person';

  constructor(
    private readonly crud: Neo4jCrudService,
    @InjectNeogma() private readonly neogma: NeogmaService
  ) {}

  // CRUD methods (delegated to Neo4jCrudService)
  findById(id: string): Promise<Person | null> {
    return this.crud.findById<Person>(this.label, id);
  }

  findAll(options?: FindOptions<Person>): Promise<Person[]> {
    return this.crud.findAll<Person>(this.label, options);
  }

  create(
    data: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Person> {
    return this.crud.create<Person>(this.label, data);
  }

  update(id: string, data: Partial<Person>): Promise<Person | null> {
    return this.crud.update<Person>(this.label, id, data);
  }

  delete(id: string): Promise<boolean> {
    return this.crud.delete(this.label, id);
  }

  count(where?: Partial<Person>): Promise<number> {
    return this.crud.count<Person>(this.label, where);
  }

  exists(id: string): Promise<boolean> {
    return this.crud.exists(this.label, id);
  }

  /**
   * Find people by profession with relationship counts
   * Custom business logic method
   */
  @Safe()
  async findByProfession(profession: string): Promise<Person[]> {
    return this.findAll({
      where: { profession },
    });
  }

  /**
   * Find people in same location
   * Custom business logic method
   */
  async findInLocation(location: string, limit = 50): Promise<Person[]> {
    return this.findAll({
      where: { location },
      limit,
    });
  }
}

/**
 * CompanyRepository - demonstrates current composition pattern
 */
@Injectable()
export class CompanyRepository {
  private readonly label = 'Company';

  constructor(
    private readonly crud: Neo4jCrudService,
    @InjectNeogma() private readonly neogma: NeogmaService
  ) {}

  // CRUD methods (delegated to Neo4jCrudService)
  findById(id: string): Promise<Company | null> {
    return this.crud.findById<Company>(this.label, id);
  }

  findAll(options?: FindOptions<Company>): Promise<Company[]> {
    return this.crud.findAll<Company>(this.label, options);
  }

  create(
    data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Company> {
    return this.crud.create<Company>(this.label, data);
  }

  update(id: string, data: Partial<Company>): Promise<Company | null> {
    return this.crud.update<Company>(this.label, id, data);
  }

  delete(id: string): Promise<boolean> {
    return this.crud.delete(this.label, id);
  }

  count(where?: Partial<Company>): Promise<number> {
    return this.crud.count<Company>(this.label, where);
  }

  exists(id: string): Promise<boolean> {
    return this.crud.exists(this.label, id);
  }

  /**
   * Find companies by industry
   * Custom business logic method
   */
  async findByIndustry(industry: string): Promise<Company[]> {
    return this.findAll({
      where: { industry },
    });
  }
}

// ============================================================================
// 4. RELATIONSHIP SERVICE WITH GRAPH OPERATIONS
// ============================================================================

// Properly typed relationship repository for friendships
@Injectable()
export class FriendshipRelationshipRepository extends RelationshipRepository<
  FriendshipRelationship,
  Person,
  Person
> {}

// Properly typed relationship repository for employment
@Injectable()
export class WorksAtRelationshipRepository extends RelationshipRepository<
  WorksAtRelationship,
  Person,
  Company
> {}

@Injectable()
export class SocialNetworkService {
  constructor(
    private readonly friendshipRepo: FriendshipRelationshipRepository,
    private readonly worksAtRepo: WorksAtRelationshipRepository,
    private readonly graphRepo: GraphRepository<Person>,
    @InjectNeogma() private readonly neogma: NeogmaService
  ) {}

  /**
   * Create friendship with mutual relationship
   */
  @Safe()
  @AuditLog({ logLevel: 'detailed', enabled: true })
  async createFriendship(
    person1Id: string,
    person2Id: string,
    closeness: FriendshipRelationship['closeness'] = 'friend'
  ): Promise<FriendshipRelationship> {
    const relationshipData: Omit<FriendshipRelationship, 'id' | 'createdAt'> = {
      type: 'FRIEND',
      since: new Date(),
      closeness,
      mutualFriends: await this.countMutualFriends(person1Id, person2Id),
      commonInterests: await this.findCommonInterests(person1Id, person2Id),
    };

    const result = await this.friendshipRepo.createRelationship({
      sourceId: person1Id,
      targetId: person2Id,
      properties: relationshipData,
    });

    // With proper typing, no casting needed!
    return result.relationship;
  }

  /**
   * Create employment relationship
   */
  @Safe()
  @AuditLog({ logLevel: 'detailed', enabled: true })
  async createEmployment(
    personId: string,
    companyId: string,
    employment: Omit<
      WorksAtRelationship,
      'id' | 'type' | 'createdAt' | 'isActive'
    >
  ): Promise<WorksAtRelationship> {
    const relationshipData: Omit<WorksAtRelationship, 'id' | 'createdAt'> = {
      type: 'WORKS_AT',
      ...employment,
      isActive: true,
    };

    const result = await this.worksAtRepo.createRelationship({
      sourceId: personId,
      targetId: companyId,
      properties: relationshipData,
      sourceLabel: 'Person',
      targetLabel: 'Company',
    });

    // With proper typing, no casting needed!
    return result.relationship;
  }

  /**
   * Find friends of friends (2nd degree connections)
   * Demonstrates correct QueryBuilder usage with BindParam
   */
  @Safe()
  async findFriendsOfFriends(personId: string): Promise<Person[]> {
    const queryBuilder = this.neogma.createQueryBuilder();
    const bindParam = queryBuilder.getBindParam();

    // Add parameters using BindParam
    const personIdParam = bindParam.add(personId);

    queryBuilder
      .match('(person:Person)')
      .where(`person.id = $${personIdParam}`)
      .match('(person)-[:FRIEND]->(friend)-[:FRIEND]->(friendOfFriend:Person)')
      .where(
        `friendOfFriend.id <> $${personIdParam} AND NOT (person)-[:FRIEND]->(friendOfFriend)`
      )
      .return('DISTINCT friendOfFriend')
      .orderBy('friendOfFriend.name')
      .limit(20);

    // Execute with proper statement and params
    const cypher = queryBuilder.getStatement();
    const params = bindParam.get();
    const result = await this.neogma.run(cypher, params);

    return result.records.map(
      (record) => record.get('friendOfFriend').properties as Person
    );
  }

  /**
   * Find shortest path between two people
   */
  @Safe()
  async findConnectionPath(person1Id: string, person2Id: string): Promise<any> {
    return this.graphRepo.findShortestPath(person1Id, person2Id, {
      relationshipTypes: ['FRIEND', 'COLLEAGUE'],
      maxDepth: 6,
      direction: 'BOTH',
    });
  }

  /**
   * Get network statistics for a person
   * Demonstrates QueryBuilder with proper parameter binding
   */
  @Safe()
  async getNetworkStats(personId: string): Promise<{
    friendCount: number;
    colleagueCount: number;
    followerCount: number;
    followingCount: number;
    mutualConnections: number;
    networkReach: number;
  }> {
    const queryBuilder = this.neogma.createQueryBuilder();
    const bindParam = queryBuilder.getBindParam();

    const personIdParam = bindParam.add(personId);

    queryBuilder
      .match('(person:Person)')
      .where(`person.id = $${personIdParam}`)
      .raw('OPTIONAL MATCH (person)-[f:FRIEND]-()')
      .raw('OPTIONAL MATCH (person)-[c:COLLEAGUE]-()')
      .raw('OPTIONAL MATCH (person)<-[fol:FOLLOWS]-()')
      .raw('OPTIONAL MATCH (person)-[following:FOLLOWS]->()').return(`
        count(DISTINCT f) as friendCount,
        count(DISTINCT c) as colleagueCount,
        count(DISTINCT fol) as followerCount,
        count(DISTINCT following) as followingCount
      `);

    const cypher = queryBuilder.getStatement();
    const params = bindParam.get();
    const result = await this.neogma.run(cypher, params);
    const record = result.records[0];

    // Calculate network reach (friends + colleagues + followers)
    const networkReach = await this.calculateNetworkReach(personId);

    return {
      friendCount: record.get('friendCount').toNumber(),
      colleagueCount: record.get('colleagueCount').toNumber(),
      followerCount: record.get('followerCount').toNumber(),
      followingCount: record.get('followingCount').toNumber(),
      mutualConnections: 0, // Would need more complex query
      networkReach,
    };
  }

  /**
   * Find colleagues at same company
   */
  @Safe()
  async findColleagues(personId: string): Promise<Person[]> {
    const queryBuilder = this.neogma.createQueryBuilder();
    const bindParam = queryBuilder.getBindParam();

    const personIdParam = bindParam.add(personId);

    queryBuilder
      .match(
        '(person:Person)-[:WORKS_AT]->(company:Company)<-[:WORKS_AT]-(colleague:Person)'
      )
      .where(
        `person.id = $${personIdParam} AND colleague.id <> $${personIdParam}`
      )
      .return('DISTINCT colleague')
      .orderBy('colleague.name');

    const cypher = queryBuilder.getStatement();
    const params = bindParam.get();
    const result = await this.neogma.run(cypher, params);

    return result.records.map(
      (record) => record.get('colleague').properties as Person
    );
  }

  /**
   * Recommend connections based on mutual friends and shared interests
   */
  @Safe()
  async getConnectionRecommendations(
    personId: string,
    limit = 10
  ): Promise<
    {
      person: Person;
      score: number;
      mutualFriends: number;
      reason: string;
    }[]
  > {
    const queryBuilder = this.neogma.createQueryBuilder();
    const bindParam = queryBuilder.getBindParam();

    const personIdParam = bindParam.add(personId);
    const limitParam = bindParam.add(limit);

    queryBuilder
      .match('(person:Person)')
      .where(`person.id = $${personIdParam}`)
      .match('(person)-[:FRIEND]->(friend)-[:FRIEND]->(recommendation:Person)')
      .where(
        `recommendation.id <> $${personIdParam} AND NOT (person)-[:FRIEND]->(recommendation)`
      )
      .with('recommendation, count(DISTINCT friend) as mutualFriends')
      .match(
        '(person)-[:WORKS_AT]->(company:Company)<-[:WORKS_AT]-(recommendation)'
      )
      .return(
        `
        recommendation,
        mutualFriends,
        CASE
          WHEN mutualFriends > 3 THEN mutualFriends * 2
          ELSE mutualFriends
        END as score
      `
      )
      .orderBy('score')
      .limit(`$${limitParam}`);

    const cypher = queryBuilder.getStatement();
    const params = bindParam.get();
    const result = await this.neogma.run(cypher, params);

    return result.records.map((record) => ({
      person: record.get('recommendation').properties as Person,
      score: record.get('score').toNumber(),
      mutualFriends: record.get('mutualFriends').toNumber(),
      reason: 'Mutual friends and colleagues',
    }));
  }

  /**
   * Find influential people in network (high centrality)
   * Returns CentralityResult with node and score properties
   */
  @Safe()
  async findInfluencers(): Promise<Array<{ person: Person; score: number }>> {
    const results = await this.graphRepo.findCentralNodes('betweenness', 10);
    return results.map((result) => ({
      person: result.node,
      score: result.score,
    }));
  }

  /**
   * Detect communities in the social network
   */
  @Safe()
  @Authorize({ roles: ['admin', 'analyst'] })
  async detectCommunities(): Promise<any> {
    return this.graphRepo.detectCommunities({
      algorithm: 'louvain',
    });
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async countMutualFriends(
    person1Id: string,
    person2Id: string
  ): Promise<number> {
    const queryBuilder = this.neogma.createQueryBuilder();
    const bindParam = queryBuilder.getBindParam();

    const person1IdParam = bindParam.add(person1Id);
    const person2IdParam = bindParam.add(person2Id);

    queryBuilder
      .match('(p1:Person)-[:FRIEND]->(mutual:Person)<-[:FRIEND]-(p2:Person)')
      .where(`p1.id = $${person1IdParam} AND p2.id = $${person2IdParam}`)
      .return('count(DISTINCT mutual) as mutualCount');

    const cypher = queryBuilder.getStatement();
    const params = bindParam.get();
    const result = await this.neogma.run(cypher, params);

    return result.records[0]?.get('mutualCount').toNumber() || 0;
  }

  private async findCommonInterests(
    person1Id: string,
    person2Id: string
  ): Promise<string[]> {
    // This would require an interests property or separate Interest entities
    // For now, return empty array - could be enhanced with actual interest matching
    return [];
  }

  private async calculateNetworkReach(personId: string): Promise<number> {
    const queryBuilder = this.neogma.createQueryBuilder();
    const bindParam = queryBuilder.getBindParam();

    const personIdParam = bindParam.add(personId);

    queryBuilder
      .match('(person:Person)')
      .where(`person.id = $${personIdParam}`)
      .match('(person)-[:FRIEND|COLLEAGUE|FOLLOWS*1..2]-(connected:Person)')
      .return('count(DISTINCT connected) as reach');

    const cypher = queryBuilder.getStatement();
    const params = bindParam.get();
    const result = await this.neogma.run(cypher, params);

    return result.records[0]?.get('reach').toNumber() || 0;
  }
}

// ============================================================================
// 5. USAGE EXAMPLE
// ============================================================================

export class SocialNetworkExample {
  constructor(
    private readonly socialNetworkService: SocialNetworkService,
    private readonly personRepo: PersonRepository,
    private readonly companyRepo: CompanyRepository
  ) {}

  async demonstrateUsage(): Promise<void> {
    // Create people (using auto-generated create method)
    const john = await this.personRepo.create({
      name: 'John Smith',
      email: 'john@example.com',
      age: 30,
      location: 'San Francisco',
      profession: 'Software Engineer',
    });

    const jane = await this.personRepo.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      age: 28,
      location: 'San Francisco',
      profession: 'Product Manager',
    });

    const bob = await this.personRepo.create({
      name: 'Bob Wilson',
      email: 'bob@example.com',
      age: 32,
      location: 'San Francisco',
      profession: 'Data Scientist',
    });

    // Create company (using auto-generated create method)
    const company = await this.companyRepo.create({
      name: 'TechCorp Inc',
      industry: 'Technology',
      location: 'San Francisco',
      size: 'medium',
      founded: new Date('2015-01-01'),
    });

    // Create friendships
    await this.socialNetworkService.createFriendship(
      john.id,
      jane.id,
      'close_friend'
    );
    await this.socialNetworkService.createFriendship(jane.id, bob.id, 'friend');

    // Create employment relationships
    await this.socialNetworkService.createEmployment(john.id, company.id, {
      position: 'Senior Software Engineer',
      department: 'Engineering',
      startDate: new Date('2020-01-01'),
      salary: 120000,
    });

    await this.socialNetworkService.createEmployment(jane.id, company.id, {
      position: 'Product Manager',
      department: 'Product',
      startDate: new Date('2019-06-01'),
      salary: 110000,
    });

    // Find connections
    const friendsOfFriends =
      await this.socialNetworkService.findFriendsOfFriends(john.id);
    console.log('Friends of friends:', friendsOfFriends);

    // Get network statistics
    const networkStats = await this.socialNetworkService.getNetworkStats(
      john.id
    );
    console.log('Network stats:', networkStats);

    // Find colleagues
    const colleagues = await this.socialNetworkService.findColleagues(john.id);
    console.log('Colleagues:', colleagues);

    // Get connection recommendations
    const recommendations =
      await this.socialNetworkService.getConnectionRecommendations(john.id);
    console.log('Connection recommendations:', recommendations);

    // Find shortest path
    const connectionPath = await this.socialNetworkService.findConnectionPath(
      john.id,
      bob.id
    );
    console.log('Connection path:', connectionPath);

    // Network analysis
    const influencers = await this.socialNetworkService.findInfluencers();
    console.log('Network influencers:', influencers);

    const communities = await this.socialNetworkService.detectCommunities();
    console.log('Detected communities:', communities);
  }
}
