/**
 * Example: GraphRepository Basics - Graph Traversal and Path Finding
 * Category: 06-repositories
 * Features: GraphRepository, graph traversal, shortest path, neighbors, connected components
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  GraphRepository,
  type GraphTraversalOptions,
  type ShortestPathOptions,
  type BaseEntity,
  InjectNeo4j
} from '../../../index';
import type { Neo4jService } from '../../../index';

// Business entities for graph operations
interface Person extends BaseEntity {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Company extends BaseEntity {
  id: string;
  name: string;
  industry: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  location: string;
  founded: number;
  createdAt: string;
  updatedAt: string;
}

interface Project extends BaseEntity {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  budget: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Person graph repository for social/organizational network analysis
 */
@Injectable()
export class PersonGraphRepository extends GraphRepository<Person> {
  protected readonly logger = new Logger(PersonGraphRepository.name);

  constructor(@InjectNeo4j() neo4jService: Neo4jService) {
    super(neo4jService, 'Person');
  }

  /**
   * Find all colleagues of a person (same company/department)
   */
  async findColleagues(
    personId: string,
    includeDifferentDepartments = false
  ): Promise<Person[]> {
    const relationshipTypes = includeDifferentDepartments
      ? ['WORKS_WITH', 'COLLABORATES_WITH', 'REPORTS_TO']
      : ['WORKS_WITH'];

    return this.findNeighbors(personId, {
      relationshipTypes,
      direction: 'BOTH',
      maxDepth: 1,
      nodeFilter: { isActive: true }
    });
  }

  /**
   * Find reporting chain (management hierarchy)
   */
  async findReportingChain(personId: string): Promise<{
    managers: Person[];
    directReports: Person[];
    teamSize: number;
  }> {
    // Find managers (upward chain)
    const managers = await this.findNeighbors(personId, {
      relationshipTypes: ['REPORTS_TO'],
      direction: 'OUT',
      maxDepth: 5, // Up to 5 levels up
      nodeFilter: { isActive: true }
    });

    // Find direct reports (downward)
    const directReports = await this.findNeighbors(personId, {
      relationshipTypes: ['REPORTS_TO'],
      direction: 'IN',
      maxDepth: 1,
      nodeFilter: { isActive: true }
    });

    // Calculate total team size (all reports, all levels)
    const allReports = await this.findNeighbors(personId, {
      relationshipTypes: ['REPORTS_TO'],
      direction: 'IN',
      maxDepth: 10, // Deep hierarchy
      nodeFilter: { isActive: true }
    });

    return {
      managers,
      directReports,
      teamSize: allReports.length
    };
  }

  /**
   * Find collaboration network (people who work on same projects)
   */
  async findCollaborationNetwork(personId: string): Promise<{
    collaborators: Array<{ person: Person; connectionStrength: number }>;
    commonProjects: number;
  }> {
    // This would typically involve more complex graph queries
    // For demonstration, we'll use the neighbor finding approach
    const collaborators = await this.findNeighbors(personId, {
      relationshipTypes: ['COLLABORATES_WITH', 'WORKS_ON'],
      direction: 'BOTH',
      maxDepth: 2,
      nodeFilter: { isActive: true }
    });

    // In a real implementation, connection strength would be calculated
    // based on number of shared projects, interaction frequency, etc.
    const collaboratorsWithStrength = collaborators.map(person => ({
      person,
      connectionStrength: Math.floor(Math.random() * 10) + 1 // Placeholder
    }));

    return {
      collaborators: collaboratorsWithStrength,
      commonProjects: collaborators.length // Simplified
    };
  }

  /**
   * Find shortest path between two people (degrees of separation)
   */
  async findConnectionPath(fromPersonId: string, toPersonId: string): Promise<{
    path: Array<{ person: Person; relationshipType?: string }> | null;
    degreesOfSeparation: number;
    connectionExists: boolean;
  }> {
    const pathResult = await this.findShortestPath(fromPersonId, toPersonId, {
      relationshipTypes: ['WORKS_WITH', 'COLLABORATES_WITH', 'REPORTS_TO', 'KNOWS'],
      maxLength: 6, // Maximum 6 degrees of separation
      direction: 'BOTH'
    });

    if (!pathResult) {
      return {
        path: null,
        degreesOfSeparation: -1,
        connectionExists: false
      };
    }

    return {
      path: pathResult.path.map(item => ({
        person: item.node,
        relationshipType: item.relationship?.type
      })),
      degreesOfSeparation: pathResult.length - 1, // Number of connections, not nodes
      connectionExists: true
    };
  }

