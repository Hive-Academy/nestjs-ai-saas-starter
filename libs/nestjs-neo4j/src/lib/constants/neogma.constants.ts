/**
 * Clean Neogma constants - no legacy baggage
 */

export const NEOGMA_TOKEN = Symbol('NEOGMA_TOKEN');
export const NEOGMA_OPTIONS_TOKEN = Symbol('NEOGMA_OPTIONS_TOKEN');
export const NEOGMA_MODEL_TOKEN = Symbol('NEOGMA_MODEL_TOKEN');

/**
 * Model token generator for dependency injection
 */
export function getNeogmaModelToken(modelName: string): string {
  return `NEOGMA_MODEL_${modelName.toUpperCase()}`;
}