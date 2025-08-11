import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { GraphService } from './graph.service';
import { CreateNodeDto } from './dto/create-node.dto';
import { CreateRelationshipDto } from './dto/create-relationship.dto';
import { QueryGraphDto } from './dto/query-graph.dto';

@ApiTags('graph')
@Controller('graph')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Post('node')
  @ApiOperation({ summary: 'Create a new node' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Node created successfully',
  })
  async createNode(@Body() createNodeDto: CreateNodeDto) {
    return this.graphService.createNode(createNodeDto);
  }

  @Get('node/:id')
  @ApiOperation({ summary: 'Get node by ID' })
  async getNode(@Param('id') id: string) {
    return this.graphService.getNode(id);
  }

  @Delete('node/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a node' })
  async deleteNode(@Param('id') id: string) {
    return this.graphService.deleteNode(id);
  }

  @Post('relationship')
  @ApiOperation({ summary: 'Create a relationship between nodes' })
  async createRelationship(
    @Body() createRelationshipDto: CreateRelationshipDto
  ) {
    return this.graphService.createRelationship(createRelationshipDto);
  }

  @Get('relationships/:nodeId')
  @ApiOperation({ summary: 'Get all relationships for a node' })
  async getRelationships(@Param('nodeId') nodeId: string) {
    return this.graphService.getRelationships(nodeId);
  }

  @Post('query')
  @ApiOperation({ summary: 'Execute a Cypher query' })
  async queryGraph(@Body() queryDto: QueryGraphDto) {
    return this.graphService.queryGraph(queryDto);
  }

  @Get('shortest-path')
  @ApiOperation({ summary: 'Find shortest path between two nodes' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  async findShortestPath(@Query('from') from: string, @Query('to') to: string) {
    return this.graphService.findShortestPath(from, to);
  }

  @Get('neighbors/:nodeId')
  @ApiOperation({ summary: 'Get neighbors of a node' })
  @ApiQuery({ name: 'depth', required: false, type: Number })
  async getNeighbors(
    @Param('nodeId') nodeId: string,
    @Query('depth') depth = 1
  ) {
    return this.graphService.getNeighbors(nodeId, depth);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get graph statistics' })
  async getGraphStats() {
    return this.graphService.getGraphStats();
  }
}
