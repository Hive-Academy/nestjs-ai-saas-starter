import { Module, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TenantAware } from '../../../lib/decorators';
import { ChromaDBModule, ChromaDBFacadeService } from '../../../index';

type SepDoc = {
 id: string;
 document: string;
 metadata?: Record<string, unknown>;
};

@Injectable()
export class TenantSeparateService implements OnModuleInit {
 private readonly logger = new Logger(TenantSeparateService.name);

 // ExecutionContext simulation for examples: JWT-based extraction
 public request?: { headers?: Record<string, string>; user?: { sub?: string; tenantId?: string; permissions?: string[] } };

 constructor(private readonly chroma: ChromaDBFacadeService) {}

 async onModuleInit(): Promise<void> {
   // Simulate a JWT-authenticated user with tenantId in claims
   this.request = {
     user: {
       sub: 'user-1',
       tenantId: 'tenant-b',
       permissions: ['user'],
     },
   };

   // Seed deterministic sample and run a search to demonstrate isolation
   await this.seedForTenant('docs', [
     { id: 'tb-1', document: 'separate tenant doc', metadata: { topic: 'guide' } },
     { id: 'tb-2', document: 'intro to chroma', metadata: { topic: 'nlp' } },
   ]);

   const result = await this.searchForTenant('docs', 'intro');
   this.logger.log(`search ids: ${JSON.stringify(result.ids?.[0] ?? [])}`);
 }

 // Separate collection-per-tenant; tenant extracted from JWT; audit on writes
 @TenantAware({
   namingStrategy: 'separate',
   tenantExtraction: 'jwt',
   enableAuditLog: true,
   strictValidation: true,
   enableTenantCaching: true,
   cacheTtl: 300000,
 })
 async seedForTenant(baseCollection: string, docs: SepDoc[]): Promise<void> {
   await this.chroma.upsertDocuments(baseCollection, docs as any);
 }

 @TenantAware({
   namingStrategy: 'separate',
   tenantExtraction: 'jwt',
   enableAuditLog: true,
   strictValidation: true,
 })
 async searchForTenant(baseCollection: string, query: string) {
   return this.chroma.searchDocuments(baseCollection, [query], undefined, { nResults: 5 });
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
 providers: [TenantSeparateService],
 exports: [TenantSeparateService],
})
export class TenantAwareSeparateExampleModule {}
