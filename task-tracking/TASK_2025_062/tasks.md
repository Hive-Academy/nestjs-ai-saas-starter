# Development Tasks - TASK_2025_062

**Total Tasks**: 4 | **Batches**: 1 | **Status**: 1/1 complete
**Task Type**: REFACTORING
**Developer**: backend-developer (all tasks)

---

## Plan Validation Summary

**Validation Status**: PASSED WITH RISKS

### Assumptions Verified

- `initChatModel` available in `langchain ^1.0.0` at `langchain/chat_models/universal` — verified in context.md
- `ChatOpenAI` from `@langchain/openai` supports `configuration.baseURL` for OpenAI-compatible endpoints — standard LangChain pattern
- `BaseChatModel` from `@langchain/core/language_models/chat_models` is the correct return type — standard LangChain type

### Risks Identified

| Risk | Severity | Mitigation |
|------|----------|------------|
| Removing `LLM_PROVIDER` may break consumers reading it directly | MED | Task 3 audits config.ts; Task 2 ensures provider derives from model string prefix |
| Removing stub providers (google/azure-openai/cohere) may surface latent bugs | LOW | These were silent fallbacks — `initChatModel` will throw clearly if used |
| `validateModelConfig` / `getModelCapabilities` semantics change with new model string format | MED | Task 2 reimplements both to parse `provider:model` strings |
| `.env.llm` change requires user to update OpenRouter API key into `LLM_API_KEY` | LOW | Task 4 documents the env var migration |

### Edge Cases to Handle

- [ ] Model string without provider prefix (e.g. `"gpt-4"`) → Task 2 should validate and throw
- [ ] `baseUrl` set without `apiKey` → Task 2 should validate and throw
- [ ] Cache key collisions across native vs custom-endpoint LLMs → Task 2 cache key includes baseUrl
- [ ] `LlmModuleOptions` consumers downstream → Task 1 keeps interface name stable; only shape changes

---

## Batch 1: LLM Provider Refactor (initChatModel migration) ✅ COMPLETE

**Developer**: backend-developer
**Tasks**: 4 | **Dependencies**: None (Task 1 must be first; Tasks 2-4 depend on Task 1)

---

### Task 1.1: Refactor LlmModuleOptions interface ✅ COMPLETE

**File**: /Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/libs/langgraph-modules/workflow-engine/src/lib/interfaces/llm-config.interface.ts

**What to Change**:

- Remove per-provider API key fields (e.g. `openaiApiKey`, `anthropicApiKey`, `openrouterApiKey`, etc.)
- Remove nested per-provider configs (e.g. `openrouter: { ... }`, `anthropic: { ... }`)
- Remove `provider` field (provider is now embedded in model string)
- Define new shape:
  - `model: string` — required, format `"provider:model-name"` (e.g. `"anthropic:claude-sonnet-4-6"`, `"openrouter:z-ai/glm-4.5-air:free"`)
  - `apiKey: string` — required (used for both native LangChain providers via env-var-style and OpenAI-compat endpoints)
  - `baseUrl?: string` — optional; if present, triggers Branch B (OpenAI-compatible custom endpoint)
  - `temperature?: number` — optional, default 0.7
  - `maxTokens?: number` — optional, default 2048
  - `streaming?: boolean` — optional, default false
- Keep interface NAME `LlmModuleOptions` (anti-backward-compat: direct replacement, not LlmModuleOptionsV2)
- Export any helper types needed (e.g. `LlmModelString` if useful)

**Quality Requirements**:

- NO `any` types
- All fields documented with JSDoc explaining the two-branch logic
- Imports cleaned up — remove any per-provider type imports that are no longer needed

**Validation Notes**:

- This interface is the contract for Tasks 2 and 3 — finalize shape carefully
- Consumers: `llm-provider.service.ts` (Task 2) and `workflow-engine.config.ts` (Task 3)

**Verification**: `npx nx build @hive-academy/langgraph-workflow-engine` passes

**Commit Pattern**: `refactor(langgraph): simplify LlmModuleOptions for initChatModel two-branch dispatch`

---

### Task 1.2: Refactor LlmProviderService to two-branch initChatModel ✅ COMPLETE

**File**: /Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/libs/langgraph-modules/workflow-engine/src/lib/services/llm/llm-provider.service.ts

**Dependencies**: Task 1.1

**What to Change**:

- Replace 7-case provider switch/case in `getLLM` (or equivalent) with two-branch dispatch:
  - **Branch A** (native LangChain): `baseUrl` is undefined → `await initChatModel(model, { temperature, maxTokens, apiKey })`
  - **Branch B** (OpenAI-compatible custom endpoint): `baseUrl` is defined → `new ChatOpenAI({ model: modelNameOnly, apiKey, temperature, maxTokens, configuration: { baseURL: baseUrl } })`
  - For Branch B, strip the `provider:` prefix from the model string before passing to `ChatOpenAI` (it expects bare model name)
- Imports:
  - `import { initChatModel } from 'langchain/chat_models/universal';`
  - `import { ChatOpenAI } from '@langchain/openai';`
  - `import type { BaseChatModel } from '@langchain/core/language_models/chat_models';`
- Eliminate ALL `any` types — return type of `getLLM` is `Promise<BaseChatModel>`; cache map is `Map<string, BaseChatModel>`
- Remove the 3 stub providers (google, azure-openai, cohere fallbacks) — they silently fell back to OpenAI which is a bug
- Simplify (keep but adapt to new model string format):
  - `getLLM(options?: Partial<LlmModuleOptions>)` — main entry, two-branch dispatch
  - `testLLM(options?)` — issue a small test invocation
  - `clearCache()` — clears cache map
  - `getCacheStats()` — returns `{ size, keys }`
  - `preloadModels(models: string[])` — iterates and calls getLLM
  - `validateModelConfig(options: LlmModuleOptions)` — parses `provider:model` string, validates baseUrl/apiKey pairing, throws clearly
  - `getSupportedProviders()` — returns array of native LangChain provider prefixes (e.g. `['anthropic','openai','google-genai','groq','mistralai','together','fireworks']`); custom endpoints handled via baseUrl branch
  - `getModelCapabilities(model: string)` — parses provider prefix, returns capabilities object (streaming, tools, etc.) based on provider