  /**
   * Find people within N degrees of connection
   */
  async findNetworkWithinDistance(
    personId: string,
    maxDegrees = 3
  ): Promise<{
    networkMap: Array<{ person: Person; distance: number; connectionType: string }>;
    networkSize: number;
  }> {
    const networkResults = await this.findWithinDistance(personId, maxDegrees, {
      relationshipTypes: ['WORKS_WITH', 'COLLABORATES_WITH', 'REPORTS_TO', 'KNOWS'],
      direction: 'BOTH',
      nodeFilter: { isActive: true }
    });

    const networkMap = networkResults.map(result => ({
      person: result.node,
      distance: result.distance,
      connectionType: result.distance === 1 ? 'direct' : result.distance === 2 ? 'second-degree' : 'extended'
    }));

    return {
      networkMap,
      networkSize: networkMap.length
    };
  }

  /**
   * Find common connections between two people
   */
  async findMutualConnections(personId1: string, personId2: string): Promise<{
    mutualConnections: Person[];
    connectionStrength: 'strong' | 'medium' | 'weak' | 'none';
  }> {
    const mutualConnections = await this.findCommonNeighbors(personId1, personId2, {
      relationshipTypes: ['WORKS_WITH', 'COLLABORATES_WITH', 'KNOWS'],
      direction: 'BOTH',
      nodeFilter: { isActive: true }
    });

    // Determine connection strength based on mutual connections
    let connectionStrength: 'strong' | 'medium' | 'weak' | 'none';
    const mutualCount = mutualConnections.length;

    if (mutualCount >= 5) {
      connectionStrength = 'strong';
    } else if (mutualCount >= 3) {
      connectionStrength = 'medium';
    } else if (mutualCount >= 1) {
      connectionStrength = 'weak';
    } else {
      connectionStrength = 'none';
    }

    return {
      mutualConnections,
      connectionStrength
    };
  }

  /**
   * Calculate influence score based on network position
   */
  async calculateInfluenceScore(personId: string): Promise<{
    influenceScore: number;
    networkMetrics: {
      directConnections: number;
      reachableInTwoSteps: number;
      managerialConnections: number;
      crossDepartmentalConnections: number;
    };
  }> {
    // Calculate degree centrality (direct connections)
    const directConnections = await this.calculateDegreeCentrality(personId, {
      relationshipTypes: ['WORKS_WITH', 'COLLABORATES_WITH', 'KNOWS'],
      direction: 'BOTH'
    });

    // Find people reachable in exactly 2 steps
    const twoStepNetwork = await this.findWithinDistance(personId, 2, {
      relationshipTypes: ['WORKS_WITH', 'COLLABORATES_WITH', 'KNOWS'],
      direction: 'BOTH'
    });
    const reachableInTwoSteps = twoStepNetwork.filter(n => n.distance === 2).length;

    // Count managerial connections
    const managerialConnections = await this.calculateDegreeCentrality(personId, {
      relationshipTypes: ['REPORTS_TO'],
      direction: 'BOTH'
    });

    // Cross-departmental connections (would need more complex query in real implementation)
    const allConnections = await this.findNeighbors(personId, {
      relationshipTypes: ['WORKS_WITH', 'COLLABORATES_WITH'],
      direction: 'BOTH'
    });
    // Simplified: assume some percentage are cross-departmental
    const crossDepartmentalConnections = Math.floor(allConnections.length * 0.3);

    // Calculate influence score (weighted combination)
    const influenceScore =
      (directConnections * 1.0) +
      (reachableInTwoSteps * 0.5) +
      (managerialConnections * 2.0) +
      (crossDepartmentalConnections * 1.5);

    return {
      influenceScore: Math.round(influenceScore),
      networkMetrics: {
        directConnections,
        reachableInTwoSteps,
        managerialConnections,
        crossDepartmentalConnections
      }
    };
  }
}

/**
 * Company graph repository for business relationship analysis
 */
@Injectable()
export class CompanyGraphRepository extends GraphRepository<Company> {
  protected readonly logger = new Logger(CompanyGraphRepository.name);

  constructor(@InjectNeo4j() neo4jService: Neo4jService) {
    super(neo4jService, 'Company');
  }

  /**
   * Find business partners and suppliers
   */
  async findBusinessNetwork(companyId: string): Promise<{
    partners: Company[];
    suppliers: Company[];
    clients: Company[];
    competitors: Company[];
  }> {
    const [partners, suppliers, clients, competitors] = await Promise.all([
      this.findNeighbors(companyId, {
        relationshipTypes: ['PARTNERS_WITH'],
        direction: 'BOTH'
      }),
      this.findNeighbors(companyId, {
        relationshipTypes: ['SUPPLIES_TO'],
        direction: 'IN'
      }),
      this.findNeighbors(companyId, {
        relationshipTypes: ['SUPPLIES_TO'],
        direction: 'OUT'
      }),
      this.findNeighbors(companyId, {
        relationshipTypes: ['COMPETES_WITH'],
        direction: 'BOTH'
      })
    ]);

    return { partners, suppliers, clients, competitors };
  }

