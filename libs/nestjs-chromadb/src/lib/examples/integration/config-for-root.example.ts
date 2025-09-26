import { Module, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChromaDBModule, ChromaDBFacadeService, ChromaMetricsService } from '../../../index';

@Injectable()
export class ConfigForRootExampleService implements OnModuleInit {
 private readonly logger = new Logger(ConfigForRootExampleService.name);

 constructor(
   private readonly chroma: ChromaDBFacadeService,
   private readonly metrics: ChromaMetricsService,
 ) {}

 async onModuleInit(): Promise<void> {
   // Deterministic bootstrap demonstrating the configured client works
   const collection = 'cfg-demo';

   // Upsert a couple of simple documents
   await this.chroma.upsertDocuments(collection, [
     { id: 'cfg-1', document: 'Chroma config demo - hello world', metadata: { env: 'demo', kind: 'cfg' } },
     { id: 'cfg-2', document: 'Configuration via forRoot()', metadata: { env: 'demo', kind: 'cfg' } },
   ] as any);

   // Simple similarity search to validate connectivity
   const result = await this.chroma.searchDocuments(collection, ['hello'], undefined, { nResults: 2 });
   this.logger.log(`search result ids: ${JSON.stringify(result.ids?.[0] ?? [])}`);

   // Log current health derived from metrics (empty at start but valid shape)
   const health = this.metrics.getHealthStatus();
   this.logger.log(`health status: ${health.status}`);
 }
}

@Module({
 imports: [
   ChromaDBModule.forRoot({
     // Minimal, type-safe configuration; satisfies runtime validators
     connection: { host: 'localhost', port: 8000 },
   }),
 ],
 providers: [ConfigForRootExampleService],
 exports: [ConfigForRootExampleService],
})
export class ConfigForRootExampleModule {}