- Cache key MUST include `baseUrl` to prevent collisions between native and custom-endpoint LLMs
- Edge cases:
  - Throw if `model` lacks `:` (no provider prefix)
  - Throw if `baseUrl` is set but `apiKey` is missing
  - Throw if model string is empty

**Quality Requirements**:

- NO `any` types anywhere — use `BaseChatModel`, proper types from `@langchain/core`
- NO stubs, placeholders, TODOs
- Comprehensive logging via NestJS Logger (debug for cache hits, log for new instantiation, warn for fallbacks, error for failures)
- All error paths throw with descriptive messages

**Validation Notes**:

- This is the core refactor — entire file body changes
- Must compile against new `LlmModuleOptions` from Task 1.1
- Cache invalidation: clearing cache must invalidate ALL branches uniformly

**Verification**:

- `npx nx build @hive-academy/langgraph-workflow-engine` passes
- `npx nx lint @hive-academy/langgraph-workflow-engine` passes (no `any`)
- `npx nx typecheck @hive-academy/langgraph-workflow-engine` passes

**Commit Pattern**: `refactor(langgraph): replace 7-provider switch with initChatModel two-branch dispatch`

---

### Task 1.3: Update workflow-engine.config.ts for new options shape ✅ COMPLETE

**File**: /Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/apps/dev-brand-api/src/app/config/workflow-engine.config.ts

**Dependencies**: Task 1.1 (interface), Task 1.2 (semantics confirmed)

**What to Change**:

- Remove all per-provider API key reads (e.g. `process.env.OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc., insofar as they were feeding `LlmModuleOptions`)
- Remove `provider: process.env.LLM_PROVIDER` field
- Add to the LLM section of the config object:
  - `model: process.env.LLM_MODEL ?? 'openrouter:z-ai/glm-4.5-air:free'`
  - `apiKey: process.env.LLM_API_KEY ?? ''` (with validation/warning if empty)
  - `baseUrl: process.env.LLM_BASE_URL` (undefined when not set — that's correct, triggers Branch A)
  - `temperature: Number(process.env.LLM_TEMPERATURE ?? '0.7')`
  - `maxTokens: Number(process.env.LLM_MAX_TOKENS ?? '2048')`
  - `streaming: process.env.LLM_STREAMING_ENABLED === 'true'`
- Ensure config object shape matches `LlmModuleOptions` exactly (TypeScript will enforce)
- Keep `registerAs` / NestJS config namespace registration as-is (no API change)

**Quality Requirements**:

- NO `any` types
- Validate `LLM_API_KEY` presence at config load — log warning if missing
- Preserve all other (non-LLM) workflow-engine config fields untouched

**Validation Notes**:

- This file is the only consumer of the new interface in the app — any miss here breaks runtime
- Other consumers (if any) of `process.env.LLM_PROVIDER` must be audited and removed/refactored

**Verification**:

- `npx nx build dev-brand-api` passes
- `npx nx typecheck dev-brand-api` passes

**Commit Pattern**: `refactor(langgraph): align workflow-engine config with new LlmModuleOptions shape`

---

### Task 1.4: Restructure .env.llm for new model string format ✅ COMPLETE

**File**: /Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/.env.llm

**Dependencies**: Task 1.3 (config consumer finalized)

**What to Change**:

- Remove: `LLM_PROVIDER=...` line
- Remove: per-provider API key sections / variables that fed the old switch/case (e.g. dedicated OpenRouter, Anthropic, etc. keys IF they exist as separate vars in this file)
- Add / set:
  - `LLM_MODEL=openrouter:z-ai/glm-4.5-air:free` (provider prefix embedded)
  - `LLM_API_KEY=<existing OpenRouter key value migrated here>` — preserve the actual key value from whichever per-provider var it currently lives in
  - `LLM_BASE_URL=https://openrouter.ai/api/v1` (OpenRouter is OpenAI-compatible → Branch B)
- Keep:
  - `LLM_TEMPERATURE=...`
  - `LLM_MAX_TOKENS=...`
  - `LLM_STREAMING_ENABLED=...`
- Add header comments documenting:
  - The `provider:model` format for `LLM_MODEL`
  - When to set `LLM_BASE_URL` (OpenAI-compatible custom endpoints) vs leave it unset (native LangChain providers)
  - List of supported native provider prefixes

**Quality Requirements**:

- Preserve actual secret values (do NOT replace real keys with placeholders)
- Comments must explain the two-branch model clearly
- File must end with newline

**Validation Notes**:

- This is a config file — runtime verification is via app startup, not build
- After change, `dev-brand-api` must boot without errors and `LlmProviderService.getLLM()` must succeed

**Verification**:

- File exists with new structure
- Manual review of comments and structure
- (Optional) `npx nx serve dev-brand-api` starts without LLM config errors

**Commit Pattern**: `refactor(langgraph): restructure env.llm for provider:model string format`

---

**Batch 1 Verification**:

- All 4 files modified at exact paths above
- `npx nx build @hive-academy/langgraph-workflow-engine` passes
- `npx nx build dev-brand-api` passes
- `npx nx lint @hive-academy/langgraph-workflow-engine` passes
- code-logic-reviewer approved (no stubs, no `any`, real implementations)
- Edge cases from validation handled in Task 1.2
