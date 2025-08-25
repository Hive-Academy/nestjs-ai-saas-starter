# Coding Standards & Best Practices

## Core Software Engineering Principles

### SOLID Principles
- **Single Responsibility Principle (SRP)**: Each class/service should have one reason to change
  - Services focus on a single domain concern (e.g., `ToolRegistryService` only manages tool registration)
  - Modules group related functionality but delegate specific tasks to specialized services
  
- **Open/Closed Principle (OCP)**: Open for extension, closed for modification
  - Use factory patterns for creating providers (`LLMProviderFactory`)
  - Implement interfaces for extensibility (`LangGraphOptionsFactory`)
  - Use decorators for cross-cutting concerns without modifying core logic

- **Liskov Substitution Principle (LSP)**: Derived classes must be substitutable for base classes
  - All service implementations must honor their interface contracts
  - Provider implementations must be interchangeable through dependency injection

- **Interface Segregation Principle (ISP)**: Clients shouldn't depend on interfaces they don't use
  - Create focused interfaces for specific use cases
  - Separate concerns into distinct service interfaces

- **Dependency Inversion Principle (DIP)**: Depend on abstractions, not concretions
  - Use NestJS dependency injection extensively
  - Inject interfaces/tokens rather than concrete classes where possible

### DRY (Don't Repeat Yourself)
- **Shared Utilities**: Extract common functionality into shared services
- **Base Classes**: Use abstract base classes for common patterns (`DeclarativeWorkflowBase`)
- **Constants**: Define reusable constants in dedicated files (`constants.ts`)
- **Factory Patterns**: Centralize object creation logic

### KISS (Keep It Simple, Stupid)
- **Clear Method Names**: Use descriptive, action-oriented method names
- **Single Purpose Methods**: Each method should do one thing well
- **Avoid Over-Engineering**: Don't add complexity until it's needed
- **Readable Code**: Code should be self-documenting

## Nx Monorepo Best Practices

### Library Organization
```typescript
// ✅ Good: Focused library with clear boundaries
libs/
├── nestjs-chromadb/          # Vector database operations
├── nestjs-neo4j/             # Graph database operations  
└── nestjs-langgraph/         # AI workflow orchestration

// ❌ Bad: Monolithic library with mixed concerns
libs/
└── database-everything/      # Too broad, unclear boundaries
```

### Dependency Management
```typescript
// ✅ Good: Libraries depend on abstractions
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ❌ Bad: Direct dependency on concrete implementations
import { SomeConcreteClass } from '../../../other-lib/concrete-class';
```

### Barrel Exports
```typescript
// ✅ Good: Clean public API through index.ts
// libs/nestjs-chromadb/src/index.ts
export { ChromaDBModule } from './lib/chromadb.module';
export { ChromaDBService } from './lib/services/chromadb.service';
export * from './lib/interfaces';

// ❌ Bad: Exposing internal implementation details
export { InternalHelperClass } from './lib/internal/helper';
```

## NestJS Patterns & Conventions

### Module Structure
```typescript
// ✅ Good: Well-organized module with clear provider groups
@Global()
@Module({})
export class MyModule {
  static forRoot(options: ModuleOptions): DynamicModule {
    return {
      module: MyModule,
      imports: [...this.getRequiredImports()],
      providers: [
        ...this.createCoreProviders(),
        ...this.createFeatureProviders(options),
        ...this.createInfrastructureProviders(),
      ],
      exports: [...this.getPublicExports()],
    };
  }

  private static createCoreProviders(): Provider[] {
    // Group related providers logically
  }
}
```

### Service Implementation
```typescript
// ✅ Good: Service with clear responsibilities
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: Logger,
  ) {}

  async createUser(userData: CreateUserDto): Promise<User> {
    this.logger.log('Creating new user');
    return this.userRepository.create(userData);
  }
}

// ❌ Bad: Service doing too many things
@Injectable()
export class EverythingService {
  // Handles users, orders, payments, notifications, etc.
}
```

### Dependency Injection Best Practices
```typescript
// ✅ Good: Use tokens for flexibility
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
  ) {}
}

// ✅ Good: Provider configuration
{
  provide: USER_REPOSITORY,
  useClass: DatabaseUserRepository, // Can be swapped for testing
}
```

## TypeScript Standards

### Type Safety
```typescript
// ✅ Good: Explicit types and interfaces
interface CreateUserRequest {
  readonly name: string;
  readonly email: string;
  readonly age?: number;
}

async function createUser(request: CreateUserRequest): Promise<User> {
  // Implementation
}

// ❌ Bad: Using 'any' or implicit types
async function createUser(request: any): Promise<any> {
  // Implementation
}
```

### Generic Constraints
```typescript
// ✅ Good: Constrained generics
interface Repository<T extends BaseEntity> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
}

// ❌ Bad: Unconstrained generics
interface Repository<T> {
  findById(id: string): Promise<T | null>;
}
```

