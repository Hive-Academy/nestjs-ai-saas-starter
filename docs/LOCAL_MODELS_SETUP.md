# Local Models Setup Guide

This guide explains how to set up and use AI models with the NestJS AI SaaS Starter.

## Overview

The application supports multiple LLM providers:

- **OpenRouter** (Default) - Access to 100+ models through a unified API
- **Ollama** - Fully local Large Language Models (LLMs)
- **HuggingFace** - Local embedding models (always used for embeddings)

You can choose between cloud-based models (OpenRouter) for better quality and variety, or fully local models (Ollama) for privacy and offline usage.

## Quick Setup

### Option A: OpenRouter (Recommended - Default)

See [OpenRouter Setup Guide](./OPENROUTER_SETUP.md) for detailed instructions.

Quick steps:

1. Get API key from https://openrouter.ai/keys
2. Set `OPENROUTER_API_KEY` in `.env`
3. Choose a model (default: `openai/gpt-3.5-turbo`)
4. Run the application

### Option B: Ollama (Fully Local)

Follow the instructions below for complete local setup.

## Prerequisites

### 1. Install Ollama

Download and install Ollama from: https://ollama.ai/

Verify installation:

```bash
ollama --version
```

### 2. Pull a Model

Pull the default LLaMA 2 model (or any other model you prefer):

```bash
ollama pull llama2
```

Other recommended models:

```bash
ollama pull mistral       # Smaller, faster model
ollama pull codellama     # Optimized for code
ollama pull neural-chat   # Conversational AI
ollama pull starling-lm   # High-quality responses
```

### 3. Start Ollama Server

Ollama runs as a local server on port 11434:

```bash
ollama serve
```

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

**Note:** The `.env.example` file has been streamlined to include only the 32 variables that are actually used by the application. For a complete reference of all possible variables (for future features), see `.env.example.full`.

Key settings included:

```env
# Ollama Configuration (Local LLM)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2
OLLAMA_TEMPERATURE=0.7
OLLAMA_NUM_PREDICT=256
OLLAMA_TOP_K=40
OLLAMA_TOP_P=0.9

# HuggingFace Configuration (Local Embeddings)
HUGGINGFACE_MODEL=sentence-transformers/all-MiniLM-L6-v2
HUGGINGFACE_API_KEY=  # Leave empty for public models
HUGGINGFACE_USE_SERVERLESS=false
HUGGINGFACE_WAIT_FOR_MODEL=true
HUGGINGFACE_BATCH_SIZE=50

# ChromaDB Configuration
CHROMADB_HOST=localhost
CHROMADB_PORT=8000
CHROMADB_SSL=false
CHROMADB_DEFAULT_COLLECTION=documents
CHROMADB_HEALTH_CHECK=true
```

### Available Embedding Models

The following HuggingFace models are recommended for different use cases:

1. **General Purpose** (Default):

   - `sentence-transformers/all-MiniLM-L6-v2` - Fast and efficient

2. **Higher Quality**:

   - `sentence-transformers/all-mpnet-base-v2` - Better accuracy, slower

3. **Specialized**:
   - `sentence-transformers/paraphrase-MiniLM-L6-v2` - For paraphrasing
   - `sentence-transformers/multi-qa-MiniLM-L6-cos-v1` - For Q&A systems

## Module Configuration

The application modules are pre-configured in `app.module.ts`:

### ChromaDB with HuggingFace Embeddings

```typescript
ChromaDBModule.forRootAsync({
  useFactory: async (configService: ConfigService) => ({
    connection: {
      host: configService.get('CHROMADB_HOST', 'localhost'),
      port: parseInt(configService.get('CHROMADB_PORT', '8000')),
    },
    embedding: {
      provider: 'huggingface',
      config: {
        model: configService.get('HUGGINGFACE_MODEL'),
        apiKey: configService.get('HUGGINGFACE_API_KEY', ''),
      },
    },
  }),
});
```

### LangGraph with Ollama

```typescript
LangGraphModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    llm: {
      provider: 'ollama',
      baseUrl: configService.get('OLLAMA_BASE_URL'),
      model: configService.get('OLLAMA_MODEL'),
      options: {
        temperature: parseFloat(configService.get('OLLAMA_TEMPERATURE')),
      },
    },
  }),
});
```

## Running the Application

1. **Start Infrastructure Services**:

```bash
npm run dev:services
```

This starts:

- Neo4j (Graph Database)
- ChromaDB (Vector Database)
- Redis (Cache)

2. **Start Ollama**:

```bash
ollama serve
```

3. **Run the Application**:

```bash
npx nx serve nestjs-ai-saas-starter-demo
```

## Testing Local Models

### Test Embeddings

```bash
curl -X POST http://localhost:3000/documents \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is a test document for local embeddings",
    "metadata": {"type": "test"}
  }'
```

### Test LLM Workflow

```bash
curl -X POST http://localhost:3000/workflows/execute \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "sample",
    "input": {
      "prompt": "Hello, how are you?"
    }
  }'
```

## Performance Considerations

### Ollama Models

- **llama2**: Balanced performance and quality
- **mistral**: Faster responses, lower memory usage
- **codellama**: Best for code-related tasks

### Embedding Models

- **all-MiniLM-L6-v2**: Fast (50ms per batch), 384 dimensions
- **all-mpnet-base-v2**: Slower (200ms per batch), 768 dimensions

### Optimization Tips

1. Adjust `OLLAMA_NUM_PREDICT` for response length
2. Tune `OLLAMA_TEMPERATURE` for creativity vs consistency
3. Set `HUGGINGFACE_BATCH_SIZE` based on available memory
4. Use `CHROMADB_BATCH_SIZE` to optimize bulk operations

## Troubleshooting

### Ollama Connection Issues

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
ollama serve
```

### Embedding Errors

- Ensure HuggingFace model name is correct
- Check network connectivity for model downloads
- Verify sufficient disk space for model caching

### Memory Issues

- Reduce batch sizes
- Use smaller models
- Increase Node.js heap size: `NODE_OPTIONS="--max-old-space-size=4096"`

## Switching Between Local and Cloud

To switch back to cloud providers, update your `.env`:

```env
# For OpenAI
DEFAULT_LLM_PROVIDER=openai
DEFAULT_EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=your_key_here
```

Then update the module configurations in `app.module.ts` accordingly.

## Additional Resources

- [Ollama Documentation](https://github.com/jmorganca/ollama)
- [HuggingFace Models](https://huggingface.co/models)
- [ChromaDB Guide](https://docs.trychroma.com/)
- [LangGraph Documentation](https://python.langchain.com/docs/langgraph)
