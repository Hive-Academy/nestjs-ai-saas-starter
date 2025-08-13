import { DynamicModule, Module, Provider } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import {
  PlatformModuleOptions,
  PlatformModuleAsyncOptions,
} from './interfaces/platform.interface';
import { PlatformClientService } from './services/platform-client.service';
import { AssistantService } from './services/assistant.service';
import { ThreadService } from './services/thread.service';
import { RunService } from './services/run.service';
import { WebhookService } from './services/webhook.service';
import { PLATFORM_MODULE_OPTIONS, DEFAULT_PLATFORM_OPTIONS } from './constants/platform.constants';

/**
 * LangGraph Platform module for NestJS
 * Provides services for interacting with LangGraph Platform API
 */
@Module({})
export class PlatformModule {
  static forRoot(options: PlatformModuleOptions = {}): DynamicModule {
    const mergedOptions = this.mergeWithDefaults(options);

    const providers: Provider[] = [
      {
        provide: PLATFORM_MODULE_OPTIONS,
        useValue: mergedOptions,
      },
      PlatformClientService,
      AssistantService,
      ThreadService,
      RunService,
      WebhookService,
    ];

    return {
      module: PlatformModule,
      imports: [HttpModule],
      providers,
      exports: [
        AssistantService,
        ThreadService,
        RunService,
        WebhookService,
        PlatformClientService,
      ],
      global: false,
    };
  }

  static forRootAsync(options: PlatformModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: PLATFORM_MODULE_OPTIONS,
        useFactory: async (...args: unknown[]) => {
          const moduleOptions = await options.useFactory!(...args);
          return this.mergeWithDefaults(moduleOptions);
        },
        inject: options.inject || [],
      },
      PlatformClientService,
      AssistantService,
      ThreadService,
      RunService,
      WebhookService,
    ];

    return {
      module: PlatformModule,
      imports: [HttpModule],
      providers,
      exports: [
        AssistantService,
        ThreadService,
        RunService,
        WebhookService,
        PlatformClientService,
      ],
      global: false,
    };
  }

  private static mergeWithDefaults(options: PlatformModuleOptions): PlatformModuleOptions {
    return {
      baseUrl: options.baseUrl || DEFAULT_PLATFORM_OPTIONS.baseUrl,
      apiKey: options.apiKey,
      timeout: options.timeout || DEFAULT_PLATFORM_OPTIONS.timeout,
      retryPolicy: {
        ...DEFAULT_PLATFORM_OPTIONS.retryPolicy,
        ...options.retryPolicy,
      },
      webhook: {
        ...DEFAULT_PLATFORM_OPTIONS.webhook,
        ...options.webhook,
        retryPolicy: {
          ...DEFAULT_PLATFORM_OPTIONS.webhook.retryPolicy,
          ...options.webhook?.retryPolicy,
        },
      },
    };
  }
}