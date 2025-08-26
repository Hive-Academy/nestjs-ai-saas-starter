import { Injectable, Optional, Inject } from '@nestjs/common';
import { IVectorDatabase } from '../interfaces/vector-database.interface';

/**
 * ChromaDB Adapter for Vector Database Interface
 * 
 * This adapter bridges the ChromaDBService to our IVectorDatabase interface,
 * allowing the memory module to work with ChromaDB without direct coupling.
 */
@Injectable()
export class ChromaDBVectorAdapter implements IVectorDatabase {
  constructor(
    @Optional()
    @Inject('ChromaDBService')
    private readonly chromaDB?: any
  ) {}

  async addDocuments(
    collectionName: string,
    params: {
      ids: string[];
      documents: string[];
      metadatas?: Record<string, any>[];
      embeddings?: number[][];
    }
  ): Promise<void> {
    if (!this.chromaDB) {
      throw new Error('ChromaDB service not available');
    }
    
    await this.chromaDB.addDocuments(collectionName, params);
  }

  async queryDocuments(
    collectionName: string,
    params: {
      queryTexts?: string[];
      queryEmbeddings?: number[][];
      nResults?: number;
      where?: Record<string, any>;
      include?: string[];
    }
  ): Promise<{
    ids: string[][];
    documents?: string[][];
    metadatas?: Record<string, any>[][];
    distances?: number[][];
    embeddings?: number[][][];
  }> {
    if (!this.chromaDB) {
      throw new Error('ChromaDB service not available');
    }
    
    return await this.chromaDB.queryDocuments(collectionName, params);
  }

  async getDocuments(
    collectionName: string,
    params: {
      ids?: string[];
      where?: Record<string, any>;
      limit?: number;
      offset?: number;
      include?: string[];
    }
  ): Promise<{
    ids: string[];
    documents?: string[];
    metadatas?: Record<string, any>[];
    embeddings?: number[][];
  }> {
    if (!this.chromaDB) {
      throw new Error('ChromaDB service not available');
    }
    
    return await this.chromaDB.getDocuments(collectionName, params);
  }

  async updateDocuments(
    collectionName: string,
    params: {
      ids: string[];
      documents?: string[];
      metadatas?: Record<string, any>[];
      embeddings?: number[][];
    }
  ): Promise<void> {
    if (!this.chromaDB) {
      throw new Error('ChromaDB service not available');
    }
    
    await this.chromaDB.updateDocuments(collectionName, params);
  }

  async deleteDocuments(
    collectionName: string,
    params: {
      ids?: string[];
      where?: Record<string, any>;
    }
  ): Promise<void> {
    if (!this.chromaDB) {
      throw new Error('ChromaDB service not available');
    }
    
    await this.chromaDB.deleteDocuments(collectionName, params);
  }

  async createCollection(
    name: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.chromaDB) {
      throw new Error('ChromaDB service not available');
    }
    
    await this.chromaDB.createCollection(name, metadata);
  }

  async deleteCollection(name: string): Promise<void> {
    if (!this.chromaDB) {
      throw new Error('ChromaDB service not available');
    }
    
    await this.chromaDB.deleteCollection(name);
  }

  async getOrCreateCollection(
    name: string,
    metadata?: Record<string, any>
  ): Promise<any> {
    if (!this.chromaDB) {
      throw new Error('ChromaDB service not available');
    }
    
    return await this.chromaDB.getOrCreateCollection(name, metadata);
  }

  async listCollections(): Promise<string[]> {
    if (!this.chromaDB) {
      throw new Error('ChromaDB service not available');
    }
    
    return await this.chromaDB.listCollections();
  }

  async countDocuments(collectionName: string): Promise<number> {
    if (!this.chromaDB) {
      throw new Error('ChromaDB service not available');
    }
    
    return await this.chromaDB.getCollectionCount(collectionName);
  }

  async peekDocuments(
    collectionName: string,
    limit?: number
  ): Promise<{
    ids: string[];
    documents?: string[];
    metadatas?: Record<string, any>[];
  }> {
    if (!this.chromaDB) {
      throw new Error('ChromaDB service not available');
    }
    
    return await this.chromaDB.peekCollection(collectionName, limit);
  }

  async healthCheck(): Promise<boolean> {
    if (!this.chromaDB) {
      return false;
    }
    
    try {
      await this.chromaDB.listCollections();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if ChromaDB service is available
   */
  isAvailable(): boolean {
    return !!this.chromaDB;
  }
}