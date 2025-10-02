/**
 * @fileoverview Repository CRUD Operations Example
 *
 * Demonstrates:
 * - Complete CRUD operations using BaseChromaRepository
 * - Create, findById, findAll, update, delete operations
 * - Batch operations (createMany, updateMany, deleteMany)
 * - Upsert operations for data synchronization
 * - Advanced querying with filters and options
 * - Error handling patterns and validation
 * - Transaction-like operations and consistency
 *
 * Key Concepts:
 * - Repository pattern implementation
 * - Type-safe CRUD operations
 * - Batch processing strategies
 * - Error handling and recovery
 * - Data consistency patterns
 */

import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import {
  ChromaDBModule,
  ChromaDBService,
  ChromaRepository,
  BaseChromaRepository,
  ChromaEntity,
  ChromaProp,
  ChromaId,
  CreatedAt,
  UpdatedAt,
  BaseChromaEntity,
} from '../../index';
import type {
  CreateDocumentInput,
  UpsertDocumentInput,
} from '../decorators/repository/base-repository.interface';

// ============================================================================
// 1. METADATA TYPE DEFINITIONS
// ============================================================================

/**
 * Metadata type for Book entity
 */
interface BookMetadata {
  title: string;
  author: string;
  isbn: string;
  publishedYear: number;
  genre: string;
  price: number;
  inStock: boolean;
  rating: number;
  description: string;
}

/**
 * Metadata type for Author entity
 */
interface AuthorMetadata {
  name: string;
  birthYear: number;
  nationality: string;
  genre: string;
  booksCount: number;
  biography: string;
}

// ============================================================================
// 2. ENTITY DEFINITIONS FOR CRUD OPERATIONS
// ============================================================================

/**
 * Book entity for demonstrating comprehensive CRUD operations
 */
@ChromaEntity({
  collection: 'books',
  description: 'Book catalog for CRUD demonstration',
  autoEmbed: true,
  embeddingFields: ['content', 'description'],
  autoTimestamp: true,
  autoGenerateIds: true,
  idStrategy: 'uuid',
})
export class BookEntity extends BaseChromaEntity<BookMetadata> {
  @ChromaId()
  declare id: string;

  @ChromaProp({
    description: 'Book title and description for embedding',
  })
  declare content: string;

  declare metadata: BookMetadata;
  declare embedding?: readonly number[];

  @CreatedAt()
  declare createdAt?: string;

  @UpdatedAt()
  declare updatedAt?: string;

  declare version?: number;
}

/**
 * Author entity for demonstrating relationship patterns
 */
@ChromaEntity({
  collection: 'authors',
  description: 'Author information with biography',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
  autoGenerateIds: true,
})
export class AuthorEntity extends BaseChromaEntity<AuthorMetadata> {
  @ChromaId()
  declare id: string;

  @ChromaProp()
  declare content: string;

  declare metadata: AuthorMetadata;
  declare embedding?: readonly number[];

  @CreatedAt()
  declare createdAt?: string;

  @UpdatedAt()
  declare updatedAt?: string;

  declare version?: number;
}

// ============================================================================
// 3. REPOSITORY IMPLEMENTATIONS
// ============================================================================

/**
 * Book repository with auto-generated CRUD methods
 * Demonstrates the full BaseChromaRepository interface
 */
@Injectable()
@ChromaRepository<BookEntity>({
  collection: 'books',
  autoEmbed: true,
  enableCaching: true,
  enableValidation: true,
  autoTimestamp: true,
})
export class BookRepository extends BaseChromaRepository<BookEntity> {
  constructor() {
    super();
  }

