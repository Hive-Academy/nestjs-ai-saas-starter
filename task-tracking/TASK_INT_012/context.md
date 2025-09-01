# TASK_INT_012 Context

## Original User Request

User Request: lets start a new workflow to fix and enhance our @libs\langgraph-modules\memory\ basically we shouldn't directly inject chormaDb and neo4j modules and make a tight couplin between them, rather we should define an intterface contract to the vectoreService, graphService inside our memory and add 2 adapters for chomra and neo4j and allow for extending the adapter and let the user inject those adapters when he register the memory module in our app.module.ts , is that clear ?

## Task Context

- Current Branch: feature/TASK_INT_010-adapter-pattern-standardization
- Previous Task Status: All tasks completed, no incomplete items in registry
- Location: @libs/langgraph-modules/memory/
- Core Issue: Tight coupling between memory module and specific database implementations (ChromaDB, Neo4j)
- Solution: Implement adapter pattern with injectable services

## Key Requirements from User

1. Remove direct injection of ChromaDB and Neo4j modules
2. Define interface contracts for vectorService and graphService
3. Create 2 adapters: one for ChromaDB, one for Neo4j
4. Allow extensibility for additional adapters
5. Enable user injection of adapters during module registration in app.module.ts

## Current State Analysis

- memory module exists in @libs/langgraph-modules/memory/
- Likely has tight coupling to database services
- Needs architectural refactoring to adapter pattern
- Must maintain backward compatibility for existing functionality
