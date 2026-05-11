# Task Context for TASK_2025_062

## User Intent

Refactor `LlmProviderService` to replace the 7-provider manual switch/case with `initChatModel` from LangChain — a two-branch approach:
1. Native LangChain providers via `"provider:model"` string format (e.g. `anthropic:claude-sonnet-4-6`)
2. OpenAI-compatible custom endpoints via `baseUrl` + `apiKey` config (for Z AI, Ollama, Together AI, etc.)

Also update `.env.llm` and any related config interfaces to use the new model string format.

## Conversation Summary

Key decisions made:
- Use `initChatModel` from `langchain/chat_models/universal` (already available in `langchain ^1.0.0`)
- Two-branch dispatch: (1) native LangChain via `"provider:model"` string, (2) OpenAI-compat via custom baseUrl
- Eliminate all `any` types — full type safety required
- Remove the 3 stub providers (google, azure-openai, cohere) that silently fall back to OpenAI
- After refactor, env var becomes: `LLM_MODEL=openrouter:z-ai/glm-4.5-air:free` (provider prefix embedded in model string)
- The `LLM_PROVIDER` env var is eliminated — provider is inferred from the model string prefix
- `validateModelConfig` and `getModelCapabilities` must be updated to work with new model string format
- `getSupportedProviders()` simplifies to listing native LangChain providers (anthropic, openai, google-genai, etc.)

Technical constraints:
- Current active config: `LLM_PROVIDER=openrouter`, `LLM_MODEL=z-ai/glm-4.5-air:free`
- After refactor: `LLM_MODEL=openrouter:z-ai/glm-4.5-air:free` with `LLM_BASE_URL` + `LLM_API_KEY` for custom endpoints
- `initChatModel` is verified available: `node -e "const { initChatModel } = require('langchain/chat_models/universal'); ..."` returns function
- `workflow-engine.config.ts` reads from `.env.llm` and passes config to `LlmProviderService` via `LlmModuleOptions`

## Technical Context

- Branch: feature/062 (but currently on ak/implement-work-os-authentication — user handles git)
- Created: 2026-05-05
- Task Type: REFACTORING
- Priority: P1-High
- Effort Estimate: Medium (~2-3 hours, 3 files)

## Files to Modify

1. `libs/langgraph-modules/workflow-engine/src/lib/services/llm/llm-provider.service.ts` — primary target
2. `libs/langgraph-modules/workflow-engine/src/lib/interfaces/llm-config.interface.ts` — interface simplification
3. `apps/dev-brand-api/src/app/config/workflow-engine.config.ts` — config alignment
4. `.env.llm` — env var restructure (LLM_MODEL gets provider prefix, LLM_PROVIDER removed)

## Execution Strategy

REFACTORING strategy — no architect or PM needed (solution is fully specified):

1. Task decomposition (team-leader MODE 1) — create atomic tasks.md
2. Iterative development (team-leader MODE 2 per task):
   - Task 1: Refactor `llm-config.interface.ts` — simplify LlmModuleOptions to two-branch shape
   - Task 2: Refactor `llm-provider.service.ts` — replace switch/case with initChatModel two-branch
   - Task 3: Update `workflow-engine.config.ts` — align with new interface
   - Task 4: Update `.env.llm` — restructure env vars, embed provider in model string
3. Optional QA (user choice): senior-tester / code-reviewer
