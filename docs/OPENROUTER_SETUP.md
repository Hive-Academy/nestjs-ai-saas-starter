# OpenRouter Setup Guide

This guide explains how to set up and use OpenRouter as your LLM provider for the NestJS AI SaaS Starter.

## What is OpenRouter?

OpenRouter is a unified API that provides access to multiple AI models from different providers (OpenAI, Anthropic, Google, Meta, etc.) through a single interface. This gives you:

- **Model Flexibility**: Switch between models without changing code
- **Cost Optimization**: Choose models based on cost/performance trade-offs
- **Fallback Options**: Automatically failover to alternative models
- **Single API Key**: Access all models with one API key

## Getting Started

### 1. Create an OpenRouter Account

1. Visit [OpenRouter](https://openrouter.ai/)
2. Sign up for an account
3. Go to [API Keys](https://openrouter.ai/keys)
4. Create a new API key
5. Add credits to your account (pay-as-you-go pricing)

### 2. Configure Environment Variables

Update your `.env` file with OpenRouter settings:

```env
# Set OpenRouter as the LLM provider
LLM_PROVIDER=openrouter

# OpenRouter Configuration
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=openai/gpt-3.5-turbo

# Optional: Customize model parameters
OPENROUTER_TEMPERATURE=0.7
OPENROUTER_MAX_TOKENS=2048
OPENROUTER_TOP_P=0.9

# Optional: For analytics and rate limiting
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_APP_NAME=NestJS AI SaaS Starter
```

## Available Models

OpenRouter provides access to 100+ models. Here are popular options:

### Fast & Affordable

- `openai/gpt-3.5-turbo` - OpenAI's GPT-3.5 ($0.50/M tokens)
- `mistralai/mistral-7b-instruct` - Mistral 7B ($0.07/M tokens)
- `google/gemini-flash-1.5` - Google's fast model ($0.25/M tokens)

### High Quality

- `openai/gpt-4-turbo` - OpenAI's GPT-4 Turbo ($10/M tokens)
- `anthropic/claude-3-sonnet` - Claude 3 Sonnet ($3/M tokens)
- `google/gemini-pro` - Google's Gemini Pro ($0.50/M tokens)

### Specialized

- `anthropic/claude-3-opus` - Best for complex reasoning ($15/M tokens)
- `meta-llama/llama-3-70b-instruct` - Meta's Llama 3 ($0.90/M tokens)
- `deepseek/deepseek-coder` - Optimized for coding ($0.14/M tokens)

### Free Models

- `gryphe/mythomax-l2-13b` - Free creative writing model
- `nousresearch/nous-capybara-7b` - Free general purpose model

View all models: https://openrouter.ai/models

## Switching Models

To switch models, simply update the `OPENROUTER_MODEL` in your `.env`:

```env
# For coding tasks
OPENROUTER_MODEL=deepseek/deepseek-coder

# For creative writing
OPENROUTER_MODEL=anthropic/claude-3-sonnet

# For fast responses
OPENROUTER_MODEL=mistralai/mistral-7b-instruct

# For best quality
OPENROUTER_MODEL=anthropic/claude-3-opus
```

## Cost Management

### Monitoring Usage

- Check usage at: https://openrouter.ai/account
- Set spending limits in your account settings
- Monitor per-model costs in the dashboard

### Cost Optimization Tips

1. **Use cheaper models for simple tasks**: GPT-3.5 for basic queries
2. **Reserve expensive models for complex tasks**: GPT-4/Claude for analysis
3. **Adjust max_tokens**: Limit response length to control costs
4. **Use temperature 0**: For deterministic responses (reduces retries)

## Advanced Configuration

### Model-Specific Parameters

Different models support different parameters:

```typescript
// In app.module.ts
options: {
  temperature: 0.7,      // Creativity (0-2)
  maxTokens: 2048,       // Max response length
  topP: 0.9,            // Nucleus sampling
  topK: 40,             // Only for some models
  frequencyPenalty: 0,   // Reduce repetition
  presencePenalty: 0,    // Encourage new topics
  stop: ["\n\n"],       // Stop sequences
}
```

### Request Headers

OpenRouter uses special headers for analytics and routing:

```typescript
headers: {
  'HTTP-Referer': 'https://yourapp.com',  // Your app URL
  'X-Title': 'Your App Name',             // For analytics
}
```

### Provider Preferences

Force specific providers or allow fallbacks:

```env
# Prefer OpenAI's infrastructure
OPENROUTER_MODEL=openai/gpt-3.5-turbo

# Allow any provider for GPT-3.5
OPENROUTER_MODEL=gpt-3.5-turbo
```

## Switching Between Providers

### Using OpenRouter (Default)

```env
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your_key_here
```

### Using Ollama (Local)

```env
LLM_PROVIDER=ollama
# No API key needed
```

### Dynamic Switching

The application automatically configures based on `LLM_PROVIDER`:

```typescript
const llmProvider = configService.get('LLM_PROVIDER', 'openrouter');

if (llmProvider === 'openrouter') {
  // Use OpenRouter configuration
} else if (llmProvider === 'ollama') {
  // Use Ollama configuration
}
```

## Testing Your Setup

### 1. Verify Configuration

```bash
# Check environment variables
npm run env:check
```

### 2. Test LLM Connection

```bash
curl -X POST http://localhost:3000/api/workflows/execute \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "sample",
    "input": {
      "prompt": "Hello, what model are you?"
    }
  }'
```

### 3. Expected Response

```json
{
  "success": true,
  "result": {
    "response": "I am GPT-3.5 Turbo, running through OpenRouter...",
    "model": "openai/gpt-3.5-turbo",
    "usage": {
      "prompt_tokens": 15,
      "completion_tokens": 25,
      "total_tokens": 40
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Invalid API Key**

   - Error: `401 Unauthorized`
   - Solution: Check your API key at https://openrouter.ai/keys

2. **Insufficient Credits**

   - Error: `402 Payment Required`
   - Solution: Add credits at https://openrouter.ai/account

3. **Model Not Found**

   - Error: `404 Model not found`
   - Solution: Check model name at https://openrouter.ai/models

4. **Rate Limiting**
   - Error: `429 Too Many Requests`
   - Solution: Implement retry logic or upgrade plan

### Debug Mode

Enable debug logging:

```env
LANGGRAPH_DEBUG=true
```

This will log:

- Request details
- Response times
- Token usage
- Error details

## Best Practices

1. **Start with GPT-3.5**: Test with cheaper models first
2. **Set Max Tokens**: Prevent unexpectedly long responses
3. **Use Streaming**: For better UX with long responses
4. **Implement Retries**: Handle transient failures
5. **Monitor Costs**: Check usage dashboard regularly
6. **Cache Responses**: For repeated queries
7. **Use Appropriate Models**: Match model to task complexity

## Migration from Ollama

If migrating from Ollama to OpenRouter:

1. Change `LLM_PROVIDER` from `ollama` to `openrouter`
2. Add your `OPENROUTER_API_KEY`
3. Select a model with `OPENROUTER_MODEL`
4. Adjust parameters (temperature, max_tokens, etc.)
5. Test thoroughly before production deployment

## Support & Resources

- **OpenRouter Docs**: https://openrouter.ai/docs
- **Model Comparison**: https://openrouter.ai/models
- **API Reference**: https://openrouter.ai/api/v1/docs
- **Discord Community**: https://discord.gg/openrouter
- **Status Page**: https://status.openrouter.ai/

## Security Considerations

1. **Never commit API keys**: Use environment variables
2. **Rotate keys regularly**: Generate new keys periodically
3. **Use read-only keys**: For production if possible
4. **Set spending limits**: Prevent unexpected charges
5. **Monitor usage**: Set up alerts for unusual activity