  /**
   * Find companies in same industry cluster
   */
  async findIndustryCluster(companyId: string): Promise<{
    industryPeers: Company[];
    clusterSize: number;
    marketPosition: 'leader' | 'challenger' | 'follower' | 'niche';
  }> {
    const industryPeers = await this.findNeighbors(companyId, {
      relationshipTypes: ['SAME_INDUSTRY', 'COMPETES_WITH'],
      direction: 'BOTH',
      maxDepth: 2
    });

    // Determine market position based on network connections
    const connectionCount = industryPeers.length;
    let marketPosition: 'leader' | 'challenger' | 'follower' | 'niche';

    if (connectionCount >= 20) {
      marketPosition = 'leader';
    } else if (connectionCount >= 10) {
      marketPosition = 'challenger';
    } else if (connectionCount >= 5) {
      marketPosition = 'follower';
    } else {
      marketPosition = 'niche';
    }

    return {
      industryPeers,
      clusterSize: connectionCount,
      marketPosition
    };
  }

  /**
   * Find supply chain dependencies
   */
  async analyzeSupplyChain(companyId: string): Promise<{
    supplyChainDepth: number;
    criticalSuppliers: Company[];
    dependentClients: Company[];
    vulnerabilityScore: number;
  }> {
    // Find supply chain upstream (suppliers of suppliers)
    const upstreamNetwork = await this.findWithinDistance(companyId, 4, {
      relationshipTypes: ['SUPPLIES_TO'],
      direction: 'IN'
    });

    // Find downstream dependencies (clients of clients)
    const downstreamNetwork = await this.findWithinDistance(companyId, 4, {
      relationshipTypes: ['SUPPLIES_TO'],
      direction: 'OUT'
    });

    const maxUpstreamDepth = Math.max(...upstreamNetwork.map(n => n.distance), 0);
    const maxDownstreamDepth = Math.max(...downstreamNetwork.map(n => n.distance), 0);
    const supplyChainDepth = Math.max(maxUpstreamDepth, maxDownstreamDepth);

    // Critical suppliers (direct suppliers with high connectivity)
    const directSuppliers = await this.findNeighbors(companyId, {
      relationshipTypes: ['SUPPLIES_TO'],
      direction: 'IN'
    });

    // Simplified: assume some suppliers are critical
    const criticalSuppliers = directSuppliers.slice(0, 3);

    // Dependent clients (direct clients)
    const dependentClients = await this.findNeighbors(companyId, {
      relationshipTypes: ['SUPPLIES_TO'],
      direction: 'OUT'
    });

    // Calculate vulnerability score
    const supplierCount = directSuppliers.length;
    const clientCount = dependentClients.length;
    const vulnerabilityScore = supplierCount > 0 ? (10 - Math.min(supplierCount, 10)) : 10;

    return {
      supplyChainDepth,
      criticalSuppliers,
      dependentClients,
      vulnerabilityScore
    };
  }
}

/**
 * Project graph repository for project network analysis
 */
@Injectable()
export class ProjectGraphRepository extends GraphRepository<Project> {
  protected readonly logger = new Logger(ProjectGraphRepository.name);

  constructor(@InjectNeo4j() neo4jService: Neo4jService) {
    super(neo4jService, 'Project');
  }

  /**
   * Find project dependencies and relationships
   */
  async findProjectDependencies(projectId: string): Promise<{
    dependencies: Project[];
    dependents: Project[];
    relatedProjects: Project[];
    criticalPath: Project[];
  }> {
    const [dependencies, dependents, relatedProjects] = await Promise.all([
      this.findNeighbors(projectId, {
        relationshipTypes: ['DEPENDS_ON'],
        direction: 'OUT'
      }),
      this.findNeighbors(projectId, {
        relationshipTypes: ['DEPENDS_ON'],
        direction: 'IN'
      }),
      this.findNeighbors(projectId, {
        relationshipTypes: ['RELATED_TO', 'SHARES_RESOURCES'],
        direction: 'BOTH'
      })
    ]);

    // Find critical path (longest dependency chain)
    const criticalPathResult = await this.findWithinDistance(projectId, 5, {
      relationshipTypes: ['DEPENDS_ON'],
      direction: 'OUT'
    });

    const criticalPath = criticalPathResult
      .sort((a, b) => b.distance - a.distance)
      .slice(0, 5)
      .map(item => item.node);

    return {
      dependencies,
      dependents,
      relatedProjects,
      criticalPath
    };
  }

