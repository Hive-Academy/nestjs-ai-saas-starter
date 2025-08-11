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
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { SearchDocumentDto } from './dto/search-document.dto';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create and index a new document' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Document created successfully' })
  async createDocument(@Body() createDocumentDto: CreateDocumentDto) {
    return this.documentsService.createDocument(createDocumentDto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search documents using semantic search' })
  @ApiQuery({ name: 'query', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results to return' })
  async searchDocuments(@Query() searchDto: SearchDocumentDto) {
    return this.documentsService.searchDocuments(searchDto);
  }

  @Get('collections')
  @ApiOperation({ summary: 'List all collections' })
  async listCollections() {
    return this.documentsService.listCollections();
  }

  @Get('collection/:name')
  @ApiOperation({ summary: 'Get collection details' })
  async getCollection(@Param('name') name: string) {
    return this.documentsService.getCollection(name);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document' })
  async deleteDocument(@Param('id') id: string) {
    return this.documentsService.deleteDocument(id);
  }

  @Post('embedding')
  @ApiOperation({ summary: 'Generate embeddings for text' })
  async generateEmbedding(@Body('text') text: string) {
    return this.documentsService.generateEmbedding(text);
  }
}