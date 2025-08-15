import { Injectable, Logger } from '@nestjs/common';
import { PlatformClientService } from './platform-client.service';
import {
  Thread,
  CreateThreadRequest,
  UpdateThreadRequest,
  ThreadSearchParams,
  ThreadsSearchResponse,
  ThreadState,
  CopyThreadRequest,
} from '../interfaces/thread.interface';

/**
 * Service for managing LangGraph Platform Threads
 */
@Injectable()
export class ThreadService {
  private readonly logger = new Logger(ThreadService.name);

  constructor(private readonly client: PlatformClientService) {}

  /**
   * Create a new thread
   */
  async create(threadId?: string, request: CreateThreadRequest = {}): Promise<Thread> {
    const endpoint = threadId ? `/threads/${threadId}` : '/threads';
    this.logger.log(`Creating thread: ${threadId || 'auto-generated'}`);
    return this.client.put<Thread>(endpoint, request);
  }

  /**
   * Get thread by ID
   */
  async get(threadId: string): Promise<Thread> {
    return this.client.get<Thread>(`/threads/${threadId}`);
  }

  /**
   * Update thread metadata
   */
  async update(threadId: string, request: UpdateThreadRequest): Promise<Thread> {
    this.logger.log(`Updating thread: ${threadId}`);
    return this.client.patch<Thread>(`/threads/${threadId}`, request);
  }

  /**
   * Delete thread
   */
  async delete(threadId: string): Promise<void> {
    this.logger.log(`Deleting thread: ${threadId}`);
    await this.client.delete(`/threads/${threadId}`);
  }

  /**
   * Search threads
   */
  async search(params: ThreadSearchParams = {}): Promise<ThreadsSearchResponse> {
    return this.client.get<ThreadsSearchResponse>('/threads/search', params);
  }

  /**
   * Get thread state
   */
  async getState(threadId: string, checkpointId?: string): Promise<ThreadState> {
    const endpoint = checkpointId 
      ? `/threads/${threadId}/state/${checkpointId}`
      : `/threads/${threadId}/state`;
    return this.client.get<ThreadState>(endpoint);
  }

  /**
   * Update thread state
   */
  async updateState(
    threadId: string, 
    values: Record<string, unknown>,
    asNode?: string,
    checkpointId?: string
  ): Promise<ThreadState> {
    const params: Record<string, unknown> = { values };
    if (asNode) {params.as_node = asNode;}
    if (checkpointId) {params.checkpoint_id = checkpointId;}

    this.logger.log(`Updating thread state: ${threadId}`);
    return this.client.post<ThreadState>(`/threads/${threadId}/state`, params);
  }

  /**
   * Get thread history
   */
  async getHistory(
    threadId: string,
    limit?: number,
    before?: string,
    metadata?: Record<string, unknown>,
    checkpointNs?: string
  ): Promise<{ states: readonly ThreadState[] }> {
    const params: Record<string, unknown> = {};
    if (limit) {params.limit = limit;}
    if (before) {params.before = before;}
    if (metadata) {params.metadata = metadata;}
    if (checkpointNs) {params.checkpoint_ns = checkpointNs;}

    return this.client.get<{ states: readonly ThreadState[] }>(
      `/threads/${threadId}/history`,
      params
    );
  }

  /**
   * Copy thread
   */
  async copy(
    sourceThreadId: string,
    targetThreadId?: string,
    request: CopyThreadRequest = {}
  ): Promise<Thread> {
    const endpoint = targetThreadId 
      ? `/threads/${sourceThreadId}/copy/${targetThreadId}`
      : `/threads/${sourceThreadId}/copy`;
    
    this.logger.log(`Copying thread: ${sourceThreadId} -> ${targetThreadId || 'auto-generated'}`);
    return this.client.put<Thread>(endpoint, request);
  }

  /**
   * List all threads (convenience method)
   */
  async list(limit = 100, offset = 0): Promise<ThreadsSearchResponse> {
    return this.search({ limit, offset });
  }

  /**
   * Check if thread exists
   */
  async exists(threadId: string): Promise<boolean> {
    try {
      await this.get(threadId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get thread values (convenience method for current state values)
   */
  async getValues(threadId: string): Promise<Record<string, unknown>> {
    const state = await this.getState(threadId);
    return state.values;
  }
}