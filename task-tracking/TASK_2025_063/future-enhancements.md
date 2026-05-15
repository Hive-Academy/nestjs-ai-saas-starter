# Future Enhancements — TASK_2025_063

This file is **append-only**. Each successful run of the e2e-diagnostics
suite appends a new `## Findings — Run <ISO-timestamp>` section below.
Prior findings are never overwritten so the document preserves the full
history of library gaps discovered across runs.

Each finding lists:

- **Library** — the `@hive-academy/*` package the gap belongs to
- **Expected** — the symbol / method / behavior the probe asked for
- **Observed in** — where the probe looked (file path or DI scope)
- **Recommended task** — a one-line suggestion the team can lift verbatim
  into the next task-tracking entry

---

## Findings — Run 2026-05-15T12:51:04.616Z

_Run ID: `b972b92e-4627-4029-9e24-c476ecf40274` · Report folder: `2026-05-15T12-51-04-5b177473`_

### FAIL — dev-brand-api: dev-brand-api/boot-smoke/boot

- **Library**: dev-brand-api
- **Expected**: probe `dev-brand-api/boot-smoke/boot` to PASS
- **Observed**: Unexpected token 'export'
- **Recommended task**: investigate failure in `dev-brand-api` reported by probe `dev-brand-api/boot-smoke/boot`

<details><summary>stack (first 4 lines)</summary>

```
[1m[31mJest encountered an unexpected token[39m[22m

Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

```

</details>

### FAIL — nestjs-chromadb: nestjs-chromadb/round-trip

- **Library**: nestjs-chromadb
- **Expected**: probe `nestjs-chromadb/round-trip` to PASS
- **Observed**: Unexpected token 'export'
- **Recommended task**: investigate failure in `nestjs-chromadb` reported by probe `nestjs-chromadb/round-trip`

<details><summary>stack (first 4 lines)</summary>

```
[1m[31mJest encountered an unexpected token[39m[22m

Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

```

</details>

### FAIL — langgraph-workflow-engine: langgraph-workflow-engine/stategraph-stream

- **Library**: langgraph-workflow-engine
- **Expected**: probe `langgraph-workflow-engine/stategraph-stream` to PASS
- **Observed**: Unexpected token 'export'
- **Recommended task**: investigate failure in `langgraph-workflow-engine` reported by probe `langgraph-workflow-engine/stategraph-stream`

<details><summary>stack (first 4 lines)</summary>

```
[1m[31mJest encountered an unexpected token[39m[22m

Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

```

</details>

### FAIL — langgraph-core: langgraph-core/agent-state-annotation

- **Library**: langgraph-core
- **Expected**: probe `langgraph-core/agent-state-annotation` to PASS
- **Observed**: Unexpected token 'export'
- **Recommended task**: investigate failure in `langgraph-core` reported by probe `langgraph-core/agent-state-annotation`

<details><summary>stack (first 4 lines)</summary>

```
[1m[31mJest encountered an unexpected token[39m[22m

Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

```

</details>

### FAIL — langgraph-monitoring: langgraph-monitoring/counter-roundtrip

- **Library**: langgraph-monitoring
- **Expected**: probe `langgraph-monitoring/counter-roundtrip` to PASS
- **Observed**: Unexpected token 'export'
- **Recommended task**: investigate failure in `langgraph-monitoring` reported by probe `langgraph-monitoring/counter-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
[1m[31mJest encountered an unexpected token[39m[22m

Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

```

</details>

### FAIL — langgraph-memory: langgraph-memory/store-retrieve-roundtrip

- **Library**: langgraph-memory
- **Expected**: probe `langgraph-memory/store-retrieve-roundtrip` to PASS
- **Observed**: Unexpected token 'export'
- **Recommended task**: investigate failure in `langgraph-memory` reported by probe `langgraph-memory/store-retrieve-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
[1m[31mJest encountered an unexpected token[39m[22m

Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

```

</details>

### FAIL — langgraph-hitl: langgraph-hitl/interrupt-resume-roundtrip

- **Library**: langgraph-hitl
- **Expected**: probe `langgraph-hitl/interrupt-resume-roundtrip` to PASS
- **Observed**: Unexpected token 'export'
- **Recommended task**: investigate failure in `langgraph-hitl` reported by probe `langgraph-hitl/interrupt-resume-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
[1m[31mJest encountered an unexpected token[39m[22m

Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

```

</details>

### FAIL — langgraph-adapters: langgraph-adapters/sqlite-checkpointer-roundtrip

- **Library**: langgraph-adapters
- **Expected**: probe `langgraph-adapters/sqlite-checkpointer-roundtrip` to PASS
- **Observed**: Unexpected token 'export'
- **Recommended task**: investigate failure in `langgraph-adapters` reported by probe `langgraph-adapters/sqlite-checkpointer-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
[1m[31mJest encountered an unexpected token[39m[22m

Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

```

</details>

### MISSING — langgraph-platform: langgraph-platform/surface-check

- **Library**: langgraph-platform
- **Expected**: public platform integration surface
- **Observed in**: package exports [DEFAULT_PLATFORM_OPTIONS, MultitaskStrategy, PLATFORM_MODULE_OPTIONS, PlatformClientService, PlatformModule, RunStatus, ThreadStatus, WebhookEvent, WebhookService, WebhookStatus] but PlatformModule is not registered in dev-brand-api AppModule (no in-process surface reachable without a remote LangGraph Platform endpoint)
- **Recommended task**: add support for `public platform integration surface` in `langgraph-platform` (surfaced by probe `langgraph-platform/surface-check`)

---

## Findings — Run 2026-05-15T12:53:17.940Z

_Run ID: `47e40492-ac55-4f5d-a67d-fb7c393c5e65` · Report folder: `2026-05-15T12-53-16-fb4d60c4`_

### FAIL — dev-brand-api: dev-brand-api/boot-smoke/boot

- **Library**: dev-brand-api
- **Expected**: probe `dev-brand-api/boot-smoke/boot` to PASS
- **Observed**: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
- **Recommended task**: investigate failure in `dev-brand-api` reported by probe `dev-brand-api/boot-smoke/boot`

<details><summary>stack (first 4 lines)</summary>

```
Error: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
    at new BaseTavilyAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:18:22)
    at new TavilySearchAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:41:30)
    at new TavilySearch (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/tavily-search.cjs:143:22)
```

</details>

### FAIL — nestjs-chromadb: nestjs-chromadb/round-trip

- **Library**: nestjs-chromadb
- **Expected**: probe `nestjs-chromadb/round-trip` to PASS
- **Observed**: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
- **Recommended task**: investigate failure in `nestjs-chromadb` reported by probe `nestjs-chromadb/round-trip`

<details><summary>stack (first 4 lines)</summary>

