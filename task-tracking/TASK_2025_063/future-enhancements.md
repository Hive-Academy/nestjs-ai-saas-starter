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
