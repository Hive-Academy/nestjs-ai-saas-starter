import { Injectable } from '@nestjs/common';
import { Agent } from '@hive-academy/langgraph-workflow-engine';

@Agent({
  description:
    'Generates high-level brand strategy using advanced analytics (Pro/Enterprise only)',
  tools: ['premium_analytics'],
  auth: {
    required: true,
    tiers: ['pro', 'enterprise'],
  },
})
@Injectable()
export class PremiumStrategyAgent {}
