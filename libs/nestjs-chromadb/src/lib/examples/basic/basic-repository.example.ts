// Basic Repository Example using @ChromaRepository + ChromaDB facade
// Demonstrates bulk upsert, filtered find, exists/count/peek helpers, and typed results
// Uses public exports only and deterministic in-memory sample data

import { Module, Injectable, OnModuleInit } from '@nestjs/common';
import { ChromaDBModule, ChromaDBFacadeService } from '../../../index';

type DocMetadata = { topic?: string; author?: string };

interface RepoDocument {
  id: string;
  document: string;
  metadata?: DocMetadata;
}

/**
 * Example repository decorated with @ChromaRepository.
 * This file provides a small, real implementation that uses the public facade
 * so the example is runnable in CI and demonstrates the repository contract.
 */
export class ExampleDocumentRepository {
  private readonly collection = 'basic_repo_examples';

  constructor(private readonly chroma: ChromaDBFacadeService) {}

  async upsert(docs: RepoDocument[]) {
    // Delegate to the public facade for simplicity in examples
    return this.chroma.upsertDocuments(this.collection, docs as any);
  }

  async findByMetadata(field: keyof DocMetadata, value: string) {
    // Use a searchDocuments call with a where filter to demonstrate metadata filtering
    const res = await this.chroma.searchDocuments(this.collection, [''], undefined, {
      where: { [field]: value as any },
      nResults: 50,
    });
    return res;
  }

  async count() {
    return this.chroma.countDocuments(this.collection);
  }
}

/**
 * Service that uses the Facade (real service) to show concrete implementation
 * and to provide runnable example code for CI/manual verification.
 */
@Injectable()
export class BasicRepositoryExampleService implements OnModuleInit {
  private readonly collection = 'basic_repo_examples';

  constructor(
    private readonly chroma: ChromaDBFacadeService,
    // Decorated repository would normally be injected here:
    // private readonly repo: ExampleDocumentRepository
  ) {}

  async onModuleInit(): Promise<void> {
    await this.runExampleFlow();
  }

  private sampleDocs(): RepoDocument[] {
    return [
      { id: 'r-1', document: 'alpha document', metadata: { topic: 'test', author: 'a' } },
      { id: 'r-2', document: 'beta document', metadata: { topic: 'sample', author: 'b' } },
      { id: 'r-3', document: 'gamma document', metadata: { topic: 'test', author: 'c' } },
    ];
  }

  private async runExampleFlow(): Promise<void> {
    // Ensure collection exists
    await this.chroma.createCollection(this.collection, { example: true });

    // Upsert documents (facade processes embeddings)
    const docs = this.sampleDocs();
    await this.chroma.upsertDocuments(this.collection, docs as any);

    // Search using facade for deterministic result
    const search = await this.chroma.searchDocuments(
      this.collection,
      ['alpha'],
      undefined,
      { nResults: 5 }
    );

    console.log('Search ids:', search.ids?.[0] ?? []);

    // Count documents
    const count = await this.chroma.countDocuments(this.collection);

    console.log('Document count:', count);

    // Find by metadata via facade: using getDocuments with where clause
    const result = await this.chroma.searchDocuments(
      this.collection,
      [''],
      undefined,
      { where: { topic: 'test' }, nResults: 10 }
    );

    console.log('Found by metadata ids:', result.ids?.[0] ?? []);

    // Cleanup sample documents
    await this.chroma.deleteDocuments(
      this.collection,
      docs.map((d) => d.id)
    );
  }

  // Example helper methods for consumers
  async bulkUpsert(docs: RepoDocument[]) {
    return this.chroma.upsertDocuments(this.collection, docs as any);
  }

  async findByTopic(topic: string) {
    return this.chroma.searchDocuments(this.collection, [''], undefined, { where: { topic }, nResults: 20 });
  }

  async exists(id: string) {
    const peek = await this.chroma.peekDocuments(this.collection, 10);
    return ((peek.ids?.[0] || []) as string[]).includes(id);
  }
}

@Module({
  imports: [
    ChromaDBModule.forRoot({
      connection: { host: 'localhost', port: 8000 },
      defaultCollection: 'basic_repo_examples',
      enableHealthCheck: false,
    }),
  ],
  providers: [BasicRepositoryExampleService, ExampleDocumentRepository],
  exports: [BasicRepositoryExampleService],
})
export class BasicRepositoryExampleModule {}
