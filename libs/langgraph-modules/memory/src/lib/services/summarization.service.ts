import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { MemorySummarizationOptions } from '../interfaces/memory.interface';

/**
 * Service for conversation summarization using LLM providers
 * Follows Single Responsibility Principle - only handles summarization
 */
@Injectable()
export class SummarizationService {
  private readonly logger = new Logger(SummarizationService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Create summary using LLM
   */
  public async createSummary(
    messages: readonly BaseMessage[],
    options?: MemorySummarizationOptions
  ): Promise<string> {
    if (!messages.length) {
      return 'No messages to summarize.';
    }

    const strategy = options?.strategy ?? 'progressive';
    const maxMessages = options?.maxMessages ?? 50;

    this.logger.debug(`Creating summary for ${messages.length} messages using ${strategy} strategy`);

    try {
      switch (strategy) {
        case 'progressive':
          return await this.progressiveSummarization(messages, maxMessages, options);
        case 'batch':
          return await this.batchSummarization(messages, options);
        case 'sliding-window':
          return await this.slidingWindowSummarization(messages, maxMessages, options);
        default:
          return await this.progressiveSummarization(messages, maxMessages, options);
      }
    } catch (error) {
      // Use safe error extraction to satisfy strict lint rules
      const err = error as { message?: unknown; stack?: unknown } | undefined;
      const message = typeof err?.message === 'string' ? err?.message : 'Unknown error';
      this.logger.error(`Summarization failed: ${message}`);
      // Fallback to simple summary if LLM fails
      return this.createFallbackSummary(messages);
    }
  }

  /**
   * Progressive summarization strategy - summarize in chunks
   */
  private async progressiveSummarization(
    messages: readonly BaseMessage[],
    maxMessages: number,
    options?: MemorySummarizationOptions
  ): Promise<string> {
    if (messages.length <= maxMessages) {
      return await this.generateLLMSummary(messages, options);
    }

    const chunks: string[] = [];
    for (let i = 0; i < messages.length; i += maxMessages) {
      const chunk = messages.slice(i, i + maxMessages);
      const chunkSummary = await this.generateLLMSummary(chunk, options);
      chunks.push(chunkSummary);
    }

    // If we have multiple chunk summaries, summarize them too
    if (chunks.length > 1) {
  const combinedSummary = chunks.join('\n\n');
      return await this.generateLLMSummary(
        [new HumanMessage(combinedSummary)],
        { ...options, customPrompt: 'Consolidate these summaries into a single coherent summary:' }
      );
    }

    return chunks[0];
  }

  /**
   * Batch summarization strategy - summarize all at once
   */
  private async batchSummarization(
    messages: readonly BaseMessage[],
    options?: MemorySummarizationOptions
  ): Promise<string> {
    return await this.generateLLMSummary(messages, options);
  }

  /**
   * Sliding window summarization strategy
   */
  private async slidingWindowSummarization(
    messages: readonly BaseMessage[],
    windowSize: number,
    options?: MemorySummarizationOptions
  ): Promise<string> {
    if (messages.length <= windowSize) {
      return await this.generateLLMSummary(messages, options);
    }

    // Keep recent messages and summarize older ones
    const recentMessages = messages.slice(-windowSize);
    const olderMessages = messages.slice(0, -windowSize);

    const olderSummary = await this.generateLLMSummary(olderMessages, {
      ...options,
      customPrompt: 'Summarize this earlier part of the conversation:'
    });

    const recentSummary = await this.generateLLMSummary(recentMessages, {
      ...options,
      customPrompt: 'Summarize this recent part of the conversation:'
    });

    return `Previous context: ${olderSummary}\n\nRecent conversation: ${recentSummary}`;
  }

  /**
   * Generate summary using LLM API
   */
  private async generateLLMSummary(
    messages: readonly BaseMessage[],
    options?: MemorySummarizationOptions
  ): Promise<string> {
    const provider = this.configService.get<string>('memory.summarization.provider', 'openai');

    switch (provider) {
      case 'openai':
        return await this.generateOpenAISummary(messages, options);
      case 'anthropic':
        return await this.generateAnthropicSummary(messages, options);
      case 'cohere':
        return await this.generateCohereSummary(messages, options);
      default:
        throw new Error(`Unsupported summarization provider: ${provider}`);
    }
  }

  /**
   * Generate summary using OpenAI
   */
  private async generateOpenAISummary(
    messages: readonly BaseMessage[],
    options?: MemorySummarizationOptions
  ): Promise<string> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const conversationText = this.formatMessagesForSummary(messages, options?.preserveImportant);
    const prompt = options?.customPrompt ?? this.getDefaultSummarizationPrompt();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.configService.get<string>('memory.summarization.model', 'gpt-3.5-turbo'),
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: conversationText
          }
        ],
        max_tokens: this.configService.get<number>('memory.summarization.maxTokens', 500),
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const errorData = (await response.json()) as { error?: { message?: string } };
        errorMessage = errorData?.error?.message ?? errorMessage;
      } catch {
        // ignore JSON parse errors
        try {
          errorMessage = await response.text();
        } catch {
          // ignore
        }
      }
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim?.() ?? '';
  }

  /**
   * Generate summary using Anthropic Claude
   */
  private async generateAnthropicSummary(
    messages: readonly BaseMessage[],
    options?: MemorySummarizationOptions
  ): Promise<string> {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const conversationText = this.formatMessagesForSummary(messages, options?.preserveImportant);
    const prompt = options?.customPrompt ?? this.getDefaultSummarizationPrompt();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.configService.get<string>('memory.summarization.model', 'claude-3-haiku-20240307'),
        max_tokens: this.configService.get<number>('memory.summarization.maxTokens', 500),
        messages: [
          {
            role: 'user',
            content: `${prompt}\n\n${conversationText}`
          }
        ],
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const errorData = (await response.json()) as { error?: { message?: string } };
        errorMessage = errorData?.error?.message ?? errorMessage;
      } catch {
        try {
          errorMessage = await response.text();
        } catch {
          // ignore
        }
      }
      throw new Error(`Anthropic API error: ${errorMessage}`);
    }

    const data = (await response.json()) as { content: Array<{ text?: string }> };
    const text = data.content?.[0]?.text ?? '';
    return typeof text === 'string' ? text.trim() : '';
  }

  /**
   * Generate summary using Cohere
   */
  private async generateCohereSummary(
    messages: readonly BaseMessage[],
    options?: MemorySummarizationOptions
  ): Promise<string> {
    const apiKey = this.configService.get<string>('COHERE_API_KEY');
    if (!apiKey) {
      throw new Error('Cohere API key not configured');
    }

    const conversationText = this.formatMessagesForSummary(messages, options?.preserveImportant);

    const response = await fetch('https://api.cohere.ai/v1/summarize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: conversationText,
        length: 'medium',
        format: 'paragraph',
        model: this.configService.get<string>('memory.summarization.model', 'summarize-xlarge'),
        additional_command: options?.customPrompt,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const errorData = (await response.json()) as { message?: string };
        errorMessage = errorData?.message ?? errorMessage;
      } catch {
        try {
          errorMessage = await response.text();
        } catch {
          // ignore
        }
      }
      throw new Error(`Cohere API error: ${errorMessage}`);
    }

    const data = (await response.json()) as { summary?: string };
    return data.summary?.trim?.() ?? '';
  }

  /**
   * Format messages for summarization
   */
  private formatMessagesForSummary(
    messages: readonly BaseMessage[],
    preserveImportant?: boolean
  ): string {
    return messages
      .filter(msg => {
        if (preserveImportant && msg instanceof SystemMessage) {
          return false; // Skip system messages if preserving important ones
        }
        return true;
      })
      .map(msg => {
        const text = this.normalizeMessageContent(msg);
        if (msg instanceof HumanMessage) {
          return `User: ${text}`;
        } else if (msg instanceof AIMessage) {
          return `Assistant: ${text}`;
        } else if (msg instanceof SystemMessage) {
          return `System: ${text}`;
        }
        return `Message: ${text}`;
      })
      .join('\n');
  }

  /**
   * Get default summarization prompt
   */
  private getDefaultSummarizationPrompt(): string {
    return `Please provide a concise summary of the following conversation. Focus on:
1. Key topics discussed
2. Important decisions or conclusions reached
3. Action items or next steps mentioned
4. Main questions asked and answered

Keep the summary informative but brief, capturing the essential context that would be useful for continuing the conversation later.`;
  }

  /**
   * Create fallback summary when LLM is unavailable
   */
  private createFallbackSummary(messages: readonly BaseMessage[]): string {
    const messageCount = messages.length;
    const userMessages = messages.filter(m => m instanceof HumanMessage).length;
    const aiMessages = messages.filter(m => m instanceof AIMessage).length;

    const recentMessages = messages.slice(-3).map(msg => {
      const type = msg instanceof HumanMessage ? 'User' :
                   msg instanceof AIMessage ? 'Assistant' : 'System';
      const text = this.normalizeMessageContent(msg);
      const preview = text.substring(0, 100);
      return `${type}: ${preview}${text.length > 100 ? '...' : ''}`;
    });

    return `Conversation summary (${messageCount} messages total, ${userMessages} from user, ${aiMessages} from assistant):\n\nRecent messages:\n${recentMessages.join('\n')}`;
  }

  /**
   * Normalize LangChain Message content to a plain string for safe logging/templating
   */
  private normalizeMessageContent(msg: BaseMessage): string {
    const c = (msg as { content?: unknown }).content;
    if (typeof c === 'string') {
      return c;
    }
    // Some LangChain Message.content can be arrays of content blocks
    if (Array.isArray(c)) {
      return c
        .map((part) =>
          typeof part === 'string'
            ? part
            : typeof part === 'object' && part && 'text' in part && typeof (part).text === 'string'
              ? (part).text
              : ''
        )
        .filter(Boolean)
        .join(' ');
    }
    if (c && typeof c === 'object') {
      try {
        return JSON.stringify(c);
      } catch {
        return '';
      }
    }
    return '';
  }
}
