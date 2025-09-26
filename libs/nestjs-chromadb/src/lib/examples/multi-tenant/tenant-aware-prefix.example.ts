import { Module, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TenantAware } from '../../../lib/decorators';
import { ChromaDBModule, ChromaDBFacadeService } from '../../../index';

type PrefixDoc = {
 id: string;
 document: string;
 metadata?: Record<string, unknown>;
};

@Injectable()
export class TenantPrefixService implements OnModuleInit {
 private readonly logger = new Logger(TenantPrefixService.name);

 // The TenantAware decorator reads request from execution context.
 // We expose a lightweight request property to simulate headers in examples.
 public request?: { headers?: Record<string, string>; user?: any };

 constructor(private readonly chroma: ChromaDBFacadeService) {}

 async onModuleInit(): Promise<void> {
   // Simulate an HTTP request carrying tenant headers for deterministic demo
   this.request = {
     headers: {
       'x-tenant-id': 'tenant-a',
       'x-organization-id': 'org-1',
       'x-region': 'eu',
     },
   };

   // Execute a demo flow to generate deterministic, audit-logged operations
   const created = await this.createForTenant('docs', [
     { id: 't-a-1', document: 'hello prefix', metadata: { topic: 'greeting' } },
     { id: 't-a-2', document: 'vector db guide', metadata: { topic: 'nlp' } },
   ]);

   const searched = await this.searchForTenant('docs', 'hello');

  this.logger.log(`created: ${created} docs`);
  this.logger.log(`search ids: ${JSON.stringify(searched.ids?.[0] ?? [])}`);
 }

 // Prefix strategy + header extraction; audit log enabled
 @TenantAware({
   namingStrategy: 'prefix',
   tenantExtraction: 'header',
   enableAuditLog: true,
   strictValidation: true,
   enableTenantCaching: true,
   cacheTtl: 300000,
 })
 async createForTenant(
   baseCollection: string,
   docs: PrefixDoc[],
 ): Promise<number> {
   // The decorator transforms the collection name based on tenant and strategy.
   // Pass the base collection; the decorator applies the prefix.
   await this.chroma.upsertDocuments(baseCollection, docs as any);
   return docs.length;
 }

 @TenantAware({
   namingStrategy: 'prefix',
   tenantExtraction: 'header',
   enableAuditLog: true,
   strictValidation: true,
 })
 async searchForTenant(baseCollection: string, query: string) {
   return this.chroma.searchDocuments(baseCollection, [query], undefined, {
     nResults: 5,
   });
 }
}

@Module({
 imports: [
   ChromaDBModule.forRoot({
     connection: { host: 'localhost', port: 8000 },
     defaultCollection: 'docs',
     enableHealthCheck: false,
   }),
 ],
 providers: [TenantPrefixService],
 exports: [TenantPrefixService],
})
export class TenantAwarePrefixExampleModule {}
