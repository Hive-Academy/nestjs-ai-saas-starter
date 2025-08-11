import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';
import { CreateNodeDto } from './dto/create-node.dto';
import { CreateRelationshipDto } from './dto/create-relationship.dto';
import { QueryGraphDto } from './dto/query-graph.dto';

@Injectable()
export class GraphService {
  private readonly logger = new Logger(GraphService.name);

  constructor(private readonly neo4jService: Neo4jService) {}

  async createNode(createNodeDto: CreateNodeDto) {
    try {
      const result = await this.neo4jService.write(
        `CREATE (n:${createNodeDto.label} $props) RETURN n`,
        { props: createNodeDto.properties },
      );
      
      return {
        success: true,
        node: result.records[0]?.get('n'),
      };
    } catch (error) {
      this.logger.error('Failed to create node', error);
      throw error;
    }
  }

  async getNode(id: string) {
    try {
      const result = await this.neo4jService.read(
        'MATCH (n) WHERE id(n) = $id RETURN n',
        { id: parseInt(id) },
      );
      
      return result.records[0]?.get('n') || null;
    } catch (error) {
      this.logger.error(`Failed to get node ${id}`, error);
      throw error;
    }
  }

  async deleteNode(id: string) {
    try {
      await this.neo4jService.write(
        'MATCH (n) WHERE id(n) = $id DETACH DELETE n',
        { id: parseInt(id) },
      );
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete node ${id}`, error);
      throw error;
    }
  }

  async createRelationship(createRelationshipDto: CreateRelationshipDto) {
    try {
      const result = await this.neo4jService.write(
        `
        MATCH (a), (b)
        WHERE id(a) = $fromId AND id(b) = $toId
        CREATE (a)-[r:${createRelationshipDto.type} $props]->(b)
        RETURN r
        `,
        {
          fromId: parseInt(createRelationshipDto.fromNodeId),
          toId: parseInt(createRelationshipDto.toNodeId),
          props: createRelationshipDto.properties || {},
        },
      );
      
      return {
        success: true,
        relationship: result.records[0]?.get('r'),
      };
    } catch (error) {
      this.logger.error('Failed to create relationship', error);
      throw error;
    }
  }

  async getRelationships(nodeId: string) {
    try {
      const result = await this.neo4jService.read(
        `
        MATCH (n)-[r]-(m)
        WHERE id(n) = $nodeId
        RETURN n, r, m
        `,
        { nodeId: parseInt(nodeId) },
      );
      
      return result.records.map(record => ({
        node: record.get('n'),
        relationship: record.get('r'),
        relatedNode: record.get('m'),
      }));
    } catch (error) {
      this.logger.error(`Failed to get relationships for node ${nodeId}`, error);
      throw error;
    }
  }

  async queryGraph(queryDto: QueryGraphDto) {
    try {
      const result = await this.neo4jService.read(
        queryDto.query,
        queryDto.parameters || {},
      );
      
      return {
        records: result.records.map(record => record.toObject()),
        summary: {
          queryType: result.summary.query.text,
          counters: result.summary.counters,
        },
      };
    } catch (error) {
      this.logger.error('Failed to execute query', error);
      throw error;
    }
  }

  async findShortestPath(fromId: string, toId: string) {
    try {
      const result = await this.neo4jService.read(
        `
        MATCH (a), (b), 
        path = shortestPath((a)-[*]-(b))
        WHERE id(a) = $fromId AND id(b) = $toId
        RETURN path
        `,
        {
          fromId: parseInt(fromId),
          toId: parseInt(toId),
        },
      );
      
      const path = result.records[0]?.get('path');
      if (!path) {
        return { found: false };
      }
      
      return {
        found: true,
        length: path.length,
        nodes: path.nodes,
        relationships: path.relationships,
      };
    } catch (error) {
      this.logger.error(`Failed to find shortest path from ${fromId} to ${toId}`, error);
      throw error;
    }
  }

  async getNeighbors(nodeId: string, depth: number) {
    try {
      const result = await this.neo4jService.read(
        `
        MATCH (n)-[*1..${depth}]-(m)
        WHERE id(n) = $nodeId
        RETURN DISTINCT m
        `,
        { nodeId: parseInt(nodeId) },
      );
      
      return result.records.map(record => record.get('m'));
    } catch (error) {
      this.logger.error(`Failed to get neighbors for node ${nodeId}`, error);
      throw error;
    }
  }

  async getGraphStats() {
    try {
      const nodeCount = await this.neo4jService.read(
        'MATCH (n) RETURN count(n) as count',
      );
      
      const relationshipCount = await this.neo4jService.read(
        'MATCH ()-[r]-() RETURN count(r) as count',
      );
      
      const labels = await this.neo4jService.read(
        'CALL db.labels() YIELD label RETURN collect(label) as labels',
      );
      
      const relationshipTypes = await this.neo4jService.read(
        'CALL db.relationshipTypes() YIELD relationshipType RETURN collect(relationshipType) as types',
      );
      
      return {
        nodeCount: nodeCount.records[0]?.get('count').toNumber() || 0,
        relationshipCount: relationshipCount.records[0]?.get('count').toNumber() || 0,
        labels: labels.records[0]?.get('labels') || [],
        relationshipTypes: relationshipTypes.records[0]?.get('types') || [],
      };
    } catch (error) {
      this.logger.error('Failed to get graph stats', error);
      throw error;
    }
  }
}