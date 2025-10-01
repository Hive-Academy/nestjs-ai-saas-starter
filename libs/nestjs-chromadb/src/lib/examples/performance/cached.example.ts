import { Module, Injectable, OnModuleInit } from '@nestjs/common';
import { ChromaDBFacadeService } from '../../../index';
import { Cached, InvalidateCache } from '../../../lib/decorators';

/**
* CachedExampleService
*
* Demonstrates using the public @Cached decorator to memoize a method that
* reads a single document from ChromaDB and shows a complementary invalidation.
*
* Note: Consumers should configure ChromaDBModule.forRoot(...) in their bootstrap
* when running the example.
*/
@Injectable()
export class CachedExampleService implements OnModuleInit {
 constructor(private readonly chroma: ChromaDBFacadeService) {}

 async onModuleInit(): Promise<void> {
   // Seed a deterministic document so the example is runnable in CI
   const collection = 'cached_examples';
   await this.chroma.createCollection(collection, { example: true }).catch(() => null);
   await this.chroma.upsertDocuments(
     collection,
     [{ id: 'd-1', document: 'cached seed', metadata: { seeded: true } }] as any
   );

   // Exercise caching + invalidation so CI/manual reviewers can observe behavior
   try {
     const first = await this.getDocumentById(collection, 'd-1');
      
     console.log('Cached example - first fetch (uncached):', first ? 'found' : 'missing', first?.id ?? 'no-id');

     const second = await this.getDocumentById(collection, 'd-1');
      
     console.log('Cached example - second fetch (should be cached):', second ? 'found' : 'missing', second?.id ?? 'no-id');

     await this.invalidateDocumentCache(collection, 'd-1');

     const third = await this.getDocumentById(collection, 'd-1');
      
     console.log('Cached example - after invalidation (refreshed):', third ? 'found' : 'missing', third?.id ?? 'no-id');
   } catch (err) {
     const unknownErr = err as unknown;
     const errMsg =
       typeof unknownErr === 'object' && unknownErr !== null && 'message' in unknownErr
         ? (unknownErr as { message: unknown }).message
         : String(unknownErr);
      
     console.warn('Cached example encountered an error:', errMsg);
   }
 }

 @Cached({
   ttl: 60_000,
   keyGenerator: (...args: any[]) => `cached:doc:${args[0]}:${args[1]}`,
 })
 async getDocumentById(collectionName: string, id: string) {
   const result = await this.chroma.getDocuments(collectionName, { ids: [id] });
   // Chroma returns GetResult shape; return first document (or null)
   const documents = result.documents?.[0] ?? [];
   const documentContent = documents[0] ?? null;
   
   // Return an object with id and content for consistency
   return documentContent ? { id, content: documentContent } : null;
 }

 /**
  * Invalidate the cache for a specific document key after an update.
  * Uses the exported InvalidateCache helper (decorator) to demonstrate invalidation.
  */
 @InvalidateCache((args: any[]) => `cached:doc:${args[0]}:${args[1]}`)
 async invalidateDocumentCache(collectionName: string, id: string) {
   // noop body - the decorator performs the invalidation side-effect
   return;
 }
}

@Module({
 providers: [CachedExampleService],
 exports: [CachedExampleService],
})
export class CachedExampleModule {}
