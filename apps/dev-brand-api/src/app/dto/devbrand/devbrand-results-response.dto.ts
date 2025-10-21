import { ApiProperty } from '@nestjs/swagger';

/**
 * DevBrand Results Response DTO
 *
 * Response schema for final workflow results.
 * Contains achievements, strategy, content, and execution metrics.
 */
export class DevBrandResultsResponseDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  githubUsername!: string;

  @ApiProperty()
  achievements!: Array<{
    id: string;
    description: string;
    technologies: string[];
    impact: 'low' | 'medium' | 'high';
    repository: string;
    date: string;
  }>;

  @ApiProperty()
  strategy!: {
    positioning: string;
    targetAudience: string[];
    uniqueValue: string;
    recommendations: string[];
  };

  @ApiProperty()
  content!: {
    linkedin: {
      post: string;
      engagement: {
        predicted: number;
        hashtags: string[];
      };
    };
    devto: {
      article: string;
      engagement: {
        predicted: number;
        tags: string[];
      };
    };
  };

  @ApiProperty()
  confidence!: number;

  @ApiProperty()
  executionMetrics!: {
    totalDuration: number;
    agentDurations: Record<string, number>;
    interruptionsCount: number;
    retries: number;
  };
}
