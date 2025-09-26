# Implementation Plan — TASK_2025_010

Owner: Software Architect  
Source of Truth: [chromadb-status.md](task-tracking/TASK_2025_010/chromadb-status.md)

Objective

- Deliver complete examples coverage and docs parity for @hive-academy/nestjs-chromadb (Phase 6 in plan).
- Zero TypeScript errors; examples compile using only public exports.
- Update docs to reference concrete example files.

Current State (evidence)

- Core/caching/performance/repository/multi-tenant/config/types done; examples missing.
- Evidence index in [chromadb-status.md](task-tracking/TASK_2025_010/chromadb-status.md).

Architecture Strategy

- Public API only: imports resolve via [src/index.ts](libs/nestjs-chromadb/src/index.ts) and [decorators/index.ts](libs/nestjs-chromadb/src/lib/decorators/index.ts).
- No private deep imports from internal modules.
- Keep examples < 200 LOC each; one scenario per file.
- Use deterministic data; no network calls in examples.
- Examples organize under [src/lib/examples](libs/nestjs-chromadb/src/lib/examples).

Directory and Files to Create

- [src/lib/examples/basic/basic-repository.example.ts](libs/nestjs-chromadb/src/lib/examples/basic/basic-repository.example.ts)
- [src/lib/examples/basic/simple-crud.example.ts](libs/nestjs-chromadb/src/lib/examples/basic/simple-crud.example.ts)
- [src/lib/examples/advanced/complex-queries.example.ts](libs/nestjs-chromadb/src/lib/examples/advanced/complex-queries.example.ts)
- [src/lib/examples/advanced/search-with-scores.example.ts](libs/nestjs-chromadb/src/lib/examples/advanced/search-with-scores.example.ts)
- [src/lib/examples/performance/cached.example.ts](libs/nestjs-chromadb/src/lib/examples/performance/cached.example.ts)
- [src/lib/examples/performance/profiled.example.ts](libs/nestjs-chromadb/src/lib/examples/performance/profiled.example.ts)
- [src/lib/examples/performance/retry.example.ts](libs/nestjs-chromadb/src/lib/examples/performance/retry.example.ts)
- [src/lib/examples/performance/combined-performance.example.ts](libs/nestjs-chromadb/src/lib/examples/performance/combined-performance.example.ts)
- [src/lib/examples/multi-tenant/tenant-aware-prefix.example.ts](libs/nestjs-chromadb/src/lib/examples/multi-tenant/tenant-aware-prefix.example.ts)
- [src/lib/examples/multi-tenant/tenant-aware-separate.example.ts](libs/nestjs-chromadb/src/lib/examples/multi-tenant/tenant-aware-separate.example.ts)
- [src/lib/examples/multi-tenant/cross-tenant-admin.example.ts](libs/nestjs-chromadb/src/lib/examples/multi-tenant/cross-tenant-admin.example.ts)
- [src/lib/examples/integration/health-and-monitoring.example.ts](libs/nestjs-chromadb/src/lib/examples/integration/health-and-monitoring.example.ts)
- [src/lib/examples/integration/config-for-root.example.ts](libs/nestjs-chromadb/src/lib/examples/integration/config-for-root.example.ts)
- [src/lib/examples/integration/config-for-root-async.example.ts](libs/nestjs-chromadb/src/lib/examples/integration/config-for-root-async.example.ts)
- [src/lib/examples/advanced/error-handling-and-guards.example.ts](libs/nestjs-chromadb/src/lib/examples/advanced/error-handling-and-guards.example.ts)

Coverage Matrix (to author)

- Create [example-coverage-matrix.md](task-tracking/TASK_2025_010/example-coverage-matrix.md) mapping:
    - Repository: CRUD, batch/bulk, findAll filters, searchWithScores, exists/count/peek.
    - Vector Query (core): query building, filters, distances, result transforms.
    - Performance: @Cached, @Profiled, @Retry separately and combined.
    - Multi-tenant: TenantAware (prefix, separate), CrossTenant with permission checks.
    - Integration: Health, metrics, cache stats, config forRoot/forRootAsync.
    - Validation/Guards: type guards, option validators, deterministic failures.

Public API Alignment (pre-check)

- Ensure exports present in:
    - [src/index.ts](libs/nestjs-chromadb/src/index.ts)
    - [decorators/index.ts](libs/nestjs-chromadb/src/lib/decorators/index.ts)