```
Error: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
    at new BaseTavilyAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:18:22)
    at new TavilySearchAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:41:30)
    at new TavilySearch (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/tavily-search.cjs:143:22)
```

</details>

### FAIL — langgraph-workflow-engine: langgraph-workflow-engine/stategraph-stream

- **Library**: langgraph-workflow-engine
- **Expected**: probe `langgraph-workflow-engine/stategraph-stream` to PASS
- **Observed**: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
- **Recommended task**: investigate failure in `langgraph-workflow-engine` reported by probe `langgraph-workflow-engine/stategraph-stream`

<details><summary>stack (first 4 lines)</summary>

```
Error: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
    at new BaseTavilyAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:18:22)
    at new TavilySearchAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:41:30)
    at new TavilySearch (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/tavily-search.cjs:143:22)
```

</details>

### FAIL — langgraph-core: langgraph-core/agent-state-annotation

- **Library**: langgraph-core
- **Expected**: probe `langgraph-core/agent-state-annotation` to PASS
- **Observed**: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
- **Recommended task**: investigate failure in `langgraph-core` reported by probe `langgraph-core/agent-state-annotation`

<details><summary>stack (first 4 lines)</summary>

```
Error: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
    at new BaseTavilyAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:18:22)
    at new TavilySearchAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:41:30)
    at new TavilySearch (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/tavily-search.cjs:143:22)
```

</details>

### FAIL — langgraph-monitoring: langgraph-monitoring/counter-roundtrip

- **Library**: langgraph-monitoring
- **Expected**: probe `langgraph-monitoring/counter-roundtrip` to PASS
- **Observed**: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
- **Recommended task**: investigate failure in `langgraph-monitoring` reported by probe `langgraph-monitoring/counter-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
Error: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
    at new BaseTavilyAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:18:22)
    at new TavilySearchAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:41:30)
    at new TavilySearch (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/tavily-search.cjs:143:22)
```

</details>

### FAIL — langgraph-memory: langgraph-memory/store-retrieve-roundtrip

- **Library**: langgraph-memory
- **Expected**: probe `langgraph-memory/store-retrieve-roundtrip` to PASS
- **Observed**: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
- **Recommended task**: investigate failure in `langgraph-memory` reported by probe `langgraph-memory/store-retrieve-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
Error: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
    at new BaseTavilyAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:18:22)
    at new TavilySearchAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:41:30)
    at new TavilySearch (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/tavily-search.cjs:143:22)
```

</details>

### FAIL — langgraph-hitl: langgraph-hitl/interrupt-resume-roundtrip

- **Library**: langgraph-hitl
- **Expected**: probe `langgraph-hitl/interrupt-resume-roundtrip` to PASS
- **Observed**: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
- **Recommended task**: investigate failure in `langgraph-hitl` reported by probe `langgraph-hitl/interrupt-resume-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
Error: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
    at new BaseTavilyAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:18:22)
    at new TavilySearchAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:41:30)
    at new TavilySearch (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/tavily-search.cjs:143:22)
```

</details>

### MISSING — langgraph-adapters: langgraph-adapters/sqlite-checkpointer-roundtrip

- **Library**: langgraph-adapters
- **Expected**: one of [SqliteCheckpointAdapter, SqliteCheckpointSaver, SqliteCheckpointer] — SQLite-backed BaseCheckpointSaver adapter (NestJS-injectable)
- **Observed in**: @hive-academy/langgraph-adapters lib (verified absence; only Neo4j HITL + thread-registry adapters currently exported; sampled exports: ApprovalChain, ApprovalChainRepository, ApprovalLevel, ApprovalRequest, ApprovalRequestRepository, ApprovalResponse, ConfidencePattern, ConfidencePatternRepository, …)
- **Recommended task**: add support for `one of [SqliteCheckpointAdapter, SqliteCheckpointSaver, SqliteCheckpointer] — SQLite-backed BaseCheckpointSaver adapter (NestJS-injectable)` in `langgraph-adapters` (surfaced by probe `langgraph-adapters/sqlite-checkpointer-roundtrip`)

### MISSING — langgraph-platform: langgraph-platform/surface-check

- **Library**: langgraph-platform
- **Expected**: public platform integration surface
- **Observed in**: package exports [DEFAULT_PLATFORM_OPTIONS, MultitaskStrategy, PLATFORM_MODULE_OPTIONS, PlatformClientService, PlatformModule, RunStatus, ThreadStatus, WebhookEvent, WebhookService, WebhookStatus] but PlatformModule is not registered in dev-brand-api AppModule (no in-process surface reachable without a remote LangGraph Platform endpoint)
- **Recommended task**: add support for `public platform integration surface` in `langgraph-platform` (surfaced by probe `langgraph-platform/surface-check`)

---

## Findings — Run 2026-05-15T12:55:44.839Z

_Run ID: `bbadee8e-c0e8-456a-9dc9-3db45857171f` · Report folder: `2026-05-15T12-55-43-305e01e8`_

### FAIL — dev-brand-api: dev-brand-api/boot-smoke/boot

- **Library**: dev-brand-api
- **Expected**: probe `dev-brand-api/boot-smoke/boot` to PASS
- **Observed**: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
- **Recommended task**: investigate failure in `dev-brand-api` reported by probe `dev-brand-api/boot-smoke/boot`

<details><summary>stack (first 4 lines)</summary>

```
Error: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
    at new BaseTavilyAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:18:22)
    at new TavilySearchAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:41:30)
    at new TavilySearch (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/tavily-search.cjs:143:22)
```

</details>

### FAIL — nestjs-chromadb: nestjs-chromadb/round-trip

- **Library**: nestjs-chromadb
- **Expected**: probe `nestjs-chromadb/round-trip` to PASS
- **Observed**: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
- **Recommended task**: investigate failure in `nestjs-chromadb` reported by probe `nestjs-chromadb/round-trip`

<details><summary>stack (first 4 lines)</summary>

```
Error: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
    at new BaseTavilyAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:18:22)
    at new TavilySearchAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:41:30)
    at new TavilySearch (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/tavily-search.cjs:143:22)
```

</details>

### FAIL — langgraph-workflow-engine: langgraph-workflow-engine/stategraph-stream

- **Library**: langgraph-workflow-engine
- **Expected**: probe `langgraph-workflow-engine/stategraph-stream` to PASS
- **Observed**: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
- **Recommended task**: investigate failure in `langgraph-workflow-engine` reported by probe `langgraph-workflow-engine/stategraph-stream`

<details><summary>stack (first 4 lines)</summary>

```
Error: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
    at new BaseTavilyAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:18:22)
    at new TavilySearchAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:41:30)
    at new TavilySearch (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/tavily-search.cjs:143:22)
```

</details>

### FAIL — langgraph-core: langgraph-core/agent-state-annotation

