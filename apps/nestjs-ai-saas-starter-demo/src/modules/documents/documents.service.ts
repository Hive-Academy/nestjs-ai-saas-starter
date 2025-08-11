import { Injectable, Logger } from '@nestjs/common';
import { InjectChromaDB } from '@hive-academy/nestjs-chromadb';
import { ChromaClient } from 'chromadb';
import { CreateDocumentDto } from './dto/create-document.dto';
import { SearchDocumentDto } from './dto/search-document.dto';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectChromaDB() private readonly chromaClient: ChromaClient,
  ) {}

  async createDocument(createDocumentDto: CreateDocumentDto) {
    try {
      const collection = await this.chromaClient.getOrCreateCollection({
        name: createDocumentDto.collection || 'default',
      });

      await collection.add({
        ids: [createDocumentDto.id || this.generateId()],
        documents: [createDocumentDto.content],
        metadatas: [createDocumentDto.metadata || {}],
      });

      return {
        success: true,
        message: 'Document indexed successfully',
        id: createDocumentDto.id,
      };
    } catch (error) {
      this.logger.error('Failed to create document', error);
      throw error;
    }
  }

  async searchDocuments(searchDto: SearchDocumentDto) {
    try {
      const collection = await this.chromaClient.getCollection({
        name: searchDto.collection || 'default',
      });

      const results = await collection.query({
        queryTexts: [searchDto.query],
        nResults: searchDto.limit || 10,
      });

      return {
        query: searchDto.query,
        results: results.documents[0]?.map((doc, index) => ({
          document: doc,
          metadata: results.metadatas[0]?.[index],
          distance: results.distances?.[0]?.[index],
          id: results.ids[0]?.[index],
        })) || [],
      };
    } catch (error) {
      this.logger.error('Failed to search documents', error);
      throw error;
    }
  }

  async listCollections() {
    try {
      const collections = await this.chromaClient.listCollections();
      return collections;
    } catch (error) {
      this.logger.error('Failed to list collections', error);
      throw error;
    }
  }

  async getCollection(name: string) {
    try {
      const collection = await this.chromaClient.getCollection({ name });
      const count = await collection.count();
      
      return {
        name,
        count,
        metadata: collection.metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to get collection ${name}`, error);
      throw error;
    }
  }

  async deleteDocument(id: string) {
    try {
      const collection = await this.chromaClient.getCollection({
        name: 'default',
      });
      
      await collection.delete({
        ids: [id],
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete document ${id}`, error);
      throw error;
    }
  }

  async generateEmbedding(text: string) {
    try {
      const collection = await this.chromaClient.getOrCreateCollection({
        name: 'embeddings',
      });

      const embedding = await collection.embeddingFunction?.generate([text]);
      
      return {
        text,
        embedding: embedding?.[0],
        dimensions: embedding?.[0]?.length,
      };
    } catch (error) {
      this.logger.error('Failed to generate embedding', error);
      throw error;
    }
  }

  private generateId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}