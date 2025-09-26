import { Module, Injectable, OnModuleInit } from '@nestjs/common';
import {
 ChromaDBFacadeService,
 ChromaSearchOptions,
 ChromaSearchResult,
} from '../../../index';

/**
* SearchWithScoresService
*
* Demonstrates requesting distances from ChromaDB and mapping them into
* a friendly result structure containing id, document, metadata, distance and score.
*/
@Injectable()
export class SearchWithScoresService implements OnModuleInit {
 constructor(private readonly chroma: ChromaDBFacadeService) {}

 async onModuleInit(): Promise<void> {
   // No-op for deterministic example. Real examples may seed documents here.
 }

 async searchWithScores(query: string) {
   const options: ChromaSearchOptions = {
     nResults: 5,
     includeDistances: true,
   };

   const result: ChromaSearchResult = await this.chroma.searchDocuments(
     'example_collection',
     [query],
     undefined,
     options
   );

   // result.* are arrays per query; we use the first query's results
   const ids = result.ids?.[0] ?? [];
   const docs = result.documents?.[0] ?? [];
   const metadatas = result.metadatas?.[0] ?? [];
   const distances = result.distances?.[0] ?? [];

   // Convert distances to a simple similarity score (if distances in [0,1])
   // Keep mapping identity-safe in case distances are absent.
   return ids.map((id, i) => {
     const distance = typeof distances[i] === 'number' ? distances[i] : null;
     const score =
       typeof distance === 'number' ? Math.max(0, 1 - distance) : null;

     return {
       id,
       document: docs[i] ?? null,
       metadata: metadatas[i] ?? null,
       distance,
       score,
     };
   });
 }
}

@Module({
 // Consumers should configure ChromaDBModule.forRoot(...) when using this example.
 providers: [SearchWithScoresService],
 exports: [SearchWithScoresService],
})
export class SearchWithScoresExampleModule {}
