# Implementation Plan

- [x] 1. Fix Core Module Exports and Constants

  - Add missing constant exports (LANGGRAPH_MODULE_OPTIONS)
  - Ensure all core interfaces are properly exported as types
  - Fix WorkflowStateAnnotation and createCustomStateAnnotation exports
  - Validate isWorkflow function export from utils
  - _Requirements: 1.1, 2.1, 2.3_

- [x] 2. Fix Streaming Module Exports and Interfaces

  - [x] 2.1 Add missing streaming interface exports

    - Export StreamTokenMetadata, StreamEventMetadata, StreamProgressMetadata as types
    - Add helper functions: getStreamTokenMetadata, getStreamEventMetadata, getStreamProgressMetadata
    - Ensure StreamEventType enum is exported as runtime value
    - _Requirements: 1.2, 2.2_

  - [x] 2.2 Validate streaming services exports

    - Ensure TokenStreamingService, EventStreamProcessorService, WebSocketBridgeService are exported
    - Verify all streaming decorators are exported
    - Test streaming constants export
    - _Requirements: 1.2_

- [x] 3. Fix Functional-API Module Exports

  - [x] 3.1 Export metadata functions

    - Export getWorkflowMetadata from workflow.decorator
    - Export getWorkflowNodes and getAllStreamingMetadata from node.decorator
    - Export getWorkflowEdges from edge.decorator
    - _Requirements: 1.3, 2.4_

  - [x] 3.2 Export metadata types

    - Export NodeMetadata and EdgeMetadata as types
    - Ensure all decorator interfaces are exported
    - Validate isWorkflow re-export from core
    - _Requirements: 1.3, 2.1_

- [x] 4. Configure Rollup Inter-Module Dependencies

  - [x] 4.1 Add buildLibsFromSource configuration

    - Set buildLibsFromSource: true for functional-api module
    - Set buildLibsFromSource: true for workflow-engine module
    - Set buildLibsFromSource: true for hitl, multi-agent, time-travel modules
    - _Requirements: 3.1, 3.2_

  - [x] 4.2 Configure external dependencies

    - Add external config for functional-api: ["@hive-academy/langgraph-core", "@hive-academy/langgraph-checkpoint"]
    - Add external config for workflow-engine: ["@hive-academy/langgraph-core", "@hive-academy/langgraph-streaming", "@hive-academy/langgraph-functional-api"]
    - Add external config for hitl and multi-agent: ["@hive-academy/langgraph-core"]
    - Add external config for time-travel: ["@hive-academy/langgraph-checkpoint"]
    - _Requirements: 3.3, 3.4_

- [ ] 5. Fix Import Statement Type Mismatches

  - [x] 5.1 Fix workflow-engine streaming imports

    - Change StreamUpdate, StreamMetadata, TokenData to type imports
    - Keep StreamEventType as runtime import (enum)
    - Keep helper functions as runtime imports
    - _Requirements: 4.1, 4.2_

  - [x] 5.2 Fix workflow-engine core imports

    - Change WorkflowState, Command, WorkflowDefinition to type imports
    - Keep WorkflowStateAnnotation, constants as runtime imports
    - Keep isWorkflow as runtime import
    - _Requirements: 4.1, 4.3_

  - [x] 5.3 Fix workflow-engine functional-api imports

    - Keep metadata functions as runtime imports
    - Change metadata types to type imports where appropriate
    - Validate all cross-module imports
    - _Requirements: 4.1, 4.4_

- [ ] 6. Validate Individual Module Builds

  - [x] 6.1 Test core module build

    - Run `npx nx build langgraph-modules/core`
    - Verify no TypeScript errors
    - Validate all exports are available
    - _Requirements: 5.1_

  - [x] 6.2 Test streaming module build

    - Run `npx nx build langgraph-modules/streaming`
    - Verify no missing export errors
    - Test interface and enum exports
    - _Requirements: 5.2_

  - [x] 6.3 Test functional-api module build

    - Run `npx nx build langgraph-modules/functional-api`
    - Verify metadata functions are exported
    - Test decorator exports
    - _Requirements: 5.3_

  - [x] 6.4 Test workflow-engine module build

    - Run `npx nx build langgraph-modules/workflow-engine`
    - Verify all imports resolve correctly
    - Test buildLibsFromSource functionality
    - _Requirements: 5.4_

