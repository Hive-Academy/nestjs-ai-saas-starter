import { Logger } from '@nestjs/common';
import type { HttpClientOptions } from '../../interfaces/config/module-options.interface';

/**
 * HTTP client utility with retry logic and timeout support
 */
export class HttpClient {
  private readonly logger = new Logger('HttpClient');
  private readonly options: Required<HttpClientOptions>;

  constructor(options: HttpClientOptions = {}) {
    this.options = {
      timeout: options.timeout ?? 30000,
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      retryBackoffFactor: options.retryBackoffFactor ?? 2,
    };
  }

  /**
   * Make HTTP request with retry logic and timeout
   */
  async fetch(
    url: string,
    init: RequestInit = {},
    context?: string
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.options.timeout
    );

    const requestInit: RequestInit = {
      ...init,
      signal: controller.signal,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateRetryDelay(attempt);
          this.logger.debug(
            `Retrying request (attempt ${attempt}/${this.options.maxRetries}) after ${delay}ms`,
            { url, context }
          );
          await this.sleep(delay);
        }

        const response = await fetch(url, requestInit);
        clearTimeout(timeoutId);

        if (attempt > 0) {
          this.logger.log(`Request succeeded on attempt ${attempt + 1}`, {
            url,
            context,
          });
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof Error && error.name === 'AbortError') {
          clearTimeout(timeoutId);
          throw new Error(
            `Request timeout after ${this.options.timeout}ms: ${url}`
          );
        }

        if (attempt === this.options.maxRetries) {
          clearTimeout(timeoutId);
          this.logger.error(
            `Request failed after ${this.options.maxRetries + 1} attempts`,
            { url, context, error: lastError.message }
          );
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          clearTimeout(timeoutId);
          this.logger.warn(
            `Non-retryable error encountered, stopping retries`,
            { url, context, error: lastError.message }
          );
          break;
        }

        this.logger.warn(
          `Request failed on attempt ${attempt + 1}, will retry`,
          { url, context, error: lastError.message }
        );
      }
    }

    clearTimeout(timeoutId);
    throw lastError || new Error('Request failed after all retry attempts');
  }

  /**
   * Make POST request with JSON body
   */
  async postJson<T = any>(
    url: string,
    body: any,
    headers: Record<string, string> = {},
    context?: string
  ): Promise<T> {
    const response = await this.fetch(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
      },
      context
    );

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorBody = await response.text();
        if (errorBody) {
          errorMessage += ` - ${errorBody}`;
        }
      } catch {
        // Ignore if we can't read the error body
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data as T;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    return (
      this.options.retryDelay *
      Math.pow(this.options.retryBackoffFactor, attempt - 1)
    );
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    // Network errors, timeouts, and 5xx errors are retryable
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /fetch/i,
      /connection/i,
      /ECONNRESET/i,
      /ENOTFOUND/i,
      /ETIMEDOUT/i,
    ];

    return retryablePatterns.some((pattern) => pattern.test(error.message));
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get configuration info
   */
  getOptions(): Required<HttpClientOptions> {
    return { ...this.options };
  }
}

/**
 * Input validation utility
 */
export class InputValidator {
  private readonly logger = new Logger('InputValidator');

  /**
   * Validate text inputs for embedding
   */
  validateTexts(
    texts: string[],
    options: {
      maxTextLength?: number;
      maxBatchSize?: number;
      allowEmpty?: boolean;
    } = {}
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const {
      maxTextLength = 8000,
      maxBatchSize = 100,
      allowEmpty = false,
    } = options;

    // Check for empty array
    if (texts.length === 0) {
      if (!allowEmpty) {
        errors.push('Text array cannot be empty');
      }
      return { isValid: errors.length === 0, errors };
    }

    // Check batch size
    if (texts.length > maxBatchSize) {
      errors.push(`Batch size ${texts.length} exceeds maximum ${maxBatchSize}`);
    }

    // Validate individual texts
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];

      if (typeof text !== 'string') {
        errors.push(`Text at index ${i} is not a string`);
        continue;
      }

      if (text.trim().length === 0) {
        errors.push(`Text at index ${i} is empty or only whitespace`);
        continue;
      }

      if (text.length > maxTextLength) {
        errors.push(
          `Text at index ${i} exceeds maximum length ${maxTextLength}`
        );
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate API key format
   */
  validateApiKey(
    apiKey: string,
    provider: string,
    required = true
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!apiKey || apiKey.trim().length === 0) {
      if (required) {
        errors.push(`API key is required for ${provider} provider`);
      }
      return { isValid: errors.length === 0, errors };
    }

    // Basic format validation based on provider
    switch (provider.toLowerCase()) {
      case 'openai':
        if (!apiKey.startsWith('sk-')) {
          errors.push('OpenAI API key should start with "sk-"');
        }
        if (apiKey.length < 40) {
          errors.push('OpenAI API key appears to be too short');
        }
        break;
      case 'cohere':
        if (apiKey.length < 32) {
          errors.push('Cohere API key appears to be too short');
        }
        break;
      case 'huggingface':
        if (!apiKey.startsWith('hf_')) {
          errors.push('HuggingFace API key should start with "hf_"');
        }
        break;
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Log validation warning if configured
   */
  logValidationWarning(message: string, context?: any): void {
    this.logger.warn(message, context);
  }
}
