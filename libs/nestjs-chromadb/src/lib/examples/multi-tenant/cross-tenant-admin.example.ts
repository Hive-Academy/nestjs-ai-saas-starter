import { Module, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CrossTenant } from '../../../lib/decorators';
import { ChromaDBModule, ChromaDBFacadeService } from '../../../index';

@Injectable()
export class CrossTenantAdminService implements OnModuleInit {
 private readonly logger = new Logger(CrossTenantAdminService.name);

 // ExecutionContext simulation for examples: user with admin permission
 public request?: { user?: { id?: string; permissions?: string[] } };

 constructor(private readonly chroma: ChromaDBFacadeService) {}

 async onModuleInit(): Promise<void> {
   // Simulate elevated user
   this.request = { user: { id: 'admin-1', permissions: ['admin'] } };

   // Seed deterministic cross-tenant data into a shared collection
   await this.seed('mt-docs');

   // Perform a capped cross-tenant search
   const capped = 5;
   const result = await this.crossTenantSearch('mt-docs', 'intro', capped);
   this.logger.log(`cross-tenant ids: ${JSON.stringify(result.ids?.[0] ?? [])}`);
 }

 private async seed(collection: string): Promise<void> {
   await this.chroma.upsertDocuments(collection, [
     { id: 'ta-1', document: 'intro for tenant A', metadata: { tenant: 'tenant-a', scope: 'public' } },
     { id: 'ta-2', document: 'guide for tenant A', metadata: { tenant: 'tenant-a', scope: 'restricted' } },
     { id: 'tb-1', document: 'intro for tenant B', metadata: { tenant: 'tenant-b', scope: 'public' } },
     { id: 'tb-2', document: 'how-to for tenant B', metadata: { tenant: 'tenant-b', scope: 'restricted' } },
   ] as any);
 }

 // Cross-tenant read with explicit cap; decorator signals elevated read semantics
 @CrossTenant()
 async crossTenantSearch(collection: string, query: string, cap = 10) {
   const res = await this.chroma.searchDocuments(collection, [query], undefined, { nResults: cap });
   // Defensive cap enforcement on returned ids
   if (res.ids?.[0]?.length && res.ids[0].length > cap) {
     res.ids[0] = res.ids[0].slice(0, cap);
   }
   return res;
 }
}

@Module({
 imports: [
   ChromaDBModule.forRoot({
     connection: { host: 'localhost', port: 8000 },
   }),
 ],
 providers: [CrossTenantAdminService],
 exports: [CrossTenantAdminService],
})
export class CrossTenantAdminExampleModule {}
