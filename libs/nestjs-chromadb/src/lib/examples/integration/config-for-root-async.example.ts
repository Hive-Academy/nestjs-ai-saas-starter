import { Module, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChromaDBModule, ChromaDBFacadeService, ChromaMetricsService } from '../../../index';

@Injectable()
export class ConfigForRootAsyncExampleService implements OnModuleInit {
 private readonly logger = new Logger(ConfigForRootAsyncExampleService.name);

 constructor(
   private readonly chroma: ChromaDBFacadeService,
   private readonly metrics: ChromaMetricsService,
 ) {}

 async onModuleInit(): Promise<void> {
   const collection = 'cfg-async-demo';

   await this.chroma.upsertDocuments(collection, [
     { id: 'cfgA-1', document: 'Async config demo - hello', metadata: { env: 'demo', mode: 'async' } },
     { id: 'cfgA-2', document: 'Configured via forRootAsync()', metadata: { env: 'demo', mode: 'async' } },
   ] as any);

   const result = await this.chroma.searchDocuments(collection, ['hello'], undefined, { nResults: 2 });
   this.logger.log(`search result ids: ${JSON.stringify(result.ids?.[0] ?? [])}`);

   const health = this.metrics.getHealthStatus();
   this.logger.log(`health status: ${health.status}`);
 }
}

@Module({
 imports: [
   ChromaDBModule.forRootAsync({
     useFactory: async () => {
       // In real apps, read from ConfigService/ENV; kept deterministic for examples
       return {
         connection: { host: 'localhost', port: 8000 },
         performance: { enabled: true },
       };
     },
   }),
 ],
 providers: [ConfigForRootAsyncExampleService],
 exports: [ConfigForRootAsyncExampleService],
})
export class ConfigForRootAsyncExampleModule {}
