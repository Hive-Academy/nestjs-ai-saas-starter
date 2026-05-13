/**
 * LLM Provider Configuration
 *
 * Used by callers of getLLM() to pass per-call overrides such as
 * temperature and maxTokens without affecting the module-level defaults.
 */
export interface LlmConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * LLM Module Options
 *
 * Supports two dispatch branches for LLM resolution:
 *
 * Branch A - Native LangChain provider dispatch (no baseUrl):
 *   Supply `model` in "provider:model-name" format. LangChain's
 *   `initChatModel` resolves the correct client class automatically
 *   by reading the provider prefix from the model string.
 *   The matching API key must be present in the environment
 *   (e.g. ANTHROPIC_API_KEY for "anthropic:*", OPENAI_API_KEY for "openai:*").
 *   Examples:
 *     "anthropic:claude-sonnet-4-6"
 *     "openai:gpt-4o-mini"
 *     "openrouter:z-ai/glm-4.5-air:free"
 *
 * Branch B - OpenAI-compatible custom endpoint (baseUrl present):
 *   Any provider that speaks the OpenAI REST protocol (Z AI, Ollama,
 *   Together AI, local vLLM, etc.). Set `baseUrl` to trigger this path;
 *   `ChatOpenAI` is instantiated with that URL and the supplied `apiKey`.
 *   The `model` string is passed as-is to the endpoint (no prefix needed).
 *   Examples:
 *     baseUrl: "https://api.z.ai/v1", model: "z-ai/glm-4.5-air"
 *     baseUrl: "http://localhost:11434/v1", model: "llama3"
 */
export interface LlmModuleOptions {
  defaultLlm?: {
    /**
     * Model identifier.
     *
     * Branch A: "provider:model-name" — e.g. "anthropic:claude-sonnet-4-6",
     *   "openai:gpt-4o-mini", "openrouter:z-ai/glm-4.5-air:free".
     * Branch B: bare model name understood by the custom endpoint —
     *   e.g. "llama3", "z-ai/glm-4.5-air". Paired with `baseUrl`.
     */
    model?: string;
    /**
     * API key for authentication.
     *
     * Branch A: must match the environment variable expected by the
     *   provider (e.g. process.env.ANTHROPIC_API_KEY). When omitted,
     *   `initChatModel` reads the key from the environment automatically.
     * Branch B: the auth key accepted by the custom endpoint.
     */
    apiKey?: string;
    /**
     * Base URL for the LLM API endpoint.
     *
     * When set, activates Branch B: a `ChatOpenAI` instance is created
     * pointing at this URL. Leave unset to use Branch A (native
     * LangChain provider dispatch via `initChatModel`).
     *
     * Example: "https://api.z.ai/v1"
     */
    baseUrl?: string;
    temperature?: number;
    maxTokens?: number;
  };
  streaming?: {
    enabled?: boolean;
  };
}
