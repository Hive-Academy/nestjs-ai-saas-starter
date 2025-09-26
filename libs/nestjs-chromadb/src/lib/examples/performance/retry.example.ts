import { Module, Injectable, OnModuleInit } from '@nestjs/common';
import { Retry } from '../../../lib/decorators';
import { ChromaDBFacadeService } from '../../../index';

/**
* RetryExampleService
*
* Demonstrates using the public @Retry decorator with a simple in-memory
* transient failure simulation. The method will throw a transient error
* a configurable number of times and succeed afterwards; the decorator
* performs retries with exponential backoff.
*/
@Injectable()
export class RetryExampleService implements OnModuleInit {
 private transientFailuresRemaining = 2;

 constructor(private readonly chroma: ChromaDBFacadeService) {}

 async onModuleInit(): Promise<void> {
   // deterministic example - no external seeding
 }

 /**
  * An operation that may fail transiently. The @Retry decorator will
  * retry the method according to the provided configuration.
  */
 @Retry({ maxAttempts: 5, baseDelay: 100, backoffMultiplier: 2 })
 async unstableOperation(collectionName: string) {
   if (this.transientFailuresRemaining > 0) {
     this.transientFailuresRemaining -= 1;
     throw new Error('simulated transient error');
   }

   // On success, return a lightweight operation result (document count).
   return this.chroma.countDocuments(collectionName);
 }
}

@Module({
 providers: [RetryExampleService],
 exports: [RetryExampleService],
})
export class RetryExampleModule {}