- **Library**: langgraph-core
- **Expected**: probe `langgraph-core/agent-state-annotation` to PASS
- **Observed**: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
- **Recommended task**: investigate failure in `langgraph-core` reported by probe `langgraph-core/agent-state-annotation`

<details><summary>stack (first 4 lines)</summary>

```
Error: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
    at new BaseTavilyAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:18:22)
    at new TavilySearchAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:41:30)
    at new TavilySearch (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/tavily-search.cjs:143:22)
```

</details>

### FAIL — langgraph-monitoring: langgraph-monitoring/counter-roundtrip

- **Library**: langgraph-monitoring
- **Expected**: probe `langgraph-monitoring/counter-roundtrip` to PASS
- **Observed**: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
- **Recommended task**: investigate failure in `langgraph-monitoring` reported by probe `langgraph-monitoring/counter-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
Error: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
    at new BaseTavilyAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:18:22)
    at new TavilySearchAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:41:30)
    at new TavilySearch (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/tavily-search.cjs:143:22)
```

</details>

### FAIL — langgraph-memory: langgraph-memory/store-retrieve-roundtrip

- **Library**: langgraph-memory
- **Expected**: probe `langgraph-memory/store-retrieve-roundtrip` to PASS
- **Observed**: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
- **Recommended task**: investigate failure in `langgraph-memory` reported by probe `langgraph-memory/store-retrieve-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
Error: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
    at new BaseTavilyAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:18:22)
    at new TavilySearchAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:41:30)
    at new TavilySearch (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/tavily-search.cjs:143:22)
```

</details>

### FAIL — langgraph-hitl: langgraph-hitl/interrupt-resume-roundtrip

- **Library**: langgraph-hitl
- **Expected**: probe `langgraph-hitl/interrupt-resume-roundtrip` to PASS
- **Observed**: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
- **Recommended task**: investigate failure in `langgraph-hitl` reported by probe `langgraph-hitl/interrupt-resume-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
Error: Tavily API key not found. Please provide it as an argument or set the TAVILY_API_KEY environment variable.
    at new BaseTavilyAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:18:22)
    at new TavilySearchAPIWrapper (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/utils.cjs:41:30)
    at new TavilySearch (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@langchain/tavily/dist/tavily-search.cjs:143:22)
```

</details>

### MISSING — langgraph-adapters: langgraph-adapters/sqlite-checkpointer-roundtrip

- **Library**: langgraph-adapters
- **Expected**: one of [SqliteCheckpointAdapter, SqliteCheckpointSaver, SqliteCheckpointer] — SQLite-backed BaseCheckpointSaver adapter (NestJS-injectable)
- **Observed in**: @hive-academy/langgraph-adapters lib (verified absence; only Neo4j HITL + thread-registry adapters currently exported; sampled exports: ApprovalChain, ApprovalChainRepository, ApprovalLevel, ApprovalRequest, ApprovalRequestRepository, ApprovalResponse, ConfidencePattern, ConfidencePatternRepository, …)
- **Recommended task**: add support for `one of [SqliteCheckpointAdapter, SqliteCheckpointSaver, SqliteCheckpointer] — SQLite-backed BaseCheckpointSaver adapter (NestJS-injectable)` in `langgraph-adapters` (surfaced by probe `langgraph-adapters/sqlite-checkpointer-roundtrip`)

### MISSING — langgraph-platform: langgraph-platform/surface-check

- **Library**: langgraph-platform
- **Expected**: public platform integration surface
- **Observed in**: package exports [DEFAULT_PLATFORM_OPTIONS, MultitaskStrategy, PLATFORM_MODULE_OPTIONS, PlatformClientService, PlatformModule, RunStatus, ThreadStatus, WebhookEvent, WebhookService, WebhookStatus] but PlatformModule is not registered in dev-brand-api AppModule (no in-process surface reachable without a remote LangGraph Platform endpoint)
- **Recommended task**: add support for `public platform integration surface` in `langgraph-platform` (surfaced by probe `langgraph-platform/surface-check`)

---

## Findings — Run 2026-05-15T16:38:23.064Z

_Run ID: `a508ded7-b6f8-4047-99ad-3d133fb45063` · Report folder: `2026-05-15T16-38-20-ce033ec8`_

### FAIL — dev-brand-api: dev-brand-api/boot-smoke/boot

- **Library**: dev-brand-api
- **Expected**: probe `dev-brand-api/boot-smoke/boot` to PASS
- **Observed**: JWT_SECRET is not configured. Please set it in your .env file.
- **Recommended task**: investigate failure in `dev-brand-api` reported by probe `dev-brand-api/boot-smoke/boot`

<details><summary>stack (first 4 lines)</summary>

```
Error: JWT_SECRET is not configured. Please set it in your .env file.
    at InstanceWrapper.useFactory [as metatype] (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/apps/dev-brand-api/src/app/auth/auth.module.ts:49:17)
    at Injector.instantiateClass (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@nestjs/core/injector/injector.js:427:55)
    at callback (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@nestjs/core/injector/injector.js:70:45)
```

</details>

### FAIL — nestjs-chromadb: nestjs-chromadb/round-trip

- **Library**: nestjs-chromadb
- **Expected**: probe `nestjs-chromadb/round-trip` to PASS
- **Observed**: JWT_SECRET is not configured. Please set it in your .env file.
- **Recommended task**: investigate failure in `nestjs-chromadb` reported by probe `nestjs-chromadb/round-trip`

<details><summary>stack (first 4 lines)</summary>

```
Error: JWT_SECRET is not configured. Please set it in your .env file.
    at InstanceWrapper.useFactory [as metatype] (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/apps/dev-brand-api/src/app/auth/auth.module.ts:49:17)
    at Injector.instantiateClass (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@nestjs/core/injector/injector.js:427:55)
    at callback (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@nestjs/core/injector/injector.js:70:45)
```

</details>

### FAIL — nestjs-neo4j: nestjs-neo4j/round-trip

- **Library**: nestjs-neo4j
- **Expected**: probe `nestjs-neo4j/round-trip` to PASS
- **Observed**: JWT_SECRET is not configured. Please set it in your .env file.
- **Recommended task**: investigate failure in `nestjs-neo4j` reported by probe `nestjs-neo4j/round-trip`

<details><summary>stack (first 4 lines)</summary>

```
Error: JWT_SECRET is not configured. Please set it in your .env file.
    at InstanceWrapper.useFactory [as metatype] (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/apps/dev-brand-api/src/app/auth/auth.module.ts:49:17)
    at Injector.instantiateClass (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@nestjs/core/injector/injector.js:427:55)
    at callback (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@nestjs/core/injector/injector.js:70:45)
```

</details>

### FAIL — langgraph-workflow-engine: langgraph-workflow-engine/stategraph-stream

