import { Module, Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import {
 isValidChromaDocument,
 validateChromaDocument,
 validateSearchOptions,
 createTypeChecker,
 ChromaDBValidationError,
} from '../../../index';
import type { ChromaWireDocument, ChromaSearchOptions } from '../../../index';

@Injectable()
export class ErrorGuardsExampleService implements OnModuleInit {
 private readonly logger = new Logger(ErrorGuardsExampleService.name);

 // Example of custom checker built on top of library guard utilities
 private readonly embeddingChecker: { assert: (value: unknown, context: string) => asserts value is number[] } = createTypeChecker<number[]>(
   'embeddingVector',
   (v: unknown): v is number[] =>
     Array.isArray(v) && v.length > 0 && v.every((n) => typeof n === 'number' && Number.isFinite(n)),
 );

 async onModuleInit(): Promise<void> {
   // Valid and invalid documents (deterministic, no I/O)
   const validDoc: ChromaWireDocument = {
     id: 'ok-1',
     document: 'hello world',
     metadata: { topic: 'demo', ok: true },
   };
   const invalidDoc: unknown = {
     id: '',
     document: 42, // invalid type
     metadata: { bad: { nested: true } }, // invalid nested object
   };

   this.logger.log(`isValidChromaDocument(validDoc) = ${isValidChromaDocument(validDoc)}`);
   this.logger.log(`isValidChromaDocument(invalidDoc) = ${isValidChromaDocument(invalidDoc)}`);

   // Strict validation with typed errors -> converted to HTTP 400 for app usage
   try {
     this.strictValidateDoc(validDoc);
     this.logger.log('strictValidateDoc(validDoc) passed');
   } catch (e) {
     this.logger.error(`Unexpected failure validating validDoc: ${(e as Error).message}`);
   }

   try {
     this.strictValidateDoc(invalidDoc);
   } catch (e) {
     if (e instanceof ChromaDBValidationError) {
       this.logger.warn(`strictValidateDoc(invalidDoc) -> ${e.message} [field=${e.field}]`);
     } else {
       this.logger.warn(`strictValidateDoc(invalidDoc) -> ${(e as Error).message}`);
     }
   }

   // Search options validation
   const goodSearch: ChromaSearchOptions = { nResults: 3 };
   const badSearch: unknown = { nResults: 0, where: 'shouldBeObject' };

   this.strictValidateSearchOptions(goodSearch);
   try {
     this.strictValidateSearchOptions(badSearch);
   } catch (e) {
     this.logger.warn(`strictValidateSearchOptions(badSearch) -> ${(e as Error).message}`);
   }

   // Demonstrate createTypeChecker usage
   try {
     this.embeddingChecker.assert([0.1, 0.2, 0.3], 'example.embedding');
     this.logger.log('embeddingChecker.assert passed');
     this.embeddingChecker.assert([0.1, Number.NaN], 'example.embedding'); // triggers error
   } catch (e) {
     this.logger.warn(`embeddingChecker.assert -> ${(e as Error).message}`);
   }
 }

 strictValidateDoc(doc: unknown): asserts doc is ChromaWireDocument {
   try {
     validateChromaDocument(doc, 'ErrorGuardsExampleService.strictValidateDoc');
   } catch (e) {
     // Surface as HTTP-friendly error for application layers
     throw new BadRequestException((e as Error).message);
   }
 }

 strictValidateSearchOptions(opts: unknown): asserts opts is ChromaSearchOptions {
   try {
     validateSearchOptions(opts, 'ErrorGuardsExampleService.strictValidateSearchOptions');
   } catch (e) {
     throw new BadRequestException((e as Error).message);
   }
 }
}

@Module({
 providers: [ErrorGuardsExampleService],
 exports: [ErrorGuardsExampleService],
})
export class ErrorHandlingAndGuardsExampleModule {}
