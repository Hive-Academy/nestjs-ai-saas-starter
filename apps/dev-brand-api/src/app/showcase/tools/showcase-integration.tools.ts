import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool, ComposedTool } from '@hive-academy/langgraph-multi-agent';

/**
 * 🌐 SHOWCASE INTEGRATION TOOLS
 *
 * Demonstrates advanced @Tool features:
 * - External API integrations
 * - Composed tools that orchestrate multiple operations
 * - Error handling and retry logic
 * - Dynamic schema validation
 */
@Injectable()
export class ShowcaseIntegrationTools {
  private readonly logger = new Logger(ShowcaseIntegrationTools.name);

  @Tool({
    name: 'fetch_external_data',
    description:
      'Fetch data from external APIs with retry logic and error handling',
    schema: z.object({
      endpoint: z.string().url().describe('API endpoint URL'),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('GET'),
      headers: z.record(z.string()).optional().describe('HTTP headers'),
      body: z.any().optional().describe('Request body for POST/PUT'),
      timeout: z
        .number()
        .min(1000)
        .max(30000)
        .default(5000)
        .describe('Timeout in milliseconds'),
      retries: z
        .number()
        .min(0)
        .max(3)
        .default(2)
        .describe('Number of retries'),
    }),
    agents: ['advanced-showcase', 'streaming-showcase'],
    rateLimit: { requests: 20, window: 60000 }, // 20 requests per minute
    examples: [
      {
        input: {
          endpoint: 'https://jsonplaceholder.typicode.com/posts/1',
          method: 'GET',
        },
        output: {
          success: true,
          data: { id: 1, title: 'Example Post', body: '...' },
          metadata: { statusCode: 200, responseTime: 145 },
        },
        description: 'Fetch a sample blog post',
      },
    ],
    tags: ['integration', 'api', 'external'],
    version: '1.2.0',
  })
  async fetchExternalData({
    endpoint,
    method,
    headers = {},
    body,
    timeout,
    retries,
  }: {
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
    timeout: number;
    retries: number;
  }) {
    this.logger.debug(`Fetching data from ${endpoint} with ${method}`);

    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Simulate API call with potential failure
        const shouldFail = Math.random() < 0.2; // 20% failure rate for demonstration

        if (shouldFail && attempt < retries) {
          throw new Error(`Network error (attempt ${attempt + 1})`);
        }

        // Simulate response time
        await new Promise((resolve) =>
          setTimeout(resolve, 100 + Math.random() * 200)
        );

        const mockResponse = {
          success: true,
          data: this.generateMockResponseData(endpoint, method),
          metadata: {
            statusCode: 200,
            responseTime: Date.now() - startTime,
            attempt: attempt + 1,
            endpoint,
            method,
            timestamp: new Date().toISOString(),
          },
        };

        this.logger.debug(
          `Successfully fetched data from ${endpoint} in ${
            attempt + 1
          } attempts`
        );
        return mockResponse;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `Attempt ${attempt + 1} failed for ${endpoint}: ${lastError.message}`
        );

        if (attempt < retries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw new Error(
      `Failed to fetch data from ${endpoint} after ${
        retries + 1
      } attempts. Last error: ${lastError?.message}`
    );
  }

