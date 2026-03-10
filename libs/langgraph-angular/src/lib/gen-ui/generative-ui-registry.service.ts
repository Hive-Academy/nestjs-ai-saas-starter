import { Injectable, Type } from '@angular/core';

/**
 * Registry for Angular components that can be dynamically rendered
 * by LangGraph agents via generative UI.
 *
 * @remarks
 * Components are registered by a string name that agents reference
 * in their workflow state. This decouples agent logic from Angular
 * component classes, allowing agents to declaratively specify UI
 * without importing Angular code.
 *
 * Provided via `provideLangGraph()` -- NOT `providedIn: 'root'`.
 *
 * @example
 * ```typescript
 * const registry = inject(GenerativeUIRegistry);
 * registry.register('weather-card', WeatherCardComponent);
 * registry.register('stock-chart', StockChartComponent);
 *
 * const comp = registry.get('weather-card');
 * // comp === WeatherCardComponent
 * ```
 *
 * @public
 */
@Injectable()
export class GenerativeUIRegistry {
  private readonly registry = new Map<string, Type<unknown>>();

  /**
   * Register a component by name.
   *
   * @param name - Unique component identifier used by agents to reference this component
   * @param component - Angular component class to associate with the name
   */
  register(name: string, component: Type<unknown>): void {
    this.registry.set(name, component);
  }

  /**
   * Retrieve a registered component by name.
   *
   * @param name - The component identifier to look up
   * @returns The component class, or `undefined` if not registered
   */
  get(name: string): Type<unknown> | undefined {
    return this.registry.get(name);
  }

  /**
   * Check if a component is registered under the given name.
   *
   * @param name - The component identifier to check
   * @returns `true` if a component is registered with this name
   */
  has(name: string): boolean {
    return this.registry.has(name);
  }

  /**
   * Get all registered component names.
   *
   * @returns Array of registered component name strings
   */
  getRegisteredNames(): string[] {
    return Array.from(this.registry.keys());
  }
}