- [ ] 7. Test Dependent Module Builds

  - [x] 7.1 Test hitl module build

    - Run `npx nx build langgraph-modules/hitl`
    - Verify core imports work correctly
    - Test external dependency configuration
    - _Requirements: 5.1, 3.3_

  - [x] 7.2 Test multi-agent module build

    - Run `npx nx build langgraph-modules/multi-agent`
    - Verify core imports and tool decorators work
    - Test buildLibsFromSource with core dependency
    - _Requirements: 5.1, 3.3_

  - [x] 7.3 Test time-travel module build

    - Run `npx nx build langgraph-modules/time-travel`
    - Verify checkpoint imports work correctly
    - Test external dependency configuration
    - _Requirements: 5.1, 3.3_

- [ ] 8. Validate Complete Build Pipeline

  - [x] 8.1 Test full ecosystem build

    - Run builds for all langgraph modules in dependency order
    - Verify no cascading build failures
    - Test build performance and timing
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 8.2 Test API server startup

    - Run `npm run api` command
    - Verify dev-brand-api starts without build errors
    - Test that all langgraph modules load correctly
    - Validate no runtime import errors
    - _Requirements: 5.5_

- [ ] 9. Fix ChromaDB and Neo4j Library Build Issues

  - [-] 9.1 Audit ChromaDB library configuration




    - Check nestjs-chromadb project.json for Rollup configuration consistency
    - Verify export patterns match langgraph-modules standards
    - Test nestjs-chromadb build independently
    - Fix any missing exports or build configuration issues

    - _Requirements: 2.1, 2.2, 3.1_

  - [ ] 9.2 Audit Neo4j library configuration

    - Check nestjs-neo4j project.json for Rollup configuration consistency
    - Verify export patterns match langgraph-modules standards
    - Test nestjs-neo4j build independently
    - Fix any missing exports or build configuration issues
    - _Requirements: 2.1, 2.2, 3.1_

  - [ ] 9.3 Test ChromaDB and Neo4j integration with dev-brand-api
    - Verify dev-brand-api can import from @hive-academy/nestjs-chromadb
    - Verify dev-brand-api can import from @hive-academy/nestjs-neo4j
    - Test that both libraries work correctly in API server startup
    - Fix any integration issues or missing dependencies
    - _Requirements: 5.5_

- [ ] 10. Validate Complete Ecosystem Build

  - [ ] 10.1 Test all @hive-academy libraries build

    - Run builds for nestjs-chromadb, nestjs-neo4j, nestjs-langgraph
    - Run builds for all langgraph-modules in dependency order
    - Verify no cascading build failures across entire ecosystem
    - Test build performance and timing for complete ecosystem
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 10.2 Test complete API server startup with all libraries
    - Run `npm run api` command with all libraries integrated
    - Verify dev-brand-api starts without any build errors
    - Test that all @hive-academy libraries load correctly
    - Validate no runtime import errors across entire ecosystem
    - _Requirements: 5.5_

- [ ] 11. Document Export and Import Patterns

  - [ ] 11.1 Create export guidelines

    - Document when to use `export type` vs regular exports
    - Create templates for new module exports
    - Document Rollup configuration patterns
    - Include ChromaDB and Neo4j library examples
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 11.2 Create import guidelines

    - Document when to use `import type` vs regular imports
    - Create examples of correct import patterns
    - Document buildLibsFromSource implications
    - Include cross-library import examples
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 11.3 Create library consistency checklist
    - Document standard Rollup configuration for all @hive-academy libraries
    - Create export pattern validation checklist
    - Document build order and dependency management
    - Create troubleshooting guide for common build issues
    - _Requirements: 2.1, 2.2, 3.1, 3.2_
