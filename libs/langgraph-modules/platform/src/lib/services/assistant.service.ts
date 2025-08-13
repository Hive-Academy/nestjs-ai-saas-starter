import { Injectable, Logger } from '@nestjs/common';
import { PlatformClientService } from './platform-client.service';
import {
  Assistant,
  CreateAssistantRequest,
  UpdateAssistantRequest,
  AssistantSearchParams,
  AssistantsSearchResponse,
} from '../interfaces/assistant.interface';

/**
 * Service for managing LangGraph Platform Assistants
 */
@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(private readonly client: PlatformClientService) {}

  /**
   * Create a new assistant
   */
  async create(request: CreateAssistantRequest): Promise<Assistant> {
    this.logger.log(`Creating assistant: ${request.name}`);
    return this.client.post<Assistant>('/assistants', request);
  }

  /**
   * Get assistant by ID
   */
  async get(assistantId: string): Promise<Assistant> {
    return this.client.get<Assistant>(`/assistants/${assistantId}`);
  }

  /**
   * Update assistant
   */
  async update(assistantId: string, request: UpdateAssistantRequest): Promise<Assistant> {
    this.logger.log(`Updating assistant: ${assistantId}`);
    return this.client.patch<Assistant>(`/assistants/${assistantId}`, request);
  }

  /**
   * Delete assistant
   */
  async delete(assistantId: string): Promise<void> {
    this.logger.log(`Deleting assistant: ${assistantId}`);
    await this.client.delete(`/assistants/${assistantId}`);
  }

  /**
   * Search assistants
   */
  async search(params: AssistantSearchParams = {}): Promise<AssistantsSearchResponse> {
    return this.client.get<AssistantsSearchResponse>('/assistants/search', params);
  }

  /**
   * List all assistants (convenience method)
   */
  async list(limit = 100, offset = 0): Promise<AssistantsSearchResponse> {
    return this.search({ limit, offset });
  }

  /**
   * Get assistants by graph ID
   */
  async getByGraphId(graphId: string): Promise<AssistantsSearchResponse> {
    return this.search({ graph_id: graphId });
  }

  /**
   * Check if assistant exists
   */
  async exists(assistantId: string): Promise<boolean> {
    try {
      await this.get(assistantId);
      return true;
    } catch (error) {
      return false;
    }
  }
}