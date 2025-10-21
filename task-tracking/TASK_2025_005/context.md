# Task Context for TASK_2025_005

## User Intent

Refactor memory library - enhance adapters before removing custom queries from library itself

## Conversation Summary

### Key Decisions

- Combine insights from both analysis documents (MEMORY_LIBRARY_DISCONNECT_ANALYSIS.md and MEMORY_LIBRARY_DISCONNECT_ANALYSIS_corrected.md)
- Update and enhance memory adapters BEFORE removing hardcoded business logic from library
- Follow the corrected analysis approach which clarifies the two-layer adapter architecture

### Technical Context from Analyses

**Critical Issue Identified:**
The memory library (`@hive-academy/langgraph-memory`) has hardcoded business logic that bypasses the adapter pattern, creating two incompatible data stores.

**Two-Layer Adapter Architecture:**

1. **DB Adapters** (IVectorService, IGraphService) - Injected FROM application → TO memory library
2. **Memory Adapter** (IMemoryAdapter) - Exported FROM memory library → TO other langgraph modules

**Key Problems:**

1. Library business logic (MemoryStorageService, MemoryGraphService) bypasses DB adapters
2. MemoryGraphService writes hardcoded Cypher queries instead of delegating to Neo4jGraphAdapter
3. MemoryStorageService uses generic collection names instead of delegating to ChromaVectorAdapter
4. AgentMemoryBridgeService is disconnected but should integrate with IMemoryAdapter flow
5. MemoryManagerAdapter delegates to broken MemoryService (which bypasses DB adapters)

**Corrected Understanding:**

- Collections ARE handled correctly by application via entity decorators (`@ChromaEntity({ collection: 'vector-memories' })`)
- The problem is NOT config-driven collections - it's that library services bypass adapters entirely
- MemoryManagerAdapter already tries to call adapter methods directly when available
- AgentMemoryBridgeService provides sophisticated functionality (agent isolation, checkpoint sync, statistics) but is never registered or used

### Referenced Files

- MEMORY_LIBRARY_DISCONNECT_ANALYSIS.md (original analysis)
- MEMORY_LIBRARY_DISCONNECT_ANALYSIS_corrected.md (corrected analysis with refined approach)
- libs/langgraph-modules/memory/src/lib/services/memory-storage.service.ts
- libs/langgraph-modules/memory/src/lib/services/memory-graph.service.ts
- libs/langgraph-modules/memory/src/lib/services/agent-memory-bridge.service.ts
- libs/langgraph-modules/memory/src/lib/interfaces/memory-adapter.interface.ts
- apps/dev-brand-api/src/app/adapters/memory/chroma-vector.adapter.ts
- apps/dev-brand-api/src/app/adapters/memory/neo4j-graph.adapter.ts

### Implementation Phases (from corrected analysis)

**Phase 1: Remove Library Business Logic (3-5 hours)**

- Delete hardcoded business logic in MemoryGraphService
- Remove hardcoded business logic in MemoryStorageService
- Remove config.collection usage entirely (collections controlled by application entities)

**Phase 2: Refactor AgentMemoryBridgeService (2-3 hours)**

- Remove MemoryService dependency
- Update all methods to call adapters directly (IVectorService, IGraphService)

**Phase 3: Integrate AgentMemoryBridgeService with IMemoryAdapter (1-2 hours)**

- Option A: Use AgentMemoryBridgeService as IMemoryAdapter implementation
- Option B: Integrate inside MemoryManagerAdapter

**Phase 4: Register and Export AgentMemoryBridgeService (30 minutes)**

- Register in memory.module.ts providers
- Export from index.ts

**Phase 5: Testing (2-3 hours)**

- Verify single data store (only 'vector-memories' collection, only application Memory entity)
- Verify IMemoryAdapter functionality
- Verify AgentMemoryBridgeService features (agent isolation, checkpoint sync, statistics)

## Technical Context

- Branch: feature/005
- Created: 2025-10-09 16:00:00
- Task Type: Refactoring
- Priority: P0-Critical
- Effort Estimate: L (Large - 8-13 hours)

## Success Criteria

1. ✅ Library services (MemoryStorageService, MemoryGraphService) become pure delegators
2. ✅ No hardcoded Cypher queries in library
3. ✅ No generic collection names in library
4. ✅ AgentMemoryBridgeService integrated with IMemoryAdapter
5. ✅ Single data store pattern verified (ChromaDB: 'vector-memories' only, Neo4j: application Memory entity only)
6. ✅ All IMemoryAdapter consumers (multi-agent, workflow-engine, HITL) get enhanced functionality

## Important Notes

- **CRITICAL PRIORITY**: This is marked as P0-Critical because it invalidates the adapter pattern
- **Adapter Enhancement First**: Must enhance adapters BEFORE removing library logic to avoid breaking functionality
- **No Config Collections**: Collections are handled by entity decorators, not configuration
- **AgentMemoryBridgeService Integration**: 555 lines of sophisticated logic that must be utilized

---

_This context file provides agents with the user's original request and comprehensive conversation history to ensure accurate implementation._