### Error Handling
```typescript
// ✅ Good: Specific error types
export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User with ID ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}

// ✅ Good: Proper error handling
async function getUser(id: string): Promise<User> {
  try {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return user;
  } catch (error) {
    this.logger.error('Failed to get user', { userId: id, error });
    throw error;
  }
}
```

## Code Organization Patterns

### File Naming Conventions
```
// Services
user.service.ts
user.service.spec.ts

// Controllers  
user.controller.ts
user.controller.spec.ts

// Modules
user.module.ts

// Interfaces
user.interface.ts
create-user.dto.ts

// Constants
user.constants.ts

// Decorators
user.decorator.ts
```

### Import Organization
```typescript
// ✅ Good: Organized imports
// 1. Node modules
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// 2. Internal library imports
import { ChromaDBService } from '@hive-academy/nestjs-chromadb';

// 3. Relative imports (grouped by type)
import { UserRepository } from './repositories/user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './interfaces/user.interface';

// ❌ Bad: Mixed import order
import { User } from './interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
```

### Method Organization
```typescript
// ✅ Good: Logical method organization
export class UserService {
  // 1. Constructor
  constructor(private readonly userRepo: UserRepository) {}

  // 2. Public methods (alphabetical or by feature)
  async createUser(data: CreateUserDto): Promise<User> {}
  
  async deleteUser(id: string): Promise<void> {}
  
  async getUserById(id: string): Promise<User> {}
  
  async updateUser(id: string, data: UpdateUserDto): Promise<User> {}

  // 3. Private methods
  private validateUserData(data: CreateUserDto): void {}
  
  private formatUserResponse(user: User): UserResponse {}
}
```

## Testing Standards

### Test Organization
```typescript
// ✅ Good: Well-structured test file
describe('UserService', () => {
  let service: UserService;
  let mockRepository: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: USER_REPOSITORY,
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    mockRepository = module.get(USER_REPOSITORY);
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      // Arrange
      const userData = { name: 'John', email: 'john@example.com' };
      const expectedUser = { id: '1', ...userData };
      mockRepository.create.mockResolvedValue(expectedUser);

      // Act
      const result = await service.createUser(userData);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockRepository.create).toHaveBeenCalledWith(userData);
    });

    it('should throw error when repository fails', async () => {
      // Arrange
      const userData = { name: 'John', email: 'john@example.com' };
      mockRepository.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.createUser(userData)).rejects.toThrow('Database error');
    });
  });
});
```

## Performance & Security

### Performance Best Practices
```typescript
// ✅ Good: Efficient database queries
async function getUsersWithPosts(userIds: string[]): Promise<UserWithPosts[]> {
  // Single query with joins instead of N+1 queries
  return this.userRepository.findWithPosts(userIds);
}

// ✅ Good: Caching expensive operations
@Injectable()
export class ExpensiveService {
  private cache = new Map<string, any>();

  async getExpensiveData(key: string): Promise<any> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const data = await this.performExpensiveOperation(key);
    this.cache.set(key, data);
    return data;
  }
}
```

### Security Considerations
```typescript
// ✅ Good: Input validation
@Injectable()
export class UserService {
  async createUser(@Body() userData: CreateUserDto): Promise<User> {
    // DTO automatically validates input
    return this.userRepository.create(userData);
  }
}

// ✅ Good: Sanitize sensitive data in logs
this.logger.log('User created', { 
  userId: user.id, 
  email: this.sanitizeEmail(user.email) 
});
```

## Documentation Standards

### JSDoc Comments
```typescript
/**
 * Creates a new user in the system
 * 
 * @param userData - The user data to create
 * @returns Promise resolving to the created user
 * @throws {ValidationError} When user data is invalid
 * @throws {ConflictError} When user email already exists
 * 
 * @example
 * ```typescript
 * const user = await userService.createUser({
 *   name: 'John Doe',
 *   email: 'john@example.com'
 * });
 * ```
 */
async createUser(userData: CreateUserDto): Promise<User> {
  // Implementation
}
```

### README Documentation
Each library should include:
- Clear installation instructions
- Quick start guide with examples
- API reference with all public methods
- Configuration options
- Best practices and common patterns
- Troubleshooting section

## Code Review Checklist

### Before Submitting
- [ ] All tests pass
- [ ] Code follows naming conventions
- [ ] No unused imports or variables
- [ ] Error handling is appropriate
- [ ] Documentation is updated
- [ ] Performance implications considered
- [ ] Security implications reviewed

### Review Focus Areas
- [ ] SOLID principles adherence
- [ ] Proper dependency injection usage
- [ ] Type safety and interface design
- [ ] Test coverage and quality
- [ ] Error handling completeness
- [ ] Performance and scalability
- [ ] Security considerations
