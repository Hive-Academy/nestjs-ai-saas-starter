import { Injectable } from '@nestjs/common';
import type {
  GraphNode,
  GraphRelationship,
  GraphPath,
} from '@hive-academy/langgraph-memory';
import { Memory } from '../../entities/neo4j/memory.entity';

/**
 * Graph Helpers Service
 *
 * Shared utility methods for graph operations.
 * Extracted from memory-graph.repository.ts to reduce file size and improve maintainability.
 */
@Injectable()
export class GraphHelpersService {
  // ============================================================================
  // TRAVERSAL HELPERS
  // ============================================================================

  getTraversalDirection(direction?: 'IN' | 'OUT' | 'BOTH'): {
    start: string;
    end: string;
  } {
    switch (direction) {
      case 'IN':
        return { start: '<-', end: '-' };
      case 'OUT':
        return { start: '-', end: '->' };
      case 'BOTH':
        return { start: '-', end: '-' };
      default:
        return { start: '-', end: '-' };
    }
  }

  buildRelationshipFilter(types?: readonly string[]): string {
    if (!types || types.length === 0) return '';
    return `:${types.join('|')}`;
  }

  buildNodeFilter(labels?: readonly string[]): string {
    if (!labels || labels.length === 0) return '';
    return `:${labels.join(':')}`;
  }

  buildPropertyFilter(properties?: Record<string, unknown>): string {
    if (!properties || Object.keys(properties).length === 0) return '';

    const conditions = Object.entries(properties).map(([key, value]) => {
      if (typeof value === 'string') {
        return `end.${key} = "${value}"`;
      }
      return `end.${key} = ${value}`;
    });

    return conditions.join(' AND ');
  }

  // ============================================================================
  // NODE/RELATIONSHIP EXTRACTION
  // ============================================================================

  extractNodes(nodeList: any[]): GraphNode[] {
    return nodeList.map((node) => this.extractNode(node));
  }

  extractNode(node: any): GraphNode {
    if (!node || typeof node !== 'object') {
      return {
        id: '',
        labels: [],
        properties: {},
      };
    }

    return {
      id: String(node.id || node.identity || ''),
      labels: Array.isArray(node.labels) ? node.labels.map(String) : [],
      properties: node.properties || {},
    };
  }

  extractRelationships(relList: any[]): GraphRelationship[] {
    return relList.map((rel) => this.extractRelationship(rel));
  }

  extractRelationship(rel: any): GraphRelationship {
    if (!rel || typeof rel !== 'object') {
      return {
        id: '',
        type: '',
        startNodeId: '',
        endNodeId: '',
        properties: {},
      };
    }

    return {
      id: String(rel.id || rel.identity || ''),
      type: String(rel.type || ''),
      startNodeId: String(rel.startNodeId || rel.start || ''),
      endNodeId: String(rel.endNodeId || rel.end || ''),
      properties: rel.properties || {},
    };
  }

  extractPath(pathData: any): GraphPath {
    if (!pathData || typeof pathData !== 'object') {
      return {
        nodes: [],
        relationships: [],
        length: 0,
      };
    }

    const segments = Array.isArray(pathData.segments) ? pathData.segments : [];

    const allNodes: any[] = [];
    const allRelationships: any[] = [];

    segments.forEach((segment: any) => {
      if (segment.start) allNodes.push(segment.start);
      if (segment.relationship) allRelationships.push(segment.relationship);
      if (segment.end) allNodes.push(segment.end);
    });

    return {
      nodes: this.extractNodes(allNodes),
      relationships: this.extractRelationships(allRelationships),
      length: segments.length,
    };
  }

  // ============================================================================
  // DEDUPLICATION
  // ============================================================================

  deduplicateNodes(nodes: GraphNode[]): GraphNode[] {
    const seen = new Set<string>();
    return nodes.filter((node) => {
      if (seen.has(node.id)) return false;
      seen.add(node.id);
      return true;
    });
  }

  deduplicateRelationships(
    relationships: GraphRelationship[]
  ): GraphRelationship[] {
    const seen = new Set<string>();
    return relationships.filter((rel) => {
      if (seen.has(rel.id)) return false;
      seen.add(rel.id);
      return true;
    });
  }

  // ============================================================================
  // ENTITY MAPPING
  // ============================================================================

  mapNodeToMemory(props: any): Memory {
    const memory = new Memory();
    memory.id = props.id || '';
    memory.labels = props.labels
      ? typeof props.labels === 'string'
        ? JSON.parse(props.labels)
        : props.labels
      : [];
    memory.properties = props.properties
      ? typeof props.properties === 'string'
        ? JSON.parse(props.properties)
        : props.properties
      : {};
    memory.memoryType = props.memoryType || 'working';
    memory.importance = props.importance || 0.5;
    memory.confidence = props.confidence || 0.5;
    memory.agentId = props.agentId || undefined;
    memory.sessionId = props.sessionId || undefined;
    memory.createdAt = props.createdAt ? new Date(props.createdAt) : new Date();
    memory.lastAccessed = props.lastAccessed
      ? new Date(props.lastAccessed)
      : new Date();
    memory.expiresAt = props.expiresAt ? new Date(props.expiresAt) : undefined;
    return memory;
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  validateNodeData(data: any): void {
    if (!data) {
      throw new Error('Node data is required');
    }
    if (!data.labels || data.labels.length === 0) {
      throw new Error('Node labels are required');
    }
  }

  validateRelationshipData(data: any): void {
    if (!data) {
      throw new Error('Relationship data is required');
    }
    if (!data.type?.trim()) {
      throw new Error('Relationship type is required');
    }
  }

  validateCypherQuery(query: string): void {
    if (!query?.trim()) {
      throw new Error('Cypher query cannot be empty');
    }

    const dangerousPatterns = [
      /DROP\s+DATABASE/i,
      /DELETE\s+FROM/i,
      /TRUNCATE/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        throw new Error(
          `Potentially dangerous Cypher query detected: ${query}`
        );
      }
    }
  }

  // ============================================================================
  // ID GENERATION
  // ============================================================================

  generateId(prefix = 'node'): string {
    return `${prefix}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 15)}`;
  }
}
