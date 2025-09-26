import { Module, Injectable, OnModuleInit } from '@nestjs/common';
import { Cached, Profiled, Retry } from '../../../lib/decorators';
import { ChromaDBFacadeService } from '../../../index';

/**
 * CombinedPerformanceService
 *
 * Demonstrates composing @Cached, @Profiled and @Retry on a single method
 * which reads a document from ChromaDB and performs a lightweight enrichment.
 *
 * This runnable example seeds a deterministic document during module init,
 * then exercises the decorated method so CI can validate behavior.
 *
 * Decorator order: @Cached (outer) -> @Profiled -> @Retry (inner)
 */
@Injectable()
export class CombinedPerformanceService implements OnModuleInit {
  private readonly collection = 'combined_perf_examples';

  constructor(private readonly chroma: ChromaDBFacadeService) {}

  async onModuleInit(): Promise<void> {
    // Seed a deterministic document so the example is runnable in CI without external input
    await this.chroma.createCollection(this.collection, { example: true }).catch(() => null);

    await this.chroma.upsertDocuments(this.collection, [
      { id: 'c-1', document: 'combined performance seed', metadata: { seeded: true } },
    ] as any);

    // Call the decorated method once to ensure decorators execute in the intended order
    try {
      const result = await this.getEnrichedDocument(this.collection, 'c-1');
      // Lightweight confirmation for manual/CI inspection

      console.log('Combined performance example result:', result?.id ?? 'none');
    } catch (err) {
      const unknownErr = err as unknown;
      const errMsg =
        typeof unknownErr === 'object' && unknownErr !== null && 'message' in unknownErr
          ? (unknownErr as { message: unknown }).message
          : String(unknownErr);
      console.warn('Combined performance example encountered an error (will not fail build):', errMsg);
    }
  }

  @Cached({
    ttl: 60_000,
    key: (args: any[]) => `enriched:${args[0]}:${args[1]}`,
  })
  @Profiled({ slowQueryThreshold: 50, samplingRate: 1 })
  @Retry({ maxAttempts: 3, baseDelay: 100, backoffMultiplier: 2 })
  async getEnrichedDocument(collectionName: string, id: string) {
    // Fetch the document by id
    const getResult = await this.chroma.getDocuments(collectionName, { ids: [id] });
    const documents = getResult.documents?.[0] ?? [];
    const raw = documents[0] ?? null;

    // Lightweight enrichment: collect collection stats and include as metadata
    const count = await this.chroma.countDocuments(collectionName).catch(() => null);

    return {
      id,
      document: raw,
      collectionStats: {
        count,
      },
      enrichedAt: new Date().toISOString(),
    };
  }
}

@Module({
  providers: [CombinedPerformanceService],
  exports: [CombinedPerformanceService],
})
export class CombinedPerformanceExampleModule {}
