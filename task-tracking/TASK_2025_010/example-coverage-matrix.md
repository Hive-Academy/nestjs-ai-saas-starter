# Example Coverage Matrix - TASK_2025_010

## Overview

This matrix maps all public features, decorators, services, and utilities in @hive-academy/nestjs-chromadb to dedicated example files under `src/lib/examples/`. Coverage is 100% for Phase 6 requirements: repository operations, vector queries, performance decorators, multi-tenancy, integration patterns, and validation/error handling.

- **Total Features Covered**: 28 (across 6 categories)
- **Example Files**: 14 (one or more per category, kept <200 LOC each)
- **Validation**: All examples use public exports only (via `src/index.ts` and `decorators/index.ts`). Compile with zero TS errors.
- **Status**: Planned (to be implemented sequentially)

## Coverage Matrix

| Category | Feature/Decorator/Service | Description | Example File | Status |
|----------|---------------------------|-------------|--------------|--------|
| **Basic Repository** | @ChromaRepository (CRUD) | Basic create, read, update, delete operations on documents | `src/lib/examples/basic/simple-crud.example.ts` | Implemented |
| **Basic Repository** | @ChromaRepository (Batch/Bulk) | Bulk add/upsert/delete with batch sizes and error handling | `src/lib/examples/basic/basic-repository.example.ts` | Implemented |
| **Basic Repository** | findAll with filters | Query with metadata filters, pagination, and sorting | `src/lib/examples/basic/basic-repository.example.ts` | Implemented |
| **Basic Repository** | exists/count/peek | Existence checks, count queries, and peek operations | `src/lib/examples/basic/simple-crud.example.ts` | Implemented |
| **Advanced Vector Query** | @VectorQuery (Basic) | Simple similarity search with auto-embedding and distances | `src/lib/examples/advanced/complex-queries.example.ts` | Implemented |
| **Advanced Vector Query** | @VectorQuery (Filters) | Metadata filters, where clauses, and result transforms | `src/lib/examples/advanced/complex-queries.example.ts` | Implemented |
| **Advanced Vector Query** | searchWithScores | Typed results with scores, limits, and offsets | `src/lib/examples/advanced/search-with-scores.example.ts` | Implemented |
| **Advanced Vector Query** | RAG Context | Background refresh and context building for RAG patterns | `src/lib/examples/advanced/search-with-scores.example.ts` | Implemented |
| **Performance Decorators** | @Cached (Strategies) | Caching with TTL, LRU, and vector-aware keys/invalidation | `src/lib/examples/performance/cached.example.ts` | Implemented |
| **Performance Decorators** | @Profiled (Thresholds/Sampling) | Performance metrics collection, sampling, and reporting | `src/lib/examples/performance/profiled.example.ts` | Implemented |
| **Performance Decorators** | @Retry (Configs/Circuit Breaker) | Exponential backoff, retries, and circuit breaker patterns | `src/lib/examples/performance/retry.example.ts` | Implemented |
| **Performance Decorators** | Combined (@Cached + @Profiled + @Retry) | Composition on repository/service methods | `src/lib/examples/performance/combined-performance.example.ts` | Implemented |
| **Multi-Tenancy** | @TenantAware (Prefix Strategy) | Tenant prefixing, header/JWT extraction, audit logging | `src/lib/examples/multi-tenant/tenant-aware-prefix.example.ts` | Implemented |
| **Multi-Tenancy** | @TenantAware (Separate Collections) | Separate collections per tenant, custom extraction modes | `src/lib/examples/multi-tenant/tenant-aware-separate.example.ts` | Implemented |
| **Multi-Tenancy** | @CrossTenant (Admin Flows) | Cross-tenant queries with permissions and caps | `src/lib/examples/multi-tenant/cross-tenant-admin.example.ts` | Implemented |
| **Integration** | ChromaDBFacade (Lifecycle/Health) | Collection create/delete, health checks, metrics | `src/lib/examples/integration/health-and-monitoring.example.ts` | Implemented |
| **Integration** | ChromaCache (Stats/Invalidation) | Cache statistics, vector-aware invalidation | `src/lib/examples/integration/health-and-monitoring.example.ts` | Implemented |
| **Integration** | forRoot/forRootAsync Config | Module configuration with presets and async options | `src/lib/examples/integration/config-for-root.example.ts` | Implemented |
| **Integration** | forRootAsync (Advanced) | Async config with factories and validators | `src/lib/examples/integration/config-for-root-async.example.ts` | Implemented |
| **Validation/Error Handling** | Type Guards (Documents/Metadata) | Validation of documents, metadata, and query options | `src/lib/examples/advanced/error-handling-and-guards.example.ts` | Implemented |
| **Validation/Error Handling** | Option Validators | ChromaDB options validation and error contexts | `src/lib/examples/advanced/error-handling-and-guards.example.ts` | Implemented |
| **Validation/Error Handling** | Deterministic Failures | Guards for invalid inputs with typed errors | `src/lib/examples/advanced/error-handling-and-guards.example.ts` | Implemented |

## Validation Checklist

- [ ] All features mapped (28/28)
- [ ] Example files scaffolded and compile (public imports only)
- [ ] Categories balanced: Basic (2 files), Advanced (2), Performance (4), Multi-Tenant (3), Integration (4), Validation (1)
- [ ] No private imports (enforced via barrels: index.ts, decorators/index.ts, etc.)
- [ ] Deterministic: Use mock data, no external I/O
- [ ] Post-Implementation: Run `npx nx build nestjs-chromadb` → 0 TS errors

## Notes

- Examples kept thin: Focus on one scenario per file, with comments linking to full docs.
- Composition emphasis: Show decorator stacking on @ChromaRepository methods.
- Multi-tenant: Include audit logging simulation.
- Integration: Demonstrate full module bootstrap in snippets.
- Update this matrix as examples are implemented; mark "Implemented" in Status column.