- **Library**: langgraph-workflow-engine
- **Expected**: probe `langgraph-workflow-engine/stategraph-stream` to PASS
- **Observed**: JWT_SECRET is not configured. Please set it in your .env file.
- **Recommended task**: investigate failure in `langgraph-workflow-engine` reported by probe `langgraph-workflow-engine/stategraph-stream`

<details><summary>stack (first 4 lines)</summary>

```
Error: JWT_SECRET is not configured. Please set it in your .env file.
    at InstanceWrapper.useFactory [as metatype] (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/apps/dev-brand-api/src/app/auth/auth.module.ts:49:17)
    at Injector.instantiateClass (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@nestjs/core/injector/injector.js:427:55)
    at callback (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@nestjs/core/injector/injector.js:70:45)
```

</details>

### FAIL — langgraph-core: langgraph-core/agent-state-annotation

- **Library**: langgraph-core
- **Expected**: probe `langgraph-core/agent-state-annotation` to PASS
- **Observed**: JWT_SECRET is not configured. Please set it in your .env file.
- **Recommended task**: investigate failure in `langgraph-core` reported by probe `langgraph-core/agent-state-annotation`

<details><summary>stack (first 4 lines)</summary>

```
Error: JWT_SECRET is not configured. Please set it in your .env file.
    at InstanceWrapper.useFactory [as metatype] (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/apps/dev-brand-api/src/app/auth/auth.module.ts:49:17)
    at Injector.instantiateClass (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@nestjs/core/injector/injector.js:427:55)
    at callback (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@nestjs/core/injector/injector.js:70:45)
```

</details>

### FAIL — langgraph-monitoring: langgraph-monitoring/counter-roundtrip

- **Library**: langgraph-monitoring
- **Expected**: probe `langgraph-monitoring/counter-roundtrip` to PASS
- **Observed**: JWT_SECRET is not configured. Please set it in your .env file.
- **Recommended task**: investigate failure in `langgraph-monitoring` reported by probe `langgraph-monitoring/counter-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
Error: JWT_SECRET is not configured. Please set it in your .env file.
    at InstanceWrapper.useFactory [as metatype] (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/apps/dev-brand-api/src/app/auth/auth.module.ts:49:17)
    at Injector.instantiateClass (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@nestjs/core/injector/injector.js:427:55)
    at callback (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@nestjs/core/injector/injector.js:70:45)
```

</details>

### FAIL — langgraph-memory: langgraph-memory/store-retrieve-roundtrip

- **Library**: langgraph-memory
- **Expected**: probe `langgraph-memory/store-retrieve-roundtrip` to PASS
- **Observed**: JWT_SECRET is not configured. Please set it in your .env file.
- **Recommended task**: investigate failure in `langgraph-memory` reported by probe `langgraph-memory/store-retrieve-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
Error: JWT_SECRET is not configured. Please set it in your .env file.
    at InstanceWrapper.useFactory [as metatype] (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/apps/dev-brand-api/src/app/auth/auth.module.ts:49:17)
    at Injector.instantiateClass (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@nestjs/core/injector/injector.js:427:55)
    at callback (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@nestjs/core/injector/injector.js:70:45)
```

</details>

### FAIL — langgraph-hitl: langgraph-hitl/interrupt-resume-roundtrip

- **Library**: langgraph-hitl
- **Expected**: probe `langgraph-hitl/interrupt-resume-roundtrip` to PASS
- **Observed**: JWT_SECRET is not configured. Please set it in your .env file.
- **Recommended task**: investigate failure in `langgraph-hitl` reported by probe `langgraph-hitl/interrupt-resume-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
Error: JWT_SECRET is not configured. Please set it in your .env file.
    at InstanceWrapper.useFactory [as metatype] (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/apps/dev-brand-api/src/app/auth/auth.module.ts:49:17)
    at Injector.instantiateClass (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@nestjs/core/injector/injector.js:427:55)
    at callback (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/@nestjs/core/injector/injector.js:70:45)
```

</details>

### MISSING — langgraph-adapters: langgraph-adapters/sqlite-checkpointer-roundtrip

- **Library**: langgraph-adapters
- **Expected**: one of [SqliteCheckpointAdapter, SqliteCheckpointSaver, SqliteCheckpointer] — SQLite-backed BaseCheckpointSaver adapter (NestJS-injectable)
- **Observed in**: @hive-academy/langgraph-adapters lib (verified absence; only Neo4j HITL + thread-registry adapters currently exported; sampled exports: ApprovalChain, ApprovalChainRepository, ApprovalLevel, ApprovalRequest, ApprovalRequestRepository, ApprovalResponse, ConfidencePattern, ConfidencePatternRepository, …)
- **Recommended task**: add support for `one of [SqliteCheckpointAdapter, SqliteCheckpointSaver, SqliteCheckpointer] — SQLite-backed BaseCheckpointSaver adapter (NestJS-injectable)` in `langgraph-adapters` (surfaced by probe `langgraph-adapters/sqlite-checkpointer-roundtrip`)

### MISSING — langgraph-platform: langgraph-platform/surface-check

- **Library**: langgraph-platform
- **Expected**: public platform integration surface
- **Observed in**: package exports [DEFAULT_PLATFORM_OPTIONS, MultitaskStrategy, PLATFORM_MODULE_OPTIONS, PlatformClientService, PlatformModule, RunStatus, ThreadStatus, WebhookEvent, WebhookService, WebhookStatus] but PlatformModule is not registered in dev-brand-api AppModule (no in-process surface reachable without a remote LangGraph Platform endpoint)
- **Recommended task**: add support for `public platform integration surface` in `langgraph-platform` (surfaced by probe `langgraph-platform/surface-check`)

---

## Findings — Run 2026-05-15T16:39:02.870Z

_Run ID: `16c9ae4a-b1c8-485a-ad95-e34a231b6beb` · Report folder: `2026-05-15T16-39-01-d7f0b337`_

### FAIL — dev-brand-api: dev-brand-api/boot-smoke/boot

