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

  - [x] 9.1 Audit ChromaDB library configuration

    - Check nestjs-chromadb project.json for Rollup configuration consistency
    - Verify export patterns match langgraph-modules standards
    - Test nestjs-chromadb build independently
    - Fix any missing exports or build configuration issues

    - _Requirements: 2.1, 2.2, 3.1_

  - [x] 9.2 Audit Neo4j library configuration

    - Check nestjs-neo4j project.json for Rollup configuration consistency
    - Verify export patterns match langgraph-modules standards
    - Test nestjs-neo4j build independently
    - Fix any missing exports or build configuration issues
    - _Requirements: 2.1, 2.2, 3.1_

  - [x] 9.3 Test ChromaDB and Neo4j integration with dev-brand-api

    - Verify dev-brand-api can import from @hive-academy/nestjs-chromadb
    - Verify dev-brand-api can import from @hive-academy/nestjs-neo4j
    - Test that both libraries work correctly in API server startup
    - Fix any integration issues or missing dependencies
    - _Requirements: 5.5_

- [ ] 10. Validate Complete Ecosystem Build

  - [x] 10.1 Test all @hive-academy libraries build

    - Run builds for nestjs-chromadb, nestjs-neo4j, nestjs-langgraph
    - Run builds for all langgraph-modules in dependency order
    - Verify no cascading build failures across entire ecosystem
    - Test build performance and timing for complete ecosystem
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 10.2 Test complete API server startup with all libraries

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

- [ ] 12. Fix Missing Core Interface Exports

  - [x] 12.1 Add WorkflowState interface to langgraph-core

    - Create WorkflowState interface in state-management.interface.ts
    - Export WorkflowState from core index.ts
    - Ensure it extends BaseWorkflowState with humanFeedback property
    - _Requirements: 1.1, 2.1_

  - [x] 12.2 Add HumanFeedback interface to langgraph-core

    - Create HumanFeedback interface in state-management.interface.ts
    - Export HumanFeedback from core index.ts
    - Include approved, status, confidence, timestamp, metadata properties
    - _Requirements: 1.1, 2.1_

  - [x] 12.3 Add WorkflowStateAnnotation to langgraph-core

    - Create WorkflowStateAnnotation in annotations/index.ts
    - Export WorkflowStateAnnotation from core index.ts as runtime export
    - Ensure it's compatible with LangGraph state management
    - _Requirements: 1.1, 2.3_

  - [x] 12.4 Export isWorkflow function from langgraph-core

    - Add isWorkflow function to utils/workflow-metadata.utils.ts
    - Export isWorkflow from core index.ts as runtime export
    - Ensure function validates workflow structure correctly
    - _Requirements: 1.1, 2.4_

- [ ] 13. Fix Missing Functional-API Exports

  - [ ] 13.1 Export getWorkflowMetadata from functional-api

    - Add getWorkflowMetadata function to workflow.decorator.ts
    - Export getWorkflowMetadata from functional-api index.ts
    - Ensure function extracts workflow metadata correctly
    - _Requirements: 1.3, 2.4_

  - [ ] 13.2 Re-export isWorkflow from functional-api

    - Import isWorkflow from @hive-academy/langgraph-core
    - Re-export isWorkflow from functional-api index.ts
    - Ensure consistent behavior across modules
    - _Requirements: 1.3, 2.4_

- [ ] 14. Fix Missing Backend Feature Module

  - [ ] 14.1 Create devbrand-backend-feature.module.ts

    - Create the missing module file in libs/dev-brand/backend/feature/src/lib/
    - Export DevbrandBackendFeatureModule class
    - Add proper NestJS module decorators and configuration
    - _Requirements: 5.5_

  - [ ] 14.2 Update devbrand-backend-feature index.ts

    - Export the new module from index.ts
    - Ensure proper barrel export pattern
    - Test that module can be imported correctly
    - _Requirements: 5.5_

- [ ] 15. Fix Circular Dependencies in NestJS LangGraph

  - [ ] 15.1 Restructure provider exports

    - Fix circular dependency in libs/langgraph-modules/nestjs-langgraph/src/lib/providers/index.ts
    - Separate module.providers.ts and module-exports.providers.ts imports
    - Create proper provider hierarchy without circular references
    - _Requirements: 3.1, 3.2_

  - [ ] 15.2 Test nestjs-langgraph build after provider fixes

    - Run `npx nx build nestjs-langgraph`
    - Verify no circular dependency warnings
    - Ensure all providers are properly exported
    - _Requirements: 5.1_

