// Simple CRUD Example using ChromaDB facade (runnable, typed, deterministic)
// Demonstrates create collection, upsert, search, get and delete operations
// Uses public exports only and a minimal in-module bootstrap (no external I/O)

import { Module, Injectable, OnModuleInit } from '@nestjs/common';
import { ChromaDBModule, ChromaDBFacadeService } from '../../../index';

interface ExampleDocument {
  id: string;
  document: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class SimpleCrudService implements OnModuleInit {
  private readonly collection = 'example_collection';

  constructor(private readonly chroma: ChromaDBFacadeService) {}

  async onModuleInit() {
    // Bootstrap example when module initializes
    await this.bootstrapExample();
  }

  private async bootstrapExample(): Promise<void> {
    // Create collection (idempotent at service level)
    await this.chroma.createCollection(this.collection, { createdBy: 'example' });

    // Upsert deterministic documents
    const docs: ExampleDocument[] = [
      { id: 'doc-1', document: 'Hello world', metadata: { topic: 'greeting' } },
      { id: 'doc-2', document: 'The quick brown fox', metadata: { topic: 'nlp' } },
    ];
    // upsertDocuments expects Chroma wire format; facade handles embedding processing
    await this.chroma.upsertDocuments(this.collection, docs as any);

    // Search by text
    const searchResult = await this.chroma.searchDocuments(
      this.collection,
      ['Hello'],
      undefined,
      { nResults: 5 }
    );
    // Access typed results safely
    // (In real usage map to domain types; here we keep it simple)
     
    console.log('Search result ids:', searchResult.ids);

    // Get documents
    const got = await this.chroma.getDocuments(this.collection, { ids: ['doc-1', 'doc-2'] });
     
    console.log('Fetched documents count:', got.ids?.[0]?.length ?? 0);

    // Cleanup: delete documents
    await this.chroma.deleteDocuments(this.collection, ['doc-1', 'doc-2']);
  }

  // Example helper methods that consumers could call
  async add(doc: ExampleDocument) {
    return this.chroma.addDocuments(this.collection, [doc as any]);
  }

  async find(query: string) {
    return this.chroma.searchDocuments(this.collection, [query], undefined, { nResults: 10 });
  }
}

@Module({
  imports: [
    // Provide minimal, valid options for compile-time and local dev usage.
    // The connection shape is documented in interfaces; use host/port.
    ChromaDBModule.forRoot({
      connection: { host: 'localhost', port: 8000 },
      defaultCollection: 'example_collection',
      enableHealthCheck: false,
    }),
  ],
  providers: [SimpleCrudService],
})
export class SimpleCrudExampleModule {}
