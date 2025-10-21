import { Injectable, Logger } from '@nestjs/common';
import { PlatformClientService } from './platform-client.service';
import {
  Webhook,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhooksSearchResponse,
} from '../interfaces/webhook.interface';

/**
 * Service for managing LangGraph Platform Webhooks
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly client: PlatformClientService) {}

  /**
   * Create a new webhook
   */
  async create(request: CreateWebhookRequest): Promise<Webhook> {
    this.logger.log(`Creating webhook: ${request.url}`);
    return this.client.post<Webhook>('/webhooks', request);
  }

  /**
   * Get webhook by ID
   */
  async get(webhookId: string): Promise<Webhook> {
    return this.client.get<Webhook>(`/webhooks/${webhookId}`);
  }

  /**
   * Update webhook
   */
  async update(
    webhookId: string,
    request: UpdateWebhookRequest
  ): Promise<Webhook> {
    this.logger.log(`Updating webhook: ${webhookId}`);
    return this.client.patch<Webhook>(`/webhooks/${webhookId}`, request);
  }

  /**
   * Delete webhook
   */
  async delete(webhookId: string): Promise<void> {
    this.logger.log(`Deleting webhook: ${webhookId}`);
    await this.client.delete(`/webhooks/${webhookId}`);
  }

  /**
   * List all webhooks
   */
  async list(): Promise<WebhooksSearchResponse> {
    return this.client.get<WebhooksSearchResponse>('/webhooks');
  }

  /**
   * Test webhook delivery
   */
  async test(
    webhookId: string
  ): Promise<{ success: boolean; message?: string }> {
    this.logger.log(`Testing webhook: ${webhookId}`);
    return this.client.post<{ success: boolean; message?: string }>(
      `/webhooks/${webhookId}/test`
    );
  }

  /**
   * Check if webhook exists
   */
  async exists(webhookId: string): Promise<boolean> {
    try {
      await this.get(webhookId);
      return true;
    } catch (error) {
      return false;
    }
  }
}
