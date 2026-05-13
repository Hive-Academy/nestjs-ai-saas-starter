import { makeEnvironmentProviders } from '@angular/core';
import type { EnvironmentProviders } from '@angular/core';

import type { LangGraphConfig } from '../models/config.model';
import { LANGGRAPH_CONFIG } from '../models/config.model';
import { LangGraphSseService } from '../services/langgraph-sse.service';
import { LangGraphWorkflowStateService } from '../services/langgraph-workflow-state.service';
import { LangGraphStreamingService } from '../services/langgraph-streaming.service';
import { GenerativeUIRegistry } from '../gen-ui/generative-ui-registry.service';
import { LangGraphGenerativeUIService } from '../gen-ui/generative-ui.service';

/**
 * Provides all LangGraph Angular services and configuration.
 *
 * @remarks
 * This is the primary entry point for configuring the LangGraph Angular
 * library. It registers the `LANGGRAPH_CONFIG` injection token and all
 * five core services as environment providers.
 *
 * @param config - LangGraph configuration object
 * @returns EnvironmentProviders to add to the application's providers array
 *
 * @example
 * ```typescript
 * // In app.config.ts
 * import { provideLangGraph } from '@hive-academy/langgraph-angular';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideLangGraph({
 *       sseBaseUrl: '/api',
 *       tokenProvider: () => inject(AuthService).getSseTicket(),
 *       nodeIdMapper: (nodeId) => nodeId.split('/')[1] ?? null,
 *     }),
 *   ],
 * };
 * ```
 *
 * @public
 */
export function provideLangGraph(
  config: LangGraphConfig
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: LANGGRAPH_CONFIG, useValue: config },
    LangGraphSseService,
    LangGraphWorkflowStateService,
    LangGraphStreamingService,
    GenerativeUIRegistry,
    LangGraphGenerativeUIService,
  ]);
}
