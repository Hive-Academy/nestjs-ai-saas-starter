import { Module, Injectable, OnModuleInit } from '@nestjs/common';
import { ChromaDBFacadeService, ChromaSearchOptions } from '../../../index';

/**
* ComplexQueriesService
*
* Uses the public ChromaDBFacadeService to demonstrate constructing
* advanced search options (including distances and metadata) and returning
* the raw search result for inspection.
*/
@Injectable()
export class ComplexQueriesService implements OnModuleInit {
 constructor(private readonly chroma: ChromaDBFacadeService) {}

 async onModuleInit(): Promise<void> {
   // Intentionally no seeding here - keeps example deterministic.
 }

 async complexSearch(query: string) {
   const options: ChromaSearchOptions = {
     nResults: 5,
     includeDistances: true,
     // where, whereDocument, minScore, and other advanced options can be added here
   };

   return this.chroma.searchDocuments('example_collection', [query], undefined, options);
 }
}

@Module({
 // Consumers should import ChromaDBModule.forRoot(...) in their bootstrap.
 providers: [ComplexQueriesService],
 exports: [ComplexQueriesService],
})
export class ComplexQueriesExampleModule {}
