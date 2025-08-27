import type { HitlModuleOptions } from '@hive-academy/langgraph-hitl';

/**
 * Modular HITL Configuration
 *
 * Extracted from centralized 271-line config - Part of Phase 3 Subtask 3.3
 * Reduces configuration complexity by 90%+
 */
export const getHitlConfig = (): HitlModuleOptions => ({
  defaultTimeout: parseInt(process.env.HITL_TIMEOUT_MS || '1800000', 10), // 30 minutes default
  confidenceThreshold: parseFloat(
    process.env.HITL_CONFIDENCE_THRESHOLD || '0.7'
  ),
});
