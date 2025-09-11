# Encapsulated Environment Configuration

This project uses an **encapsulated environment configuration** approach where each service/library has its own dedicated `.env` file instead of one monolithic `.env` file.

## Environment Files Structure

```
├── .env.chromadb      # ChromaDB & Memory configuration
├── .env.neo4j         # Neo4j graph database configuration
├── .env.llm           # LLM providers configuration (OpenAI, Anthropic, OpenRouter, etc.)
├── .env.platform      # LangGraph platform configuration
└── .env.app           # Application-level settings only
```

## Benefits

✅ **Clean Separation**: Each service manages its own configuration
✅ **Better Organization**: Related settings are grouped together  
✅ **Easier Maintenance**: Changes to one service don't affect others
✅ **Environment Inheritance**: Files load in order with proper precedence
✅ **Modular Development**: Services can be configured independently

## Quick Setup

1. **Copy the application config:**

   ```bash
   cp .env.app.example .env.app
   ```

2. **Reference library configurations** (if needed):

   - `libs/nestjs-chromadb/.env.example` - ChromaDB configuration reference
   - `libs/nestjs-neo4j/.env.example` - Neo4j configuration reference
   - `libs/langgraph-modules/multi-agent/.env.example` - Multi-agent reference
   - `libs/langgraph-modules/platform/.env.example` - Platform reference

3. **Configure your LLM provider** in `.env.llm`:

   ```bash
   # Set your provider
   LLM_PROVIDER=openrouter

   # Add your API key
   OPENROUTER_API_KEY=your_api_key_here
   ```

4. **Start the services:**
   ```bash
   npm run dev:services     # Start Neo4j, ChromaDB
   npx nx serve dev-brand-api  # Start the demo app
   ```

## Configuration Loading

The application automatically loads all `.env.*` files in the correct order:

1. `.env.chromadb` - ChromaDB and Memory module settings
2. `.env.neo4j` - Neo4j database settings
3. `.env.llm` - LLM provider settings
4. `.env.platform` - LangGraph platform settings
5. `.env.app` - Application-level settings (highest precedence)

## LLM Provider Setup

The new approach uses **simple provider selection** instead of model-name detection:

### OpenRouter (Recommended)

```bash
# In .env.llm
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=moonshotai/kimi-k2:free
```

### OpenAI

```bash
# In .env.llm
LLM_PROVIDER=openai
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-3.5-turbo
```

### Anthropic

```bash
# In .env.llm
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_key_here
ANTHROPIC_MODEL=claude-3-sonnet-20240229
```

### Local LLM (Ollama)

```bash
# In .env.llm
LLM_PROVIDER=local
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
LOCAL_MODEL=llama2
```

## Migration from Old Setup

If you have an existing `.env` file, the configuration has been automatically distributed to the new encapsulated files. The old `.env` and `.env.example` files have been removed in favor of this cleaner approach.

## Development Workflow

1. **Service-specific changes**: Edit the relevant `.env.*` file
2. **Application settings**: Edit `.env.app`
3. **No more conflicts**: Each service owns its configuration domain
4. **Easy debugging**: Clear separation makes issues easier to trace

## Environment Variables Reference

See the individual `.env.*.example` files for complete configuration options for each service.
