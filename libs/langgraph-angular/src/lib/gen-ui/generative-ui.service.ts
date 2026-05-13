import { Injectable, Type, inject } from '@angular/core';

import { GenerativeUIRegistry } from './generative-ui-registry.service';
import type { GeneratedComponent, GenerativeUIState } from './gen-ui.models';

/**
 * High-level service for bulk component registration and rendering
 * components from LangGraph agent workflow state.
 *
 * @remarks
 * This service bridges LangGraph workflow state (which contains
 * serializable component descriptors) with Angular's component system.
 * Agents emit a `generativeUI` field in their state, and this service
 * maps those descriptors to registered Angular component classes.
 *
 * Provided via `provideLangGraph()` -- NOT `providedIn: 'root'`.
 *
 * @example
 * ```typescript
 * const genUI = inject(LangGraphGenerativeUIService);
 *
 * // Register available components at app startup
 * genUI.registerComponents({
 *   'weather-card': WeatherCardComponent,
 *   'stock-chart': StockChartComponent,
 * });
 *
 * // Later, when agent state arrives:
 * const rendered = genUI.renderFromAgentState(agentState);
 * // rendered is GeneratedComponent[] ready for <lg-dynamic>
 * ```
 *
 * @public
 */
@Injectable()
export class LangGraphGenerativeUIService {
  private readonly registry = inject(GenerativeUIRegistry);

  /**
   * Bulk register multiple components by name.
   *
   * @param components - Map of component name to Angular component class
   */
  registerComponents(components: Record<string, Type<unknown>>): void {
    for (const [name, component] of Object.entries(components)) {
      this.registry.register(name, component);
    }
  }

  /**
   * Map workflow state to renderable components using the registry.
   *
   * @remarks
   * Extracts the `generativeUI` field from the state object, then
   * resolves each component descriptor against the registry. Components
   * whose `type` is not registered are skipped with a console warning,
   * ensuring graceful degradation when agents reference unknown components.
   *
   * @param state - Workflow state object containing an optional `generativeUI` field
   * @returns Array of {@link GeneratedComponent} ready for {@link LgDynamicComponent}
   */
  renderFromAgentState(state: unknown): GeneratedComponent[] {
    const uiState = this.extractUIState(state);
    if (!uiState) {
      return [];
    }

    return uiState.components
      .map((def) => {
        const component = this.registry.get(def.type);
        if (!component) {
          console.warn(
            `[LangGraphGenerativeUI] Component "${def.type}" not found in registry. ` +
              `Registered: [${this.registry
                .getRegisteredNames()
                .join(', ')}]. Skipping.`
          );
          return null;
        }
        const generated: GeneratedComponent = {
          id: def.id,
          component,
          inputs: def.props,
          ...(def.events ? { outputs: def.events } : {}),
        };
        return generated;
      })
      .filter((c): c is GeneratedComponent => c !== null);
  }

  /**
   * Extract the generativeUI field from an unknown state object.
   *
   * @param state - Raw workflow state
   * @returns The parsed GenerativeUIState, or null if not present
   */
  private extractUIState(state: unknown): GenerativeUIState | null {
    if (
      typeof state === 'object' &&
      state !== null &&
      'generativeUI' in state
    ) {
      const candidate = (state as Record<string, unknown>)['generativeUI'];
      if (
        typeof candidate === 'object' &&
        candidate !== null &&
        'components' in candidate &&
        Array.isArray((candidate as Record<string, unknown>)['components'])
      ) {
        return candidate as GenerativeUIState;
      }
    }
    return null;
  }
}