- [ ] 16. Fix TypeScript Build Configuration Issues

  - [ ] 16.1 Fix TypeScript output file warnings

    - Address TS6305 warnings about output files not built from source
    - Ensure proper TypeScript configuration for workspace libraries
    - Fix buildLibsFromSource configuration where needed
    - _Requirements: 3.1, 3.2_

  - [ ] 16.2 Optimize Rollup external dependencies

    - Add proper external configurations for NestJS modules
    - Configure external dependencies for @nestjs/websockets and @nestjs/microservices
    - Reduce bundle sizes by externalizing common dependencies
    - _Requirements: 3.3, 3.4_

- [ ] 17. Comprehensive System Test

  - [ ] 17.1 Test complete build pipeline

    - Run builds for all libraries in correct dependency order
    - Verify no TypeScript errors across entire ecosystem
    - Test that all exports are properly resolved
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 17.2 Test API server startup with all fixes

    - Run `npm run api` command
    - Verify dev-brand-api starts without any errors
    - Test that all modules load and initialize correctly
    - Validate complete system functionality
    - _Requirements: 5.5_

  - [ ] 17.3 Performance validation

    - Measure build times before and after fixes
    - Verify bundle sizes are reasonable
    - Test that startup time is acceptable
    - Document any performance improvements
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 18. Implement Proper TypeScript Definition File Bundling

  - [x] 18.1 Install rollup-plugin-dts

    - Add `rollup-plugin-dts` as dev dependency to workspace root
    - Ensure compatibility with current Nx and Rollup versions
    - Verify plugin works with existing TypeScript configuration
    - _Requirements: 2.1, 2.2_

  - [x] 18.2 Create rollup configs for .d.ts bundling

    - Create separate rollup.config.js files for each publishable module
    - Configure two-step build process: JavaScript bundle + TypeScript definitions bundle
    - Set proper external dependencies for .d.ts bundling to prevent bundling peer dependencies
    - Add dts plugin configuration with proper input/output paths
    - _Requirements: 2.1, 3.1, 3.3_

  - [x] 18.3 Update Nx project configurations

    - Modify project.json files to use new rollup configs with rollupConfig option
    - Ensure proper build order for .d.ts generation (TypeScript compilation first, then bundling)
    - Configure output paths to generate both individual and bundled .d.ts files
    - Test that bundled .d.ts files are generated correctly in dist folders
    - _Requirements: 3.1, 3.2_

  - [x] 18.4 Validate .d.ts bundling across ecosystem

    - Test that consuming applications can import types correctly from bundled definitions
    - Verify no duplicate type declarations in bundled .d.ts files
    - Ensure proper type resolution in IDEs (VSCode, WebStorm)
    - Test that external dependencies are properly excluded from .d.ts bundles
    - Validate that all exported types are available in the bundled definitions
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 18.5 Test complete build pipeline with .d.ts bundling

    - Run builds for all @hive-academy libraries with new .d.ts bundling
    - Verify that API server startup works with bundled type definitions
    - Test that all langgraph-modules work correctly with bundled .d.ts files
    - Measure build performance impact of .d.ts bundling
    - Document any configuration changes needed for consuming applications
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 19. Fix Missing Core Module Exports

  - [x] 19.1 Add missing WorkflowState export to langgraph-core

    - Verify WorkflowState interface exists in state-management.interface.ts
    - Export WorkflowState from core/src/index.ts as type export
    - Ensure it's properly defined with all required properties
    - _Requirements: 1.1, 2.1_

  - [x] 19.2 Add missing HumanFeedback export to langgraph-core

    - Verify HumanFeedback interface exists in state-management.interface.ts
    - Export HumanFeedback from core/src/index.ts as type export
    - Ensure it includes approved, status, confidence, timestamp, metadata properties
    - _Requirements: 1.1, 2.1_

  - [x] 19.3 Add missing WorkflowExecutionConfig export to langgraph-core

    - Create WorkflowExecutionConfig interface in workflow-config.interface.ts
    - Export WorkflowExecutionConfig from core/src/index.ts as type export
    - Include execution options, timeout, retry configuration
    - _Requirements: 1.1, 2.1_

  - [x] 19.4 Add missing WorkflowStateAnnotation export to langgraph-core

    - Verify WorkflowStateAnnotation exists in annotations/workflow-state.annotation.ts
    - Export WorkflowStateAnnotation from core/src/index.ts as runtime export
    - Ensure it's compatible with LangGraph state management
    - _Requirements: 1.1, 2.3_

  - [x] 19.5 Add missing isWorkflow function export to langgraph-core

    - Create isWorkflow function in utils/workflow-metadata.utils.ts
    - Export isWorkflow from core/src/index.ts as runtime export
    - Function should validate workflow structure and return boolean
    - _Requirements: 1.1, 2.4_

