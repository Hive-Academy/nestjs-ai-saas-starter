import { Injectable } from '@nestjs/common';
import { Tool } from '@hive-academy/langgraph-multi-agent';

/**
 * DocumentProcessingTools (migrated subset of ShowcaseDocumentTools)
 * Focused on deterministic lightweight processing (no network scrape simulation).
 */
@Injectable()
export class DocumentProcessingTools {
  @Tool()
  async summarizeDocument({
    content,
    summaryStyle,
    length,
  }: {
    content: string;
    summaryStyle: 'executive' | 'technical' | 'bullet-points' | 'narrative';
    length: 'short' | 'medium' | 'long';
  }): Promise<{
    summary: string;
    style: string;
    length: string;
    compressionRatio: number;
    generatedAt: string;
  }> {
    const words = content.split(/\s+/);
    const target = length === 'short' ? 80 : length === 'medium' ? 160 : 320;
    const slice = words.slice(0, target).join(' ');
    const base =
      summaryStyle === 'executive'
        ? `EXEC SUMMARY: ${slice}`
        : summaryStyle === 'technical'
        ? `TECH OVERVIEW: ${slice}`
        : summaryStyle === 'bullet-points'
        ? slice
            .split('. ')
            .filter((s) => s.length > 10)
            .slice(0, 5)
            .map((s) => `• ${s.trim()}`)
            .join('\n')
        : `NARRATIVE: ${slice}`;
    return {
      summary: base,
      style: summaryStyle,
      length,
      compressionRatio: Math.round(
        (slice.split(' ').length / words.length) * 100
      ),
      generatedAt: new Date().toISOString(),
    };
  }

  @Tool()
  async extractEntities({ content }: { content: string }): Promise<{
    organizations: string[];
    technologies: string[];
    detectedAt: string;
  }> {
    const orgRegex = /\b(OpenAI|Google|Microsoft|Apple|Amazon|Meta|Tesla)\b/gi;
    const techRegex =
      /\b(TypeScript|React|Angular|Node\.js|Python|Docker|Kubernetes)\b/gi;
    const organizations = Array.from(
      new Set(content.match(orgRegex)?.map((o) => o) || [])
    );
    const technologies = Array.from(
      new Set(content.match(techRegex)?.map((t) => t) || [])
    );
    return {
      organizations,
      technologies,
      detectedAt: new Date().toISOString(),
    };
  }
}
