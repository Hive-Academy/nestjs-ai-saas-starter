/**
 * Clean Neogma constants - no legacy baggage
 */

export const NEOGMA_TOKEN = Symbol('NEOGMA_TOKEN');
export const NEOGMA_OPTIONS_TOKEN = Symbol('NEOGMA_OPTIONS_TOKEN');
export const NEOGMA_MODEL_TOKEN = Symbol('NEOGMA_MODEL_TOKEN');

/**
 * Model token generator for dependency injection
 */
export const getNeogmaModelToken = 'NEOGMA_MODEL_TOKEN';