  @Tool({
    name: 'validate_json_schema',
    description:
      'Validate JSON data against a schema with detailed error reporting',
    schema: z.object({
      data: z.any().describe('JSON data to validate'),
      schema: z
        .object({
          type: z.string(),
          properties: z.record(z.any()).optional(),
          required: z.array(z.string()).optional(),
          additionalProperties: z.boolean().optional(),
        })
        .describe('JSON schema definition'),
      strict: z.boolean().default(false).describe('Strict validation mode'),
    }),
    agents: ['specialist-showcase', 'advanced-showcase'],
    examples: [
      {
        input: {
          data: { name: 'John', age: 30 },
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' },
            },
            required: ['name', 'age'],
          },
        },
        output: {
          valid: true,
          errors: [],
          data: { name: 'John', age: 30 },
        },
      },
    ],
    tags: ['validation', 'json', 'schema'],
    version: '1.0.0',
  })
  async validateJsonSchema({
    data,
    schema,
    strict,
  }: {
    data: any;
    schema: any;
    strict: boolean;
  }) {
    this.logger.debug(
      `Validating JSON data against schema (strict: ${strict})`
    );

    const errors: string[] = [];
    let valid = true;

    try {
      // Simple validation logic (in real implementation, use ajv or similar)
      if (schema.type === 'object' && typeof data !== 'object') {
        errors.push(`Expected object, got ${typeof data}`);
        valid = false;
      }

      if (schema.required && Array.isArray(schema.required)) {
        for (const field of schema.required) {
          if (!(field in data)) {
            errors.push(`Missing required field: ${field}`);
            valid = false;
          }
        }
      }

      if (schema.properties && typeof data === 'object') {
        for (const [key, value] of Object.entries(data)) {
          const propertySchema = schema.properties[key];
          if (propertySchema && propertySchema.type) {
            const expectedType = propertySchema.type;
            const actualType = typeof value;

            if (expectedType === 'number' && actualType !== 'number') {
              errors.push(`Field ${key}: expected number, got ${actualType}`);
              valid = false;
            } else if (expectedType === 'string' && actualType !== 'string') {
              errors.push(`Field ${key}: expected string, got ${actualType}`);
              valid = false;
            }
          } else if (strict && !schema.additionalProperties) {
            errors.push(`Unexpected field in strict mode: ${key}`);
            valid = false;
          }
        }
      }
    } catch (error) {
      errors.push(
        `Validation error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      valid = false;
    }

    return {
      valid,
      errors,
      data: valid ? data : null,
      metadata: {
        strict,
        schemaType: schema.type,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    };
  }

  @ComposedTool({
    name: 'fetch_and_validate_data',
    description:
      'Fetch data from external API and validate it against a schema',
    components: ['fetch_external_data', 'validate_json_schema'],
    strategy: 'sequential',
    agents: ['advanced-showcase'],
    schema: z.object({
      endpoint: z.string().url(),
      schema: z.object({
        type: z.string(),
        properties: z.record(z.any()).optional(),
        required: z.array(z.string()).optional(),
      }),
      method: z.enum(['GET', 'POST']).default('GET'),
      strict: z.boolean().default(true),
    }),
    examples: [
      {
        input: {
          endpoint: 'https://api.example.com/user/123',
          schema: {
            type: 'object',
            properties: { id: { type: 'number' }, name: { type: 'string' } },
            required: ['id', 'name'],
          },
        },
        output: {
          success: true,
          data: { id: 123, name: 'John Doe' },
          validation: { valid: true, errors: [] },
        },
      },
    ],
    tags: ['composed', 'integration', 'validation'],
    version: '1.0.0',
  })
  async fetchAndValidateData({
    endpoint,
    schema,
    method,
    strict,
  }: {
    endpoint: string;
    schema: any;
    method: 'GET' | 'POST';
    strict: boolean;
  }) {
    this.logger.debug(
      `Executing composed tool: fetch and validate from ${endpoint}`
    );

    // Step 1: Fetch data
    const fetchResult = await this.fetchExternalData({
      endpoint,
      method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
      retries: 2,
    });

    if (!fetchResult.success) {
      return {
        success: false,
        error: 'Failed to fetch data',
        fetchResult,
        validation: null,
      };
    }

    // Step 2: Validate data
    const validationResult = await this.validateJsonSchema({
      data: fetchResult.data,
      schema,
      strict,
    });

    return {
      success: fetchResult.success && validationResult.valid,
      data: validationResult.valid ? validationResult.data : null,
      fetchResult: {
        metadata: fetchResult.metadata,
        success: fetchResult.success,
      },
      validation: validationResult,
      metadata: {
        composedTool: true,
        strategy: 'sequential',
        steps: ['fetch_external_data', 'validate_json_schema'],
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Tool({
    name: 'simulate_webhook_processing',
    description: 'Simulate processing webhook payloads with event handling',
    schema: z.object({
      event: z.string().describe('Webhook event type'),
      payload: z.any().describe('Webhook payload data'),
      signature: z
        .string()
        .optional()
        .describe('Webhook signature for verification'),
      processingRules: z
        .array(
          z.object({
            condition: z.string(),
            action: z.string(),
          })
        )
        .default([])
        .describe('Processing rules to apply'),
    }),
    agents: ['streaming-showcase', 'advanced-showcase'],
    streaming: true,
    tags: ['webhook', 'events', 'processing'],
    version: '1.0.0',
  })
  async *simulateWebhookProcessing({
    event,
    payload,
    signature,
    processingRules,
  }: {
    event: string;
    payload: any;
    signature?: string;
    processingRules: Array<{ condition: string; action: string }>;
  }) {
    yield {
      stage: 'received',
      message: `Webhook received: ${event}`,
      timestamp: new Date().toISOString(),
    };

    // Simulate signature verification
    if (signature) {
      yield {
        stage: 'verification',
        message: 'Verifying webhook signature...',
        timestamp: new Date().toISOString(),
      };

      await new Promise((resolve) => setTimeout(resolve, 300));

      yield {
        stage: 'verified',
        message: 'Signature verification successful',
        timestamp: new Date().toISOString(),
      };
    }

    // Process payload
    yield {
      stage: 'processing',
      message: 'Processing webhook payload...',
      payload: { event, size: JSON.stringify(payload).length },
      timestamp: new Date().toISOString(),
    };

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Apply processing rules
    for (let i = 0; i < processingRules.length; i++) {
      const rule = processingRules[i];
      yield {
        stage: 'rule_processing',
        message: `Applying rule ${i + 1}: ${rule.condition} → ${rule.action}`,
        rule,
        timestamp: new Date().toISOString(),
      };

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return {
      stage: 'completed',
      message: 'Webhook processing completed successfully',
      result: {
        event,
        processed: true,
        rulesApplied: processingRules.length,
        payloadSize: JSON.stringify(payload).length,
        duration: processingRules.length * 200 + 800,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate mock response data for demonstration
   */
  private generateMockResponseData(endpoint: string, method: string): any {
    if (endpoint.includes('posts')) {
      return {
        id: Math.floor(Math.random() * 100) + 1,
        title: 'Showcase Blog Post',
        body: 'This is a demonstration of our tool integration capabilities.',
        userId: Math.floor(Math.random() * 10) + 1,
      };
    }

    if (endpoint.includes('users')) {
      return {
        id: Math.floor(Math.random() * 100) + 1,
        name: `User ${Math.floor(Math.random() * 1000)}`,
        email: `user${Math.floor(Math.random() * 1000)}@example.com`,
        role: ['admin', 'user', 'moderator'][Math.floor(Math.random() * 3)],
      };
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      method,
      endpoint,
      data: `Mock response for ${method} ${endpoint}`,
    };
  }
}
