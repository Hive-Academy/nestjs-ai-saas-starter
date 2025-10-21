import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { PlatformModuleOptions } from '../interfaces/platform.interface';
import { PLATFORM_MODULE_OPTIONS } from '../constants/platform.constants';

/**
 * Base HTTP client for LangGraph Platform API
 */
@Injectable()
export class PlatformClientService {
  private readonly logger = new Logger(PlatformClientService.name);

  constructor(
    @Inject(PLATFORM_MODULE_OPTIONS)
    private readonly options: PlatformModuleOptions,
    private readonly httpService: HttpService
  ) {}

  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.options.baseUrl}${endpoint}`, {
          headers: this.getHeaders(),
          params,
          timeout: this.options.timeout || 30000,
        })
      );
      return response.data;
    } catch (error) {
      this.logger.error(`GET ${endpoint} failed:`, error);
      throw this.handleError(error);
    }
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.options.baseUrl}${endpoint}`, data, {
          headers: this.getHeaders(),
          timeout: this.options.timeout || 30000,
        })
      );
      return response.data;
    } catch (error) {
      this.logger.error(`POST ${endpoint} failed:`, error);
      throw this.handleError(error);
    }
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.put(`${this.options.baseUrl}${endpoint}`, data, {
          headers: this.getHeaders(),
          timeout: this.options.timeout || 30000,
        })
      );
      return response.data;
    } catch (error) {
      this.logger.error(`PUT ${endpoint} failed:`, error);
      throw this.handleError(error);
    }
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.options.baseUrl}${endpoint}`, data, {
          headers: this.getHeaders(),
          timeout: this.options.timeout || 30000,
        })
      );
      return response.data;
    } catch (error) {
      this.logger.error(`PATCH ${endpoint} failed:`, error);
      throw this.handleError(error);
    }
  }

  async delete<T>(endpoint: string): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${this.options.baseUrl}${endpoint}`, {
          headers: this.getHeaders(),
          timeout: this.options.timeout || 30000,
        })
      );
      return response.data;
    } catch (error) {
      this.logger.error(`DELETE ${endpoint} failed:`, error);
      throw this.handleError(error);
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'NestJS-LangGraph-Platform/1.0.0',
    };

    if (this.options.apiKey) {
      headers.Authorization = `Bearer ${this.options.apiKey}`;
    }

    return headers;
  }

  private handleError(error: unknown): Error {
    if (error && typeof error === 'object' && 'response' in error) {
      const httpError = error as {
        response: {
          status: number;
          data?: { error?: string; message?: string };
        };
      };
      const { status } = httpError.response;
      const { data } = httpError.response;
      const message = data?.message || data?.error || `HTTP ${status} error`;
      return new Error(`Platform API error (${status}): ${message}`);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error(`Unknown platform error: ${String(error)}`);
  }
}