- **Library**: dev-brand-api
- **Expected**: probe `dev-brand-api/boot-smoke/boot` to PASS
- **Observed**: {"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
- **Recommended task**: investigate failure in `dev-brand-api` reported by probe `dev-brand-api/boot-smoke/boot`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
```

</details>

### FAIL — nestjs-chromadb: nestjs-chromadb/round-trip

- **Library**: nestjs-chromadb
- **Expected**: probe `nestjs-chromadb/round-trip` to PASS
- **Observed**: {"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
- **Recommended task**: investigate failure in `nestjs-chromadb` reported by probe `nestjs-chromadb/round-trip`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
```

</details>

### FAIL — nestjs-neo4j: nestjs-neo4j/round-trip

- **Library**: nestjs-neo4j
- **Expected**: probe `nestjs-neo4j/round-trip` to PASS
- **Observed**: {"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
- **Recommended task**: investigate failure in `nestjs-neo4j` reported by probe `nestjs-neo4j/round-trip`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
```

</details>

### FAIL — langgraph-workflow-engine: langgraph-workflow-engine/stategraph-stream

- **Library**: langgraph-workflow-engine
- **Expected**: probe `langgraph-workflow-engine/stategraph-stream` to PASS
- **Observed**: {"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
- **Recommended task**: investigate failure in `langgraph-workflow-engine` reported by probe `langgraph-workflow-engine/stategraph-stream`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
```

</details>

### FAIL — langgraph-core: langgraph-core/agent-state-annotation

- **Library**: langgraph-core
- **Expected**: probe `langgraph-core/agent-state-annotation` to PASS
- **Observed**: {"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
- **Recommended task**: investigate failure in `langgraph-core` reported by probe `langgraph-core/agent-state-annotation`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
```

</details>

### FAIL — langgraph-monitoring: langgraph-monitoring/counter-roundtrip

- **Library**: langgraph-monitoring
- **Expected**: probe `langgraph-monitoring/counter-roundtrip` to PASS
- **Observed**: {"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
- **Recommended task**: investigate failure in `langgraph-monitoring` reported by probe `langgraph-monitoring/counter-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
```

</details>

### FAIL — langgraph-memory: langgraph-memory/store-retrieve-roundtrip

- **Library**: langgraph-memory
- **Expected**: probe `langgraph-memory/store-retrieve-roundtrip` to PASS
- **Observed**: {"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
- **Recommended task**: investigate failure in `langgraph-memory` reported by probe `langgraph-memory/store-retrieve-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
```

</details>

### FAIL — langgraph-hitl: langgraph-hitl/interrupt-resume-roundtrip

- **Library**: langgraph-hitl
- **Expected**: probe `langgraph-hitl/interrupt-resume-roundtrip` to PASS
- **Observed**: {"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
- **Recommended task**: investigate failure in `langgraph-hitl` reported by probe `langgraph-hitl/interrupt-resume-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
```

</details>

### MISSING — langgraph-adapters: langgraph-adapters/sqlite-checkpointer-roundtrip

- **Library**: langgraph-adapters
- **Expected**: one of [SqliteCheckpointAdapter, SqliteCheckpointSaver, SqliteCheckpointer] — SQLite-backed BaseCheckpointSaver adapter (NestJS-injectable)
- **Observed in**: @hive-academy/langgraph-adapters lib (verified absence; only Neo4j HITL + thread-registry adapters currently exported; sampled exports: ApprovalChain, ApprovalChainRepository, ApprovalLevel, ApprovalRequest, ApprovalRequestRepository, ApprovalResponse, ConfidencePattern, ConfidencePatternRepository, …)
- **Recommended task**: add support for `one of [SqliteCheckpointAdapter, SqliteCheckpointSaver, SqliteCheckpointer] — SQLite-backed BaseCheckpointSaver adapter (NestJS-injectable)` in `langgraph-adapters` (surfaced by probe `langgraph-adapters/sqlite-checkpointer-roundtrip`)

### MISSING — langgraph-platform: langgraph-platform/surface-check

- **Library**: langgraph-platform
- **Expected**: public platform integration surface
- **Observed in**: package exports [DEFAULT_PLATFORM_OPTIONS, MultitaskStrategy, PLATFORM_MODULE_OPTIONS, PlatformClientService, PlatformModule, RunStatus, ThreadStatus, WebhookEvent, WebhookService, WebhookStatus] but PlatformModule is not registered in dev-brand-api AppModule (no in-process surface reachable without a remote LangGraph Platform endpoint)
- **Recommended task**: add support for `public platform integration surface` in `langgraph-platform` (surfaced by probe `langgraph-platform/surface-check`)

---

## Findings — Run 2026-05-15T16:39:44.201Z

_Run ID: `e8fa37e4-81a5-4bc4-b313-dc6ade206ab8` · Report folder: `2026-05-15T16-39-43-05205367`_

### FAIL — dev-brand-api: dev-brand-api/boot-smoke/boot

- **Library**: dev-brand-api
- **Expected**: probe `dev-brand-api/boot-smoke/boot` to PASS
- **Observed**: {"code":"ERR_REQUIRE_ESM"}
- **Recommended task**: investigate failure in `dev-brand-api` reported by probe `dev-brand-api/boot-smoke/boot`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_REQUIRE_ESM"}
```

</details>

### FAIL — nestjs-chromadb: nestjs-chromadb/round-trip

- **Library**: nestjs-chromadb
- **Expected**: probe `nestjs-chromadb/round-trip` to PASS
- **Observed**: {"code":"ERR_REQUIRE_ESM"}
- **Recommended task**: investigate failure in `nestjs-chromadb` reported by probe `nestjs-chromadb/round-trip`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_REQUIRE_ESM"}
```

</details>

### FAIL — nestjs-neo4j: nestjs-neo4j/round-trip

- **Library**: nestjs-neo4j
- **Expected**: probe `nestjs-neo4j/round-trip` to PASS
- **Observed**: {"code":"ERR_REQUIRE_ESM"}
- **Recommended task**: investigate failure in `nestjs-neo4j` reported by probe `nestjs-neo4j/round-trip`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_REQUIRE_ESM"}
```

</details>

### FAIL — langgraph-workflow-engine: langgraph-workflow-engine/stategraph-stream

- **Library**: langgraph-workflow-engine
- **Expected**: probe `langgraph-workflow-engine/stategraph-stream` to PASS
- **Observed**: {"code":"ERR_REQUIRE_ESM"}
- **Recommended task**: investigate failure in `langgraph-workflow-engine` reported by probe `langgraph-workflow-engine/stategraph-stream`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_REQUIRE_ESM"}
```

</details>

### FAIL — langgraph-core: langgraph-core/agent-state-annotation

- **Library**: langgraph-core
- **Expected**: probe `langgraph-core/agent-state-annotation` to PASS
- **Observed**: {"code":"ERR_REQUIRE_ESM"}
- **Recommended task**: investigate failure in `langgraph-core` reported by probe `langgraph-core/agent-state-annotation`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_REQUIRE_ESM"}
```

</details>

### FAIL — langgraph-monitoring: langgraph-monitoring/counter-roundtrip

- **Library**: langgraph-monitoring
- **Expected**: probe `langgraph-monitoring/counter-roundtrip` to PASS
- **Observed**: {"code":"ERR_REQUIRE_ESM"}
- **Recommended task**: investigate failure in `langgraph-monitoring` reported by probe `langgraph-monitoring/counter-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_REQUIRE_ESM"}
```

</details>

### FAIL — langgraph-memory: langgraph-memory/store-retrieve-roundtrip

- **Library**: langgraph-memory
- **Expected**: probe `langgraph-memory/store-retrieve-roundtrip` to PASS
- **Observed**: {"code":"ERR_REQUIRE_ESM"}
- **Recommended task**: investigate failure in `langgraph-memory` reported by probe `langgraph-memory/store-retrieve-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_REQUIRE_ESM"}
```

</details>

### FAIL — langgraph-hitl: langgraph-hitl/interrupt-resume-roundtrip

- **Library**: langgraph-hitl
- **Expected**: probe `langgraph-hitl/interrupt-resume-roundtrip` to PASS
- **Observed**: {"code":"ERR_REQUIRE_ESM"}
- **Recommended task**: investigate failure in `langgraph-hitl` reported by probe `langgraph-hitl/interrupt-resume-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_REQUIRE_ESM"}
```

</details>

### FAIL — langgraph-adapters: langgraph-adapters/sqlite-checkpointer-roundtrip

- **Library**: langgraph-adapters
- **Expected**: probe `langgraph-adapters/sqlite-checkpointer-roundtrip` to PASS
- **Observed**: Error: Must use import to load ES Module: /Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/uuid/dist-node/index.js
- **Recommended task**: investigate failure in `langgraph-adapters` reported by probe `langgraph-adapters/sqlite-checkpointer-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
Error: Must use import to load ES Module: /Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/uuid/dist-node/index.js
```

</details>

### MISSING — langgraph-platform: langgraph-platform/surface-check

- **Library**: langgraph-platform
- **Expected**: public platform integration surface
- **Observed in**: package exports [DEFAULT_PLATFORM_OPTIONS, MultitaskStrategy, PLATFORM_MODULE_OPTIONS, PlatformClientService, PlatformModule, RunStatus, ThreadStatus, WebhookEvent, WebhookService, WebhookStatus] but PlatformModule is not registered in dev-brand-api AppModule (no in-process surface reachable without a remote LangGraph Platform endpoint)
- **Recommended task**: add support for `public platform integration surface` in `langgraph-platform` (surfaced by probe `langgraph-platform/surface-check`)

---

## Findings — Run 2026-05-15T17:07:39.753Z

_Run ID: `91d6a625-e2a1-4e60-9c0a-4e515cd35ef2` · Report folder: `2026-05-15T17-07-38-6320e451`_

### FAIL — dev-brand-api: dev-brand-api/boot-smoke/boot

- **Library**: dev-brand-api
- **Expected**: probe `dev-brand-api/boot-smoke/boot` to PASS
- **Observed**: {"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
- **Recommended task**: investigate failure in `dev-brand-api` reported by probe `dev-brand-api/boot-smoke/boot`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
```

</details>

### FAIL — nestjs-chromadb: nestjs-chromadb/round-trip

- **Library**: nestjs-chromadb
- **Expected**: probe `nestjs-chromadb/round-trip` to PASS
- **Observed**: {"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
- **Recommended task**: investigate failure in `nestjs-chromadb` reported by probe `nestjs-chromadb/round-trip`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
```

</details>

### FAIL — nestjs-neo4j: nestjs-neo4j/round-trip

- **Library**: nestjs-neo4j
- **Expected**: probe `nestjs-neo4j/round-trip` to PASS
- **Observed**: {"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
- **Recommended task**: investigate failure in `nestjs-neo4j` reported by probe `nestjs-neo4j/round-trip`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
```

</details>

### FAIL — langgraph-workflow-engine: langgraph-workflow-engine/stategraph-stream

- **Library**: langgraph-workflow-engine
- **Expected**: probe `langgraph-workflow-engine/stategraph-stream` to PASS
- **Observed**: {"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
- **Recommended task**: investigate failure in `langgraph-workflow-engine` reported by probe `langgraph-workflow-engine/stategraph-stream`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
```

</details>

### FAIL — langgraph-core: langgraph-core/agent-state-annotation

- **Library**: langgraph-core
- **Expected**: probe `langgraph-core/agent-state-annotation` to PASS
- **Observed**: {"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
- **Recommended task**: investigate failure in `langgraph-core` reported by probe `langgraph-core/agent-state-annotation`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
```

</details>

### FAIL — langgraph-monitoring: langgraph-monitoring/counter-roundtrip

- **Library**: langgraph-monitoring
- **Expected**: probe `langgraph-monitoring/counter-roundtrip` to PASS
- **Observed**: {"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
- **Recommended task**: investigate failure in `langgraph-monitoring` reported by probe `langgraph-monitoring/counter-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
```

</details>

### FAIL — langgraph-memory: langgraph-memory/store-retrieve-roundtrip

- **Library**: langgraph-memory
- **Expected**: probe `langgraph-memory/store-retrieve-roundtrip` to PASS
- **Observed**: {"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
- **Recommended task**: investigate failure in `langgraph-memory` reported by probe `langgraph-memory/store-retrieve-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
```

</details>

### FAIL — langgraph-hitl: langgraph-hitl/interrupt-resume-roundtrip

- **Library**: langgraph-hitl
- **Expected**: probe `langgraph-hitl/interrupt-resume-roundtrip` to PASS
- **Observed**: {"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
- **Recommended task**: investigate failure in `langgraph-hitl` reported by probe `langgraph-hitl/interrupt-resume-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG"}
```

</details>

### MISSING — langgraph-adapters: langgraph-adapters/sqlite-checkpointer-roundtrip

- **Library**: langgraph-adapters
- **Expected**: one of [SqliteCheckpointAdapter, SqliteCheckpointSaver, SqliteCheckpointer] — SQLite-backed BaseCheckpointSaver adapter (NestJS-injectable)
- **Observed in**: @hive-academy/langgraph-adapters lib (verified absence; only Neo4j HITL + thread-registry adapters currently exported; sampled exports: ApprovalChain, ApprovalChainRepository, ApprovalLevel, ApprovalRequest, ApprovalRequestRepository, ApprovalResponse, ConfidencePattern, ConfidencePatternRepository, …)
- **Recommended task**: add support for `one of [SqliteCheckpointAdapter, SqliteCheckpointSaver, SqliteCheckpointer] — SQLite-backed BaseCheckpointSaver adapter (NestJS-injectable)` in `langgraph-adapters` (surfaced by probe `langgraph-adapters/sqlite-checkpointer-roundtrip`)

### MISSING — langgraph-platform: langgraph-platform/surface-check

- **Library**: langgraph-platform
- **Expected**: public platform integration surface
- **Observed in**: package exports [DEFAULT_PLATFORM_OPTIONS, MultitaskStrategy, PLATFORM_MODULE_OPTIONS, PlatformClientService, PlatformModule, RunStatus, ThreadStatus, WebhookEvent, WebhookService, WebhookStatus] but PlatformModule is not registered in dev-brand-api AppModule (no in-process surface reachable without a remote LangGraph Platform endpoint)
- **Recommended task**: add support for `public platform integration surface` in `langgraph-platform` (surfaced by probe `langgraph-platform/surface-check`)

---

## Findings — Run 2026-05-15T17:10:49.407Z

_Run ID: `02ccafe4-7f89-4ccc-96ca-f0455a454f19` · Report folder: `2026-05-15T17-10-48-0a6281e8`_

### FAIL — dev-brand-api: dev-brand-api/boot-smoke/boot

- **Library**: dev-brand-api
- **Expected**: probe `dev-brand-api/boot-smoke/boot` to PASS
- **Observed**: {"code":"ERR_REQUIRE_ESM"}
- **Recommended task**: investigate failure in `dev-brand-api` reported by probe `dev-brand-api/boot-smoke/boot`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_REQUIRE_ESM"}
```

</details>

### FAIL — nestjs-chromadb: nestjs-chromadb/round-trip

- **Library**: nestjs-chromadb
- **Expected**: probe `nestjs-chromadb/round-trip` to PASS
- **Observed**: {"code":"ERR_REQUIRE_ESM"}
- **Recommended task**: investigate failure in `nestjs-chromadb` reported by probe `nestjs-chromadb/round-trip`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_REQUIRE_ESM"}
```

</details>

### FAIL — nestjs-neo4j: nestjs-neo4j/round-trip

- **Library**: nestjs-neo4j
- **Expected**: probe `nestjs-neo4j/round-trip` to PASS
- **Observed**: {"code":"ERR_REQUIRE_ESM"}
- **Recommended task**: investigate failure in `nestjs-neo4j` reported by probe `nestjs-neo4j/round-trip`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_REQUIRE_ESM"}
```

</details>

### FAIL — langgraph-workflow-engine: langgraph-workflow-engine/stategraph-stream

- **Library**: langgraph-workflow-engine
- **Expected**: probe `langgraph-workflow-engine/stategraph-stream` to PASS
- **Observed**: {"code":"ERR_REQUIRE_ESM"}
- **Recommended task**: investigate failure in `langgraph-workflow-engine` reported by probe `langgraph-workflow-engine/stategraph-stream`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_REQUIRE_ESM"}
```

</details>

### FAIL — langgraph-core: langgraph-core/agent-state-annotation

- **Library**: langgraph-core
- **Expected**: probe `langgraph-core/agent-state-annotation` to PASS
- **Observed**: {"code":"ERR_REQUIRE_ESM"}
- **Recommended task**: investigate failure in `langgraph-core` reported by probe `langgraph-core/agent-state-annotation`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_REQUIRE_ESM"}
```

</details>

### FAIL — langgraph-monitoring: langgraph-monitoring/counter-roundtrip

- **Library**: langgraph-monitoring
- **Expected**: probe `langgraph-monitoring/counter-roundtrip` to PASS
- **Observed**: {"code":"ERR_REQUIRE_ESM"}
- **Recommended task**: investigate failure in `langgraph-monitoring` reported by probe `langgraph-monitoring/counter-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_REQUIRE_ESM"}
```

</details>

### FAIL — langgraph-memory: langgraph-memory/store-retrieve-roundtrip

- **Library**: langgraph-memory
- **Expected**: probe `langgraph-memory/store-retrieve-roundtrip` to PASS
- **Observed**: {"code":"ERR_REQUIRE_ESM"}
- **Recommended task**: investigate failure in `langgraph-memory` reported by probe `langgraph-memory/store-retrieve-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_REQUIRE_ESM"}
```

</details>

### FAIL — langgraph-hitl: langgraph-hitl/interrupt-resume-roundtrip

- **Library**: langgraph-hitl
- **Expected**: probe `langgraph-hitl/interrupt-resume-roundtrip` to PASS
- **Observed**: {"code":"ERR_REQUIRE_ESM"}
- **Recommended task**: investigate failure in `langgraph-hitl` reported by probe `langgraph-hitl/interrupt-resume-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
{"code":"ERR_REQUIRE_ESM"}
```

</details>

### FAIL — langgraph-adapters: langgraph-adapters/sqlite-checkpointer-roundtrip

- **Library**: langgraph-adapters
- **Expected**: probe `langgraph-adapters/sqlite-checkpointer-roundtrip` to PASS
- **Observed**: Error: Must use import to load ES Module: /Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/uuid/dist-node/index.js
- **Recommended task**: investigate failure in `langgraph-adapters` reported by probe `langgraph-adapters/sqlite-checkpointer-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
Error: Must use import to load ES Module: /Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/uuid/dist-node/index.js
```

</details>

### MISSING — langgraph-platform: langgraph-platform/surface-check

- **Library**: langgraph-platform
- **Expected**: public platform integration surface
- **Observed in**: package exports [DEFAULT_PLATFORM_OPTIONS, MultitaskStrategy, PLATFORM_MODULE_OPTIONS, PlatformClientService, PlatformModule, RunStatus, ThreadStatus, WebhookEvent, WebhookService, WebhookStatus] but PlatformModule is not registered in dev-brand-api AppModule (no in-process surface reachable without a remote LangGraph Platform endpoint)
- **Recommended task**: add support for `public platform integration surface` in `langgraph-platform` (surfaced by probe `langgraph-platform/surface-check`)

---

## Findings — Run 2026-05-15T18:44:29.659Z

_Run ID: `004f9093-4357-4ffc-8fc4-b5db9f6c2f29` · Report folder: `2026-05-15T18-44-27-9a7a2cc6`_

### FAIL — dev-brand-api: dev-brand-api/boot-smoke/boot

- **Library**: dev-brand-api
- **Expected**: probe `dev-brand-api/boot-smoke/boot` to PASS
- **Observed**: Cannot destructure property '**extends' of '\_tslib_js**WEBPACK_IMPORTED_MODULE_0\_\_\_default(...)' as it is undefined.
- **Recommended task**: investigate failure in `dev-brand-api` reported by probe `dev-brand-api/boot-smoke/boot`

<details><summary>stack (first 4 lines)</summary>

```
TypeError: Cannot destructure property '__extends' of '_tslib_js__WEBPACK_IMPORTED_MODULE_0___default(...)' as it is undefined.
    at Module.root (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:276:5)
    at __webpack_require__ (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:372212:42)
    at Object.<anonymous> (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:11:17)
```

</details>

### FAIL — nestjs-chromadb: nestjs-chromadb/round-trip

- **Library**: nestjs-chromadb
- **Expected**: probe `nestjs-chromadb/round-trip` to PASS
- **Observed**: Cannot destructure property '**extends' of '\_tslib_js**WEBPACK_IMPORTED_MODULE_0\_\_\_default(...)' as it is undefined.
- **Recommended task**: investigate failure in `nestjs-chromadb` reported by probe `nestjs-chromadb/round-trip`

<details><summary>stack (first 4 lines)</summary>

```
TypeError: Cannot destructure property '__extends' of '_tslib_js__WEBPACK_IMPORTED_MODULE_0___default(...)' as it is undefined.
    at Module.root (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:276:5)
    at __webpack_require__ (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:372212:42)
    at Object.<anonymous> (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:11:17)
```

</details>

### FAIL — nestjs-neo4j: nestjs-neo4j/round-trip

- **Library**: nestjs-neo4j
- **Expected**: probe `nestjs-neo4j/round-trip` to PASS
- **Observed**: Cannot destructure property '**extends' of '\_tslib_js**WEBPACK_IMPORTED_MODULE_0\_\_\_default(...)' as it is undefined.
- **Recommended task**: investigate failure in `nestjs-neo4j` reported by probe `nestjs-neo4j/round-trip`

<details><summary>stack (first 4 lines)</summary>

```
TypeError: Cannot destructure property '__extends' of '_tslib_js__WEBPACK_IMPORTED_MODULE_0___default(...)' as it is undefined.
    at Module.root (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:276:5)
    at __webpack_require__ (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:372212:42)
    at Object.<anonymous> (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:11:17)
```

</details>

### FAIL — langgraph-workflow-engine: langgraph-workflow-engine/stategraph-stream

- **Library**: langgraph-workflow-engine
- **Expected**: probe `langgraph-workflow-engine/stategraph-stream` to PASS
- **Observed**: Cannot destructure property '**extends' of '\_tslib_js**WEBPACK_IMPORTED_MODULE_0\_\_\_default(...)' as it is undefined.
- **Recommended task**: investigate failure in `langgraph-workflow-engine` reported by probe `langgraph-workflow-engine/stategraph-stream`

<details><summary>stack (first 4 lines)</summary>

```
TypeError: Cannot destructure property '__extends' of '_tslib_js__WEBPACK_IMPORTED_MODULE_0___default(...)' as it is undefined.
    at Module.root (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:276:5)
    at __webpack_require__ (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:372212:42)
    at Object.<anonymous> (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:11:17)
```

</details>

### FAIL — langgraph-core: langgraph-core/agent-state-annotation

- **Library**: langgraph-core
- **Expected**: probe `langgraph-core/agent-state-annotation` to PASS
- **Observed**: Cannot destructure property '**extends' of '\_tslib_js**WEBPACK_IMPORTED_MODULE_0\_\_\_default(...)' as it is undefined.
- **Recommended task**: investigate failure in `langgraph-core` reported by probe `langgraph-core/agent-state-annotation`

<details><summary>stack (first 4 lines)</summary>

```
TypeError: Cannot destructure property '__extends' of '_tslib_js__WEBPACK_IMPORTED_MODULE_0___default(...)' as it is undefined.
    at Module.root (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:276:5)
    at __webpack_require__ (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:372212:42)
    at Object.<anonymous> (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:11:17)
```

</details>

### FAIL — langgraph-monitoring: langgraph-monitoring/counter-roundtrip

- **Library**: langgraph-monitoring
- **Expected**: probe `langgraph-monitoring/counter-roundtrip` to PASS
- **Observed**: Cannot destructure property '**extends' of '\_tslib_js**WEBPACK_IMPORTED_MODULE_0\_\_\_default(...)' as it is undefined.
- **Recommended task**: investigate failure in `langgraph-monitoring` reported by probe `langgraph-monitoring/counter-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
TypeError: Cannot destructure property '__extends' of '_tslib_js__WEBPACK_IMPORTED_MODULE_0___default(...)' as it is undefined.
    at Module.root (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:276:5)
    at __webpack_require__ (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:372212:42)
    at Object.<anonymous> (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:11:17)
```

</details>

### FAIL — langgraph-memory: langgraph-memory/store-retrieve-roundtrip

- **Library**: langgraph-memory
- **Expected**: probe `langgraph-memory/store-retrieve-roundtrip` to PASS
- **Observed**: Cannot destructure property '**extends' of '\_tslib_js**WEBPACK_IMPORTED_MODULE_0\_\_\_default(...)' as it is undefined.
- **Recommended task**: investigate failure in `langgraph-memory` reported by probe `langgraph-memory/store-retrieve-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
TypeError: Cannot destructure property '__extends' of '_tslib_js__WEBPACK_IMPORTED_MODULE_0___default(...)' as it is undefined.
    at Module.root (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:276:5)
    at __webpack_require__ (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:372212:42)
    at Object.<anonymous> (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:11:17)
```

</details>

### FAIL — langgraph-hitl: langgraph-hitl/interrupt-resume-roundtrip

- **Library**: langgraph-hitl
- **Expected**: probe `langgraph-hitl/interrupt-resume-roundtrip` to PASS
- **Observed**: Cannot destructure property '**extends' of '\_tslib_js**WEBPACK_IMPORTED_MODULE_0\_\_\_default(...)' as it is undefined.
- **Recommended task**: investigate failure in `langgraph-hitl` reported by probe `langgraph-hitl/interrupt-resume-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
TypeError: Cannot destructure property '__extends' of '_tslib_js__WEBPACK_IMPORTED_MODULE_0___default(...)' as it is undefined.
    at Module.root (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:276:5)
    at __webpack_require__ (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:372212:42)
    at Object.<anonymous> (/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/dist-test/apps/dev-brand-api/test-bootstrap.js:11:17)
```

</details>

### FAIL — langgraph-adapters: langgraph-adapters/sqlite-checkpointer-roundtrip

- **Library**: langgraph-adapters
- **Expected**: probe `langgraph-adapters/sqlite-checkpointer-roundtrip` to PASS
- **Observed**: Error: Must use import to load ES Module: /Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/uuid/dist-node/index.js
- **Recommended task**: investigate failure in `langgraph-adapters` reported by probe `langgraph-adapters/sqlite-checkpointer-roundtrip`

<details><summary>stack (first 4 lines)</summary>

```
Error: Must use import to load ES Module: /Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/node_modules/uuid/dist-node/index.js
```

</details>

### MISSING — langgraph-platform: langgraph-platform/surface-check

- **Library**: langgraph-platform
- **Expected**: public platform integration surface
- **Observed in**: package exports [DEFAULT_PLATFORM_OPTIONS, MultitaskStrategy, PLATFORM_MODULE_OPTIONS, PlatformClientService, PlatformModule, RunStatus, ThreadStatus, WebhookEvent, WebhookService, WebhookStatus] but PlatformModule is not registered in dev-brand-api AppModule (no in-process surface reachable without a remote LangGraph Platform endpoint)
- **Recommended task**: add support for `public platform integration surface` in `langgraph-platform` (surfaced by probe `langgraph-platform/surface-check`)

---
