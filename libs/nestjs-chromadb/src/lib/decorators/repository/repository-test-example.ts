/**
 * @fileoverview Simple Test Example for New Repository Decorator with BaseChromaRepository
 *
 * This file demonstrates the new base class pattern that eliminates
 * the need for `!` assertions and provides full compile-time type safety.
 */

import { Injectable } from '@nestjs/common';
import type { BaseDocument } from '../../types/core.interface';
import type { ChromaDBService } from '../../services/chromadb.service';
import { ChromaRepository } from './repository-decorator';
import { BaseChromaRepository } from './base-repository.interface';

type TestDocument = BaseDocument<{
  category: string;
  priority: number;
  tags: string[];
}>;

@Injectable()
@ChromaRepository<TestDocument>({
  collection: 'test-documents',
  autoEmbed: true,
  enableCaching: true,
  enableValidation: true,
  autoTimestamp: true,
  autoGenerateIds: true,
  errorHandling: 'throw',
})
export class TestDocumentRepository extends BaseChromaRepository<TestDocument> {
  constructor(chromaService: ChromaDBService) {
    super();
  }

  // Custom business logic methods
  async findByCategory(category: string): Promise<TestDocument[]> {
    return this.findAll();
  }

  async findHighPriority(): Promise<TestDocument[]> {
    return this.findAll();
  }

  async searchByTags(query: string, tags: string[]): Promise<TestDocument[]> {
    return this.search(query, {
      limit: 20,
    });
  }
}

/**
 * Example usage function to demonstrate functionality
 */
export async function demonstrateRepository(
  repository: TestDocumentRepository
): Promise<void> {
  // Create a test document
  const document: Omit<TestDocument, 'id'> = {
    content: 'This is a test document for the new repository system',
    metadata: {
      category: 'testing',
      priority: 9,
      tags: ['test', 'repository', 'chromadb'],
    },
  };

  try {
    // Test create operation
    const created = await repository.create(document);
    console.log('Created document:', created.id);

    // Test search operation
    const searchResults = await repository.search('test document');
    console.log('Search results:', searchResults.length);

    // Test custom method
    const highPriorityDocs = await repository.findHighPriority();
    console.log('High priority documents:', highPriorityDocs.length);

    // Test count operation
    const totalCount = await repository.count();
    console.log('Total documents:', totalCount);
  } catch (error) {
    console.error('Repository operation failed:', error);
  }
}