  // All base CRUD methods are auto-generated:
  // - create(document: CreateDocumentInput<BookEntity>): Promise<BookEntity>
  // - createMany(documents: Array<CreateDocumentInput<BookEntity>>): Promise<BookEntity[]>
  // - findById(id: string): Promise<BookEntity | null>
  // - findByIds(ids: string[]): Promise<BookEntity[]>
  // - findAll(options?: FindAllOptions<BookEntity>): Promise<BookEntity[]>
  // - update(id: string, updates: Partial<BookEntity>): Promise<BookEntity | null>
  // - updateMany(updates: Array<{id: string; data: Partial<BookEntity>}>): Promise<BookEntity[]>
  // - upsert(document: Partial<BookEntity> & {id: string}): Promise<BookEntity>
  // - upsertMany(documents: Array<Partial<BookEntity> & {id: string}>): Promise<BookEntity[]>
  // - delete(id: string): Promise<boolean>
  // - deleteMany(ids: string[]): Promise<number>
  // - deleteByFilter(filter: DeleteFilterOptions<BookEntity>): Promise<number>
  // - search(query: string, options?: SearchOptions<BookEntity>): Promise<BookEntity[]>
  // - searchWithScores(query: string, options?: SearchOptions<BookEntity>): Promise<SearchResult<BookEntity>[]>
  // - searchSimilar(documentId: string, options?: SearchOptions<BookEntity>): Promise<BookEntity[]>
  // - count(filter?: Partial<BookEntity['metadata']>): Promise<number>
  // - exists(id: string): Promise<boolean>
  // - peek(limit?: number): Promise<BookEntity[]>
  // - clear(): Promise<void>
  // - getCollectionInfo(): Promise<{name: string; count: number; metadata?: Record<string, any>}>

  /**
   * Custom business method: Find books by author
   */
  async findByAuthor(author: string): Promise<BookEntity[]> {
    return this.findAll({
      where: { author },
      orderBy: [{ field: 'publishedYear', direction: 'desc' }],
    });
  }

  /**
   * Custom business method: Find books by genre with rating filter
   */
  async findByGenreWithRating(
    genre: string,
    minRating = 0
  ): Promise<BookEntity[]> {
    return this.findAll({
      where: {
        genre,
        rating: { $gte: minRating },
        inStock: true,
      },
      orderBy: [{ field: 'rating', direction: 'desc' }],
      limit: 20,
    });
  }

  /**
   * Custom business method: Find books in price range
   */
  async findInPriceRange(
    minPrice: number,
    maxPrice: number
  ): Promise<BookEntity[]> {
    return this.findAll({
      where: {
        price: { $gte: minPrice, $lte: maxPrice },
        inStock: true,
      },
      orderBy: [{ field: 'price', direction: 'asc' }],
    });
  }
}

/**
 * Author repository demonstrating relationship management
 */
@Injectable()
@ChromaRepository<AuthorEntity>({
  collection: 'authors',
  autoEmbed: true,
  enableCaching: true,
  enableValidation: true,
})
export class AuthorRepository extends BaseChromaRepository<AuthorEntity> {
  constructor(chromaService: ChromaDBService) {
    super();
  }

  /**
   * Find authors by nationality
   */
  async findByNationality(nationality: string): Promise<AuthorEntity[]> {
    return this.findAll({
      where: { nationality },
      orderBy: [{ field: 'name', direction: 'asc' }],
    });
  }

  /**
   * Find prolific authors (with many books)
   */
  async findProlificAuthors(minBooks = 5): Promise<AuthorEntity[]> {
    return this.findAll({
      where: {
        booksCount: { $gte: minBooks },
      },
      orderBy: [{ field: 'booksCount', direction: 'desc' }],
    });
  }
}

// ============================================================================
// 4. CRUD OPERATIONS DEMONSTRATION SERVICE
// ============================================================================

/**
 * Service demonstrating comprehensive CRUD operations
 */
@Injectable()
export class CrudOperationsDemoService implements OnModuleInit {
  constructor(
    private readonly bookRepo: BookRepository,
    private readonly authorRepo: AuthorRepository
  ) {}

  async onModuleInit() {
    console.log('\n🎯 Repository CRUD Operations Demo\n');
    await this.demonstrateBasicCrudOperations();
    await this.demonstrateBatchOperations();
    await this.demonstrateUpsertOperations();
    await this.demonstrateAdvancedQuerying();
    await this.demonstrateErrorHandling();
    await this.demonstrateDataConsistency();
  }

