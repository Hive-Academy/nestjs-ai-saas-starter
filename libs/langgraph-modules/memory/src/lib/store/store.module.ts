import { Module } from '@nestjs/common';
import { StoreService } from './services/store.service';
import { StoreStorageService } from './services/store-storage.service';
import { StoreGraphService } from './services/store-graph.service';

/**
 * Store Module - LangGraph 2025 Store Pattern Implementation
 *
 * Provides namespace-based hierarchical storage for cross-thread memory sharing.
 * Coordinates vector storage (ChromaDB) and graph relationships (Neo4j).
 *
 * Services:
 * - StoreService: Main orchestrator implementing IStoreService
 * - StoreStorageService: Vector storage delegation (ChromaDB)
 * - StoreGraphService: Graph relationship tracking (Neo4j)
 *
 * Default Collection: 'langgraph-stores'
 */
@Module({
  providers: [StoreService, StoreStorageService, StoreGraphService],
  exports: [StoreService],
})
export class StoreModule {}