  /**
   * Find connected project clusters
   */
  async findProjectClusters(): Promise<Array<{
    clusterId: string;
    projects: Project[];
    clusterType: 'portfolio' | 'program' | 'initiative' | 'independent';
  }>> {
    const components = await this.findConnectedComponents({
      relationshipTypes: ['DEPENDS_ON', 'RELATED_TO', 'SHARES_RESOURCES']
    });

    return components.map((component, index) => {
      const clusterSize = component.nodes.length;
      let clusterType: 'portfolio' | 'program' | 'initiative' | 'independent';

      if (clusterSize >= 10) {
        clusterType = 'portfolio';
      } else if (clusterSize >= 5) {
        clusterType = 'program';
      } else if (clusterSize >= 2) {
        clusterType = 'initiative';
      } else {
        clusterType = 'independent';
      }

      return {
        clusterId: component.componentId,
        projects: component.nodes,
        clusterType
      };
    });
  }

  /**
   * Analyze project impact (what happens if project fails/delays)
   */
  async analyzeProjectImpact(projectId: string): Promise<{
    directlyAffectedProjects: Project[];
    indirectlyAffectedProjects: Project[];
    impactScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }> {
    // Direct impact (projects that depend on this one)
    const directlyAffectedProjects = await this.findNeighbors(projectId, {
      relationshipTypes: ['DEPENDS_ON'],
      direction: 'IN'
    });

    // Indirect impact (cascade effect)
    const cascadeEffect = await this.findWithinDistance(projectId, 3, {
      relationshipTypes: ['DEPENDS_ON'],
      direction: 'IN'
    });

    const indirectlyAffectedProjects = cascadeEffect
      .filter(item => item.distance > 1)
      .map(item => item.node);

    // Calculate impact score
    const directImpact = directlyAffectedProjects.length * 3;
    const indirectImpact = indirectlyAffectedProjects.length * 1;
    const impactScore = directImpact + indirectImpact;

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (impactScore >= 15) {
      riskLevel = 'critical';
    } else if (impactScore >= 10) {
      riskLevel = 'high';
    } else if (impactScore >= 5) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    return {
      directlyAffectedProjects,
      indirectlyAffectedProjects,
      impactScore,
      riskLevel
    };
  }
}

// ===== Usage Examples =====

/**
 * Example service using all graph repositories
 */
@Injectable()
export class OrganizationAnalyticsService {
  constructor(
    private readonly personGraphRepo: PersonGraphRepository,
    private readonly companyGraphRepo: CompanyGraphRepository,
    private readonly projectGraphRepo: ProjectGraphRepository
  ) {}

  /**
   * Comprehensive organizational network analysis
   */
  async analyzeOrganizationNetwork(personId: string): Promise<{
    personalNetwork: any;
    influence: any;
    projects: any;
    recommendations: string[];
  }> {
    const [personalNetwork, influence] = await Promise.all([
      this.personGraphRepo.findNetworkWithinDistance(personId, 3),
      this.personGraphRepo.calculateInfluenceScore(personId)
    ]);

    // Find projects this person is involved in (simplified)
    // In real implementation, this would involve person-project relationships
    const projects = {
      activeProjects: [],
      completedProjects: [],
      upcomingProjects: []
    };

    // Generate recommendations based on network analysis
    const recommendations: string[] = [];

    if (personalNetwork.networkSize < 10) {
      recommendations.push('Consider expanding your professional network');
    }

    if (influence.networkMetrics.crossDepartmentalConnections < 3) {
      recommendations.push('Build more cross-departmental relationships');
    }

    if (influence.influenceScore < 20) {
      recommendations.push('Engage in high-visibility projects to increase influence');
    }

    return {
      personalNetwork,
      influence,
      projects,
      recommendations
    };
  }
}

// ===== Graph Repository Benefits =====

/**
 * Key benefits of using GraphRepository:
 *
 * 1. **Graph-Specific Operations**: Specialized methods for graph traversal,
 *    path finding, and network analysis that go beyond simple CRUD
 *
 * 2. **Performance Optimization**: Built-in caching, connection pooling,
 *    and query optimization for graph operations
 *
 * 3. **Type Safety**: Full TypeScript support with generic types for
 *    entity-specific repositories
 *
 * 4. **Complex Algorithms**: Support for shortest path, centrality measures,
 *    connected components, and clustering algorithms
 *
 * 5. **Business Logic Integration**: Easy integration with business logic
 *    for social networks, organizational analysis, and dependency management
 *
 * 6. **Error Handling**: Robust error handling with fallback strategies
 *    for when advanced graph algorithms aren't available
 */