  /**
   * Demonstrates basic CRUD operations
   */
  private async demonstrateBasicCrudOperations(): Promise<void> {
    console.log('📚 Basic CRUD Operations Demo:');

    try {
      // CREATE - Single document
      console.log('  ✅ CREATE Operations:');

      const newBook = {
        content:
          'The Great Gatsby - A classic American novel about the Jazz Age and the American Dream',
        metadata: {
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          isbn: '978-0-7432-7356-5',
          publishedYear: 1925,
          genre: 'Classic Fiction',
          price: 12.99,
          inStock: true,
          rating: 4.2,
          description:
            'A timeless story of love, wealth, and moral decay in the Roaring Twenties',
        },
      };

      const createdBook = await this.bookRepo.create(
        newBook as CreateDocumentInput<BookEntity>
      );
      console.log(
        `    📖 Created book: "${createdBook.metadata.title}" (ID: ${createdBook.id})`
      );

      // READ - Find by ID
      console.log('  🔍 READ Operations:');

      const foundBook = await this.bookRepo.findById(createdBook.id);
      if (foundBook) {
        console.log(`    📖 Found book: "${foundBook.metadata.title}"`);
        console.log(`    📅 Created: ${foundBook.createdAt}`);
        console.log(`    ⭐ Rating: ${foundBook.metadata.rating}/5`);
      }

      // UPDATE - Modify existing document
      console.log('  ✏️  UPDATE Operations:');

      const updatedBook = await this.bookRepo.update(createdBook.id, {
        metadata: {
          ...createdBook.metadata,
          price: 14.99,
          rating: 4.5,
        },
      });

      if (updatedBook) {
        console.log(`    💰 Updated price: $${updatedBook.metadata.price}`);
        console.log(`    ⭐ Updated rating: ${updatedBook.metadata.rating}/5`);
        console.log(`    🕒 Updated at: ${updatedBook.updatedAt}`);
      }

      // DELETE - Remove document
      console.log('  🗑️  DELETE Operations:');

      const deleted = await this.bookRepo.delete(createdBook.id);
      console.log(`    📖 Book deleted: ${deleted ? 'Success' : 'Failed'}`);

      // Verify deletion
      const deletedBook = await this.bookRepo.findById(createdBook.id);
      console.log(
        `    🔍 Verification: Book exists after deletion: ${!!deletedBook}`
      );
    } catch (error) {
      console.error(
        '  ❌ Error in basic CRUD operations:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates batch operations for efficiency
   */
  private async demonstrateBatchOperations(): Promise<void> {
    console.log('📦 Batch Operations Demo:');

    try {
      // CREATE MANY - Batch creation
      console.log('  ✅ CREATE MANY Operations:');

      const booksData: Array<CreateDocumentInput<BookEntity>> = [
        {
          content:
            'To Kill a Mockingbird - A gripping tale of racial injustice and moral growth',
          metadata: {
            title: 'To Kill a Mockingbird',
            author: 'Harper Lee',
            isbn: '978-0-06-112008-4',
            publishedYear: 1960,
            genre: 'Classic Fiction',
            price: 13.99,
            inStock: true,
            rating: 4.3,
            description:
              'A powerful story of courage and justice in the American South',
          },
        },
        {
          content:
            '1984 - A dystopian social science fiction novel about totalitarian surveillance',
          metadata: {
            title: '1984',
            author: 'George Orwell',
            isbn: '978-0-452-28423-4',
            publishedYear: 1949,
            genre: 'Dystopian Fiction',
            price: 15.99,
            inStock: true,
            rating: 4.4,
            description: 'A chilling vision of a totalitarian future society',
          },
        },
        {
          content:
            'Pride and Prejudice - A romantic novel about manners and marriage in Georgian England',
          metadata: {
            title: 'Pride and Prejudice',
            author: 'Jane Austen',
            isbn: '978-0-14-143951-8',
            publishedYear: 1813,
            genre: 'Romance',
            price: 11.99,
            inStock: false,
            rating: 4.1,
            description:
              'A witty commentary on love and society in Regency England',
          },
        },
      ];

      const createResult = await this.bookRepo.createMany(booksData);
      console.log(`    📚 Created ${createResult.successCount} books in batch`);

      createResult.success.forEach((book, index) => {
        console.log(
          `      ${index + 1}. "${book.metadata.title}" by ${
            book.metadata.author
          }`
        );
      });

      // UPDATE MANY - Batch updates
      console.log('  ✏️  UPDATE MANY Operations:');

      const updateOperations = createResult.success.map((book) => ({
        id: book.id,
        data: {
          metadata: {
            ...book.metadata,
            price: book.metadata.price * 0.9,
          },
        } as Partial<BookEntity>,
      }));

      const updateResult = await this.bookRepo.updateMany(updateOperations);
      console.log(
        `    💰 Applied 10% discount to ${updateResult.successCount} books`
      );

      updateResult.success.forEach((book) => {
        console.log(
          `      "${book.metadata.title}": $${book.metadata.price.toFixed(2)}`
        );
      });

      // FIND BY IDS - Batch retrieval
      console.log('  🔍 FIND BY IDS Operations:');

      const bookIds = createResult.success.map((book) => book.id);
      const foundBooks = await this.bookRepo.findByIds(bookIds);
      console.log(`    📖 Retrieved ${foundBooks.length} books by IDs`);

      // DELETE MANY - Batch deletion
      console.log('  🗑️  DELETE MANY Operations:');

      const deleteResult = await this.bookRepo.deleteMany(bookIds);
      console.log(`    📚 Deleted ${deleteResult.successCount} books in batch`);
    } catch (error) {
      console.error(
        '  ❌ Error in batch operations:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates upsert operations for data synchronization
   */
  private async demonstrateUpsertOperations(): Promise<void> {
    console.log('🔄 Upsert Operations Demo:');

    try {
      console.log('  🆕 Single UPSERT Operations:');

      // First upsert - creates new document
      const bookData: UpsertDocumentInput<BookEntity> = {
        id: 'book-upsert-001',
        content:
          'The Catcher in the Rye - A coming-of-age story about teenage rebellion',
        metadata: {
          title: 'The Catcher in the Rye',
          author: 'J.D. Salinger',
          isbn: '978-0-316-76948-0',
          publishedYear: 1951,
          genre: 'Coming-of-age Fiction',
          price: 14.5,
          inStock: true,
          rating: 3.8,
          description:
            'A controversial novel about adolescent angst and identity',
        },
      };

      let upsertedBook = await this.bookRepo.upsert(bookData);
      console.log(
        `    📖 First upsert: Created "${upsertedBook.metadata.title}"`
      );
      console.log(`    🔑 ID: ${upsertedBook.id}`);
      console.log(`    📅 Created: ${upsertedBook.createdAt}`);

      // Second upsert - updates existing document
      const updatedBookData: UpsertDocumentInput<BookEntity> = {
        id: 'book-upsert-001',
        content: bookData.content,
        metadata: {
          ...bookData.metadata,
          price: 16.99,
          rating: 4.0,
          inStock: false,
        },
      };

      upsertedBook = await this.bookRepo.upsert(updatedBookData);
      console.log(
        `    📖 Second upsert: Updated "${upsertedBook.metadata.title}"`
      );
      console.log(`    💰 New price: $${upsertedBook.metadata.price}`);
      console.log(`    ⭐ New rating: ${upsertedBook.metadata.rating}/5`);
      console.log(`    🕒 Updated: ${upsertedBook.updatedAt}`);

      // UPSERT MANY - Batch upsert operations
      console.log('  📦 Batch UPSERT Operations:');

      const batchUpsertData: UpsertDocumentInput<BookEntity>[] = [
        {
          id: 'book-batch-001',
          content:
            'Lord of the Flies - A novel about British boys stranded on an uninhabited island',
          metadata: {
            title: 'Lord of the Flies',
            author: 'William Golding',
            isbn: '978-0-571-05686-2',
            publishedYear: 1954,
            genre: 'Allegorical Fiction',
            price: 12.5,
            inStock: true,
            rating: 3.9,
            description: 'A dark tale of civilization and savagery',
          },
        },
        {
          id: 'book-batch-002',
          content:
            'Brave New World - A dystopian novel about a technologically advanced future society',
          metadata: {
            title: 'Brave New World',
            author: 'Aldous Huxley',
            isbn: '978-0-06-085052-4',
            publishedYear: 1932,
            genre: 'Science Fiction',
            price: 13.75,
            inStock: true,
            rating: 4.2,
            description:
              'A prophetic vision of technological control over humanity',
          },
        },
      ];

      const upsertResult = await this.bookRepo.upsertMany(batchUpsertData);
      console.log(`    📚 Batch upserted ${upsertResult.successCount} books`);

      upsertResult.success.forEach((book) => {
        console.log(`      "${book.metadata.title}" - $${book.metadata.price}`);
      });

      // Cleanup upserted documents
      await this.bookRepo.delete('book-upsert-001');
      await this.bookRepo.deleteMany(['book-batch-001', 'book-batch-002']);
      console.log('    🧹 Cleaned up upsert test data');
    } catch (error) {
      console.error(
        '  ❌ Error in upsert operations:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates advanced querying capabilities
   */
  private async demonstrateAdvancedQuerying(): Promise<void> {
    console.log('🔍 Advanced Querying Demo:');

    try {
      // Setup test data
      const testBooks: Array<CreateDocumentInput<BookEntity>> = [
        {
          content:
            'The Hobbit - An adventure tale of a hobbit who embarks on an incredible journey',
          metadata: {
            title: 'The Hobbit',
            author: 'J.R.R. Tolkien',
            isbn: '978-0-547-92822-7',
            publishedYear: 1937,
            genre: 'Fantasy',
            price: 18.99,
            inStock: true,
            rating: 4.6,
            description: 'A delightful adventure in Middle-earth',
          },
        },
        {
          content:
            'Dune - A science fiction epic about politics, religion, and ecology on a desert planet',
          metadata: {
            title: 'Dune',
            author: 'Frank Herbert',
            isbn: '978-0-441-17271-9',
            publishedYear: 1965,
            genre: 'Science Fiction',
            price: 22.5,
            inStock: true,
            rating: 4.4,
            description: 'An epic tale of politics and power in a desert world',
          },
        },
        {
          content:
            'The Handmaids Tale - A dystopian novel about a theocratic society',
          metadata: {
            title: "The Handmaid's Tale",
            author: 'Margaret Atwood',
            isbn: '978-0-385-49081-8',
            publishedYear: 1985,
            genre: 'Dystopian Fiction',
            price: 16.25,
            inStock: false,
            rating: 4.1,
            description: 'A chilling vision of a patriarchal future',
          },
        },
      ];

      const createResult = await this.bookRepo.createMany(testBooks);
      console.log(
        `  📚 Created ${createResult.successCount} test books for querying`
      );

      // FIND ALL with filters
      console.log('  🔍 FIND ALL with Filters:');

      const fantasyBooks = await this.bookRepo.findAll({
        where: { genre: 'Fantasy' },
        orderBy: [{ field: 'rating', direction: 'desc' }],
      });
      console.log(`    🧙 Fantasy books: ${fantasyBooks.length} found`);

      const expensiveBooks = await this.bookRepo.findAll({
        where: {
          price: { $gte: 20 },
          inStock: true,
        },
        limit: 10,
      });
      console.log(
        `    💰 Expensive books (≥$20): ${expensiveBooks.length} found`
      );

      const recentBooks = await this.bookRepo.findAll({
        where: {
          publishedYear: { $gte: 1950 },
        },
        orderBy: [{ field: 'publishedYear', direction: 'desc' }],
        limit: 5,
      });
      console.log(`    📅 Recent books (≥1950): ${recentBooks.length} found`);

      // COUNT operations
      console.log('  🔢 COUNT Operations:');

      const totalBooks = await this.bookRepo.count();
      console.log(`    📚 Total books: ${totalBooks}`);

      const inStockCount = await this.bookRepo.count({ inStock: true });
      console.log(`    ✅ Books in stock: ${inStockCount}`);

      const highRatedCount = await this.bookRepo.count({
        rating: { $gte: 4.0 },
      });
      console.log(`    ⭐ High-rated books (≥4.0): ${highRatedCount}`);

      // EXISTS check
      console.log('  ✅ EXISTS Operations:');

      for (const book of createResult.success) {
        const exists = await this.bookRepo.exists(book.id);
        console.log(
          `    📖 "${book.metadata.title}": ${exists ? 'exists' : 'not found'}`
        );
      }

      // PEEK operation
      console.log('  👀 PEEK Operations:');

      const sampleBooks = await this.bookRepo.peek(3);
      console.log(`    📖 Sample books (first 3):`);
      sampleBooks.forEach((book, index) => {
        console.log(
          `      ${index + 1}. "${book.metadata.title}" by ${
            book.metadata.author
          }`
        );
      });

      // Collection info
      console.log('  ℹ️  Collection Info:');

      const collectionInfo = await this.bookRepo.getCollectionInfo();
      console.log(`    📊 Collection: ${collectionInfo.name}`);
      console.log(`    🔢 Document count: ${collectionInfo.count}`);
      if (collectionInfo.metadata) {
        console.log(
          `    📝 Metadata keys: ${Object.keys(collectionInfo.metadata).length}`
        );
      }

      // Cleanup
      const bookIds = createResult.success.map((book) => book.id);
      const deleteResult = await this.bookRepo.deleteMany(bookIds);
      console.log(`    🧹 Cleaned up ${deleteResult.successCount} test books`);
    } catch (error) {
      console.error(
        '  ❌ Error in advanced querying:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates error handling patterns
   */
  private async demonstrateErrorHandling(): Promise<void> {
    console.log('❌ Error Handling Demo:');

    try {
      console.log('  🧪 Testing error scenarios:');

      // Test 1: Find non-existent document
      const nonExistent = await this.bookRepo.findById('non-existent-id');
      console.log(
        `    🔍 Non-existent ID: ${
          nonExistent ? 'Found (unexpected)' : 'null (expected)'
        }`
      );

      // Test 2: Update non-existent document
      const updateResult = await this.bookRepo.update('non-existent-id', {
        metadata: { title: 'Updated Title' } as any,
      });
      console.log(
        `    ✏️  Update non-existent: ${
          updateResult ? 'Updated (unexpected)' : 'null (expected)'
        }`
      );

      // Test 3: Delete non-existent document
      const deleteResult = await this.bookRepo.delete('non-existent-id');
      console.log(
        `    🗑️  Delete non-existent: ${
          deleteResult ? 'true (unexpected)' : 'false (expected)'
        }`
      );

      // Test 4: Batch operations with mixed valid/invalid IDs
      const mixedIds = ['valid-id-1', 'valid-id-2', 'invalid-id'];
      const batchFindResult = await this.bookRepo.findByIds(mixedIds);
      console.log(
        `    📦 Batch find (${mixedIds.length} IDs): ${batchFindResult.length} found`
      );

      // Test 5: Count with invalid filter
      try {
        const invalidFilterCount = await this.bookRepo.count({
          invalidField: 'value',
        } as any);
        console.log(
          `    🔢 Invalid filter count: ${invalidFilterCount} (handled gracefully)`
        );
      } catch (error) {
        console.log(
          `    🔢 Invalid filter count: Error caught - ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      // Test 6: Collection operations on empty collection
      const emptyCollectionInfo = await this.bookRepo.getCollectionInfo();
      console.log(
        `    📊 Empty collection count: ${emptyCollectionInfo.count}`
      );
    } catch (error) {
      console.error(
        '  ❌ Unexpected error in error handling demo:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates data consistency patterns
   */
  private async demonstrateDataConsistency(): Promise<void> {
    console.log('🔄 Data Consistency Demo:');

    try {
      console.log('  🔒 Transaction-like Operations:');

      // Create author first
      const authorData: CreateDocumentInput<AuthorEntity> = {
        content:
          'Isaac Asimov was a prolific science fiction writer known for his robot and foundation series',
        metadata: {
          name: 'Isaac Asimov',
          birthYear: 1920,
          nationality: 'American',
          genre: 'Science Fiction',
          booksCount: 0, // Will be updated as we add books
          biography:
            'Prolific author of science fiction and popular science books',
        },
      };

      const author = await this.authorRepo.create(authorData);
      console.log(`    👨‍💼 Created author: ${author.metadata.name}`);

      // Create books for this author
      const authorBooks: Array<CreateDocumentInput<BookEntity>> = [
        {
          content:
            'Foundation - The first novel in the Foundation series about psychohistory',
          metadata: {
            title: 'Foundation',
            author: author.metadata.name,
            isbn: '978-0-553-29335-0',
            publishedYear: 1951,
            genre: 'Science Fiction',
            price: 15.99,
            inStock: true,
            rating: 4.3,
            description: 'First book in the epic Foundation saga',
          },
        },
        {
          content:
            'I, Robot - A collection of short stories about robots and artificial intelligence',
          metadata: {
            title: 'I, Robot',
            author: author.metadata.name,
            isbn: '978-0-553-29438-8',
            publishedYear: 1950,
            genre: 'Science Fiction',
            price: 14.5,
            inStock: true,
            rating: 4.2,
            description: 'Classic robot stories exploring AI ethics',
          },
        },
      ];

      const createResult = await this.bookRepo.createMany(authorBooks);
      console.log(
        `    📚 Created ${createResult.successCount} books for author`
      );

      // Update author's book count (maintaining consistency)
      const updatedAuthor = await this.authorRepo.update(author.id, {
        metadata: {
          ...author.metadata,
          booksCount: createResult.successCount,
        },
      });

      console.log(
        `    🔄 Updated author book count: ${updatedAuthor?.metadata.booksCount}`
      );

      // Verify consistency
      const authorBooks2 = await this.bookRepo.findByAuthor(
        author.metadata.name
      );
      const authorRecord = await this.authorRepo.findById(author.id);

      const isConsistent =
        authorBooks2.length === (authorRecord?.metadata.booksCount || 0);
      console.log(
        `    ✅ Data consistency check: ${isConsistent ? 'PASSED' : 'FAILED'}`
      );
      console.log(`      Books in database: ${authorBooks2.length}`);
      console.log(
        `      Author's book count: ${authorRecord?.metadata.booksCount || 0}`
      );

      // Cleanup - maintaining consistency during deletion
      console.log('  🧹 Consistent Cleanup:');

      const bookIds = createResult.success.map((book) => book.id);
      const deleteResult = await this.bookRepo.deleteMany(bookIds);
      console.log(`    📚 Deleted ${deleteResult.successCount} books`);

      // Update author's book count to reflect deletions
      await this.authorRepo.update(author.id, {
        metadata: {
          ...updatedAuthor!.metadata,
          booksCount: Math.max(
            0,
            updatedAuthor!.metadata.booksCount - deleteResult.successCount
          ),
        },
      });

      // Finally delete the author
      const authorDeleted = await this.authorRepo.delete(author.id);
      console.log(
        `    👨‍💼 Deleted author: ${authorDeleted ? 'Success' : 'Failed'}`
      );
    } catch (error) {
      console.error(
        '  ❌ Error in consistency demo:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }
}

// ============================================================================
// 5. MODULE DEFINITION
// ============================================================================

@Module({
  imports: [
    ChromaDBModule.forRoot({
      connection: {
        host: process.env.CHROMADB_HOST || 'localhost',
        port: parseInt(process.env.CHROMADB_PORT || '8000', 10),
        ssl: false,
      },
      embedding: {
        provider: 'openai',
        config: {
          apiKey: process.env.OPENAI_API_KEY || 'test-key',
          model: 'text-embedding-3-small',
        },
      },
      enableHealthCheck: false,
    }),
  ],
  providers: [BookRepository, AuthorRepository, CrudOperationsDemoService],
  exports: [BookRepository, AuthorRepository],
})
export class RepositoryCrudOperationsExampleModule {}

// ============================================================================
// 6. BEST PRACTICES AND PATTERNS
// ============================================================================

/**
 * Repository CRUD Best Practices:
 *
 * 1. **Type Safety**: Always use proper TypeScript types for all operations
 * 2. **Error Handling**: Handle null returns and exceptions gracefully
 * 3. **Batch Operations**: Use createMany, updateMany, deleteMany for efficiency
 * 4. **Validation**: Validate data before CRUD operations
 * 5. **Consistency**: Maintain referential integrity manually
 * 6. **Performance**: Use appropriate filters and limits for large datasets
 * 7. **Monitoring**: Log important operations for debugging
 * 8. **Testing**: Write comprehensive tests for all CRUD scenarios
 *
 * Common Patterns:
 *
 * ```typescript
 * // ✅ Safe null checking
 * const book = await bookRepo.findById(id);
 * if (book) {
 *   // Work with book
 * }
 *
 * // ✅ Batch operations for efficiency
 * const books = await bookRepo.createMany(booksData);
 *
 * // ✅ Proper error handling
 * try {
 *   await bookRepo.update(id, updates);
 * } catch (error) {
 *   logger.error('Update failed', error);
 * }
 *
 * // ✅ Consistent data operations
 * await Promise.all([
 *   bookRepo.deleteMany(bookIds),
 *   authorRepo.update(authorId, { booksCount: 0 }),
 * ]);
 * ```
 */