- [ ] 20. Fix Missing Streaming Module Exports

  - [x] 20.1 Add missing service exports to langgraph-streaming

    - Export TokenStreamingService from streaming/src/index.ts
    - Export EventStreamProcessorService from streaming/src/index.ts
    - Export WebSocketBridgeService from streaming/src/index.ts
    - Verify all services exist in services directory
    - _Requirements: 1.2, 2.2_

  - [x] 20.2 Add missing interface exports to langgraph-streaming

    - Export StreamUpdate as type from streaming/src/index.ts
    - Export StreamMetadata as type from streaming/src/index.ts
    - Export TokenData as type from streaming/src/index.ts
    - Export StreamTokenMetadata as type from streaming/src/index.ts
    - Export StreamEventMetadata as type from streaming/src/index.ts
    - Export StreamProgressMetadata as type from streaming/src/index.ts
    - _Requirements: 1.2, 2.2_

  - [x] 20.3 Add missing enum and function exports to langgraph-streaming

    - Export StreamEventType enum from streaming/src/index.ts as runtime export
    - Export getStreamTokenMetadata function from streaming/src/index.ts
    - Export getStreamEventMetadata function from streaming/src/index.ts
    - Export getStreamProgressMetadata function from streaming/src/index.ts
    - _Requirements: 1.2, 2.2_

- [ ] 21. Fix Missing Functional-API Module Exports

  - [x] 21.1 Add missing getWorkflowMetadata function to langgraph-functional-api

    - Create getWorkflowMetadata function in decorators/workflow.decorator.ts
    - Export getWorkflowMetadata from functional-api/src/index.ts as runtime export
    - Function should extract workflow metadata from decorated classes
    - _Requirements: 1.3, 2.4_

  - [x] 21.2 Add missing isWorkflow re-export to langgraph-functional-api

    - Import isWorkflow from @hive-academy/langgraph-core
    - Re-export isWorkflow from functional-api/src/index.ts as runtime export
    - Ensure consistent behavior across modules
    - _Requirements: 1.3, 2.4_

- [ ] 22. Create Missing DevBrand Backend Feature Module

  - [x] 22.1 Create devbrand-backend-feature.module.ts

    - Create libs/dev-brand/backend/feature/src/lib/devbrand-backend-feature.module.ts
    - Implement DevbrandBackendFeatureModule class with @Module decorator
    - Add proper NestJS module configuration and imports
    - _Requirements: 5.5_

  - [x] 22.2 Update devbrand-backend-feature index.ts

    - Export DevbrandBackendFeatureModule from feature/src/index.ts
    - Ensure proper barrel export pattern
    - Test that module can be imported correctly by dev-brand-api
    - _Requirements: 5.5_

- [ ] 23. Validate All Missing Exports Fixed

  - [x] 23.1 Test langgraph-core exports

    - Build langgraph-modules/core and verify no missing export errors
    - Test that WorkflowState, HumanFeedback, WorkflowExecutionConfig are available
    - Test that WorkflowStateAnnotation and isWorkflow are available as runtime exports
    - _Requirements: 1.1, 2.1, 2.3, 2.4_

  - [ ] 23.2 Test langgraph-streaming exports

    - Build langgraph-modules/streaming and verify no missing export errors
    - Test that all services (TokenStreamingService, EventStreamProcessorService, WebSocketBridgeService) are available
    - Test that all interfaces and enums are properly exported
    - _Requirements: 1.2, 2.2_

  - [ ] 23.3 Test langgraph-functional-api exports

    - Build langgraph-modules/functional-api and verify no missing export errors
    - Test that getWorkflowMetadata function is available
    - Test that isWorkflow re-export works correctly
    - _Requirements: 1.3, 2.4_

  - [ ] 23.4 Test workflow-engine builds without errors

    - Build langgraph-modules/workflow-engine and verify no TypeScript errors
    - Test that all imports from core, streaming, and functional-api resolve correctly
    - Verify buildLibsFromSource functionality works with all dependencies
    - _Requirements: 5.4_

  - [ ] 23.5 Test hitl module builds without errors

    - Build langgraph-modules/hitl and verify no missing WorkflowState or HumanFeedback errors
    - Test that core imports work correctly
    - Verify external dependency configuration
    - _Requirements: 5.1, 3.3_

- [ ] 24. Complete System Integration Test

  - [ ] 24.1 Test complete ecosystem build

    - Run builds for all langgraph modules in dependency order
    - Verify no TypeScript errors across entire ecosystem
    - Test that all cross-module imports resolve correctly
    - Measure build performance and timing
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 24.2 Test API server startup with all fixes

    - Run `npm run api` command
    - Verify dev-brand-api starts without any module resolution errors
    - Test that all @hive-academy libraries load correctly
    - Validate no runtime import errors across entire ecosystem
    - Test basic API endpoints respond correctly
    - _Requirements: 5.5_

  - [ ] 24.3 Performance and stability validation

    - Measure complete build times for all libraries
    - Verify bundle sizes are reasonable for all modules
    - Test that API server startup time is acceptable
    - Run basic smoke tests on key functionality
    - Document any performance improvements achieved
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