- Verify repository exports: [decorators/repository/index.ts](libs/nestjs-chromadb/src/lib/decorators/repository/index.ts)
- Verify performance exports: [decorators/performance/index.ts](libs/nestjs-chromadb/src/lib/decorators/performance/index.ts)
- Verify profiling exports: [decorators/performance/profiling/index.ts](libs/nestjs-chromadb/src/lib/decorators/performance/profiling/index.ts)
- Verify retry exports: [decorators/performance/retry/index.ts](libs/nestjs-chromadb/src/lib/decorators/performance/retry/index.ts)
- Verify multi-tenant exports: [decorators/multi-tenant/index.ts](libs/nestjs-chromadb/src/lib/decorators/multi-tenant/index.ts)

Implementation Steps (sequential)

1) Author [example-coverage-matrix.md](task-tracking/TASK_2025_010/example-coverage-matrix.md) listing each example file and linked features.
2) Scaffold empty example files listed above with imports from public APIs only.
3) Implement basic repository examples:
   - Use @ChromaRepository from [repository-decorator.ts](libs/nestjs-chromadb/src/lib/decorators/repository/repository-decorator.ts) via public barrel.
   - Use [ChromaDBService](libs/nestjs-chromadb/src/lib/services/chromadb.service.ts) (facade).
4) Implement vector query examples:
   - Use builder/types from [vector-query-*.ts](libs/nestjs-chromadb/src/lib/decorators/core/vector-query.decorator.ts) via public barrel.
5) Implement performance examples:
   - @Cached from [cached.decorator.ts](libs/nestjs-chromadb/src/lib/decorators/performance/cached.decorator.ts).
   - Profiling via [profiling](libs/nestjs-chromadb/src/lib/decorators/performance/profiling/index.ts).
   - Retry via [retry](libs/nestjs-chromadb/src/lib/decorators/performance/retry/index.ts).
6) Implement multi-tenant examples:
   - TenantAware/CrossTenant from [tenant-aware.decorator.ts](libs/nestjs-chromadb/src/lib/decorators/multi-tenant/tenant-aware.decorator.ts) via public barrel.
   - Use helpers under [decorators/multi-tenant](libs/nestjs-chromadb/src/lib/decorators/multi-tenant/index.ts).
7) Implement integration examples:
   - Health/metrics using [chromadb-facade.service.ts](libs/nestjs-chromadb/src/lib/services/chromadb-facade.service.ts).
   - Cache stats using [chroma-cache.service.ts](libs/nestjs-chromadb/src/lib/services/caching/chroma-cache.service.ts).
   - Module config forRoot/forRootAsync using [nestjs-chromadb.module.ts](libs/nestjs-chromadb/src/lib/nestjs-chromadb.module.ts).
8) Implement validation/error-handling example:
   - Guards from [validation/type-guards.ts](libs/nestjs-chromadb/src/lib/validation/type-guards.ts).
9) Build and fix imports:
   - Run TypeScript build locally; ensure zero errors.
   - If any public export missing, add to barrels listed above.
10) Docs parity:

- Update [README.md](libs/nestjs-chromadb/README.md) and [CLAUDE.md](libs/nestjs-chromadb/CLAUDE.md) to reference the exact example files.

11) Smoke tests (optional but recommended for CI):

- Add minimal tests importing example functions and asserting types run.

Acceptance Criteria

- All example files exist and compile.
- Imports resolve via public barrels; no deep private imports.
- Zero TypeScript errors.
- Docs reference real example files; snippets match.
- Coverage matrix shows 100% of targeted features.

Risks & Mitigations

- Risk: Missing public exports breaks examples.
    - Mitigation: Pre-check barrels; add exports before implementation.
- Risk: Large TenantAware file complexity.
    - Mitigation: Keep example narrow; avoid internal decorator details.
- Risk: Validation differences across environments.
    - Mitigation: Use deterministic dummy data; no external I/O.

Deliverables

- [example-coverage-matrix.md](task-tracking/TASK_2025_010/example-coverage-matrix.md)
- Example files under [src/lib/examples/*](libs/nestjs-chromadb/src/lib/examples)
- Updated [README.md](libs/nestjs-chromadb/README.md) and [CLAUDE.md](libs/nestjs-chromadb/CLAUDE.md)

Handoffs

- Next Agent: Backend Developer (implement examples per plan).
- Validation: Business Analyst to verify acceptance criteria; Senior Tester for smoke tests.
