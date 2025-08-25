# Contributing to NestJS AI SaaS Starter

Thank you for your interest in contributing to the NestJS AI SaaS Starter! This document provides guidelines and information for contributors.

## 🌟 Ways to Contribute

- **🐛 Bug Reports**: Report bugs and issues
- **✨ Feature Requests**: Suggest new features or improvements
- **📝 Documentation**: Improve documentation and examples
- **🔧 Code Contributions**: Submit bug fixes and new features
- **🧪 Testing**: Add tests and improve test coverage
- **📦 Library Development**: Enhance the published libraries

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (recommended: 20+)
- npm 8+
- Docker (for running databases)
- Git

### Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/your-username/nestjs-ai-saas-starter.git
   cd nestjs-ai-saas-starter
   ```

2. **Install Dependencies**

   ```bash
   npm install
   # This automatically sets up Git hooks and development environment
   ```

3. **Environment Configuration**

   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

4. **Start Development Services**

   ```bash
   npm run dev:services  # Start databases
   npx nx serve nestjs-ai-saas-starter-demo  # Start application
   ```

5. **Verify Setup**

   ```bash
   curl http://localhost:3000/health
   npm run test  # Run tests
   ```

## 📋 Development Guidelines

### Code Style

We use automated tools to maintain consistent code style:

- **ESLint**: Code linting and best practices
- **Prettier**: Code formatting
- **TypeScript**: Type safety and modern JavaScript features

```bash
# Format code
npm run format

# Fix linting issues
npm run lint:fix

# Check formatting
npm run format:check
```

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
# Format: type(scope): description
git commit -m "feat(chromadb): add vector similarity search"
git commit -m "fix(neo4j): resolve connection timeout issue"
git commit -m "docs: update installation guide"
git commit -m "test(langgraph): add workflow integration tests"
```

#### Commit Types

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Maintenance tasks
- `revert`: Reverting previous commits

#### Scopes

- `chromadb`: ChromaDB library changes
- `neo4j`: Neo4j library changes
- `langgraph`: LangGraph library changes
- `deps`: Dependency updates
- `release`: Release-related changes
- `ci`: CI/CD configuration
- `docs`: Documentation
- `hooks`: Git hooks configuration
- `scripts`: Build/utility scripts

### Branch Naming

Use descriptive branch names with prefixes:

```bash
feat/chromadb-vector-search
fix/neo4j-connection-timeout
docs/update-readme
refactor/langgraph-workflow-builder
```

### Pull Request Process

1. **Create Feature Branch**

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make Changes**

   - Write code following our style guidelines
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**

   ```bash
   npm run test                    # Run all tests
   npm run build:libs             # Build libraries
   npm run lint:fix               # Fix linting issues
   npm run docs:generate          # Update documentation
   ```

4. **Commit Changes**

   ```bash
   git add .
   git commit -m "feat(scope): your descriptive message"
   ```

5. **Push and Create PR**

   ```bash
   git push origin feat/your-feature-name
   # Create pull request on GitHub
   ```

### Pull Request Guidelines

- **Title**: Use conventional commit format
- **Description**: Provide clear description of changes
- **Testing**: Include test results and coverage information
- **Documentation**: Update relevant documentation
- **Breaking Changes**: Clearly mark any breaking changes
- **Screenshots**: Include screenshots for UI changes

## 🧪 Testing Guidelines

### Test Structure

```
src/
├── lib/
│   ├── service.ts
│   ├── service.spec.ts          # Unit tests
│   └── service.integration.spec.ts  # Integration tests
└── __tests__/
    └── e2e/                     # End-to-end tests
```

### Writing Tests

#### Unit Tests

```typescript
describe('ChromaDBService', () => {
  let service: ChromaDBService;
  let mockClient: jest.Mocked<ChromaClient>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ChromaDBService, { provide: CHROMADB_CLIENT, useValue: mockClient }],
    }).compile();

    service = module.get<ChromaDBService>(ChromaDBService);
  });

  it('should add documents successfully', async () => {
    // Arrange
    const documents = [{ id: '1', document: 'test' }];
    mockClient.getOrCreateCollection.mockResolvedValue(mockCollection);

    // Act
    const result = await service.addDocuments('test-collection', documents);

    // Assert
    expect(result).toBeDefined();
    expect(mockCollection.add).toHaveBeenCalledWith(
      expect.objectContaining({
        ids: ['1'],
        documents: ['test'],
      })
    );
  });
});
```

#### Integration Tests

```typescript
describe('ChromaDB Integration', () => {
  let app: INestApplication;
  let chromaService: ChromaDBService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ChromaDBModule.forRoot({
          connection: { host: 'localhost', port: 8000 },
          embedding: { provider: 'custom', embeddingFunction: mockEmbedding },
        }),
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    chromaService = module.get<ChromaDBService>(ChromaDBService);
  });

  it('should perform end-to-end document operations', async () => {
    // Test real database operations
    const collection = 'integration-test';
    const documents = [
      { id: '1', document: 'First document', metadata: { type: 'test' } },
      { id: '2', document: 'Second document', metadata: { type: 'test' } },
    ];

    await chromaService.addDocuments(collection, documents);
    const results = await chromaService.queryDocuments(collection, {
      queryTexts: ['First'],
      nResults: 1,
    });

    expect(results.ids[0]).toContain('1');
  });
});
```

### Test Commands

```bash
# Run all tests
npm run test

# Run tests for specific project
npx nx test nestjs-chromadb

# Run tests with coverage
npx nx test nestjs-chromadb --coverage

# Run integration tests only
npx nx test nestjs-chromadb --testPathPattern=integration

# Run tests in watch mode
npx nx test nestjs-chromadb --watch

# Run affected tests only
npx nx affected:test
```

## 📦 Library Development

### Creating New Libraries

```bash
# Generate new library
npx nx g @nx/node:lib my-new-lib

# Make it publishable
# Update libs/my-new-lib/project.json with build and publish targets
# Update libs/my-new-lib/package.json with proper metadata
```

### Library Structure

```
libs/my-library/
├── src/
│   ├── lib/
│   │   ├── my-library.module.ts     # Main module
│   │   ├── services/                # Service implementations
│   │   ├── interfaces/              # TypeScript interfaces
│   │   ├── decorators/              # Custom decorators
│   │   └── constants.ts             # Constants and tokens
│   └── index.ts                     # Public API exports
├── README.md                        # Library documentation
├── package.json                     # Library metadata
├── project.json                     # Nx project configuration
└── typedoc.json                     # Documentation configuration
```

### Publishing Libraries

```bash
# Test publishing (dry run)
npm run publish:dry-run

# Build libraries
npm run build:libs

# Publish all libraries
npm run publish:libs

# Version libraries
npm run version:libs
```

## 🔍 Code Review Process

### For Contributors

1. **Self-Review**: Review your own code before submitting
2. **Test Coverage**: Ensure adequate test coverage
3. **Documentation**: Update relevant documentation
4. **Clean History**: Use meaningful commit messages
5. **Small PRs**: Keep pull requests focused and manageable

### For Reviewers

1. **Functionality**: Does the code work as intended?
2. **Code Quality**: Is the code clean and maintainable?
3. **Performance**: Are there any performance implications?
4. **Security**: Are there any security concerns?
5. **Tests**: Are there adequate tests?
6. **Documentation**: Is documentation updated?

### Review Checklist

- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] New functionality has tests
- [ ] Documentation is updated
- [ ] No breaking changes (or properly documented)
- [ ] Performance impact considered
- [ ] Security implications reviewed
- [ ] Commit messages follow convention

## 🐛 Bug Reports

### Before Reporting

1. **Search Existing Issues**: Check if the bug is already reported
2. **Reproduce**: Ensure you can consistently reproduce the issue
3. **Minimal Example**: Create a minimal reproduction case
4. **Environment**: Note your environment details

### Bug Report Template

```markdown
**Bug Description**
A clear and concise description of the bug.

**To Reproduce**
Steps to reproduce the behavior:

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
A clear description of what you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**

- OS: [e.g. macOS 12.0]
- Node.js: [e.g. 18.17.0]
- npm: [e.g. 9.6.7]
- Package Version: [e.g. 1.0.0]

**Additional Context**
Add any other context about the problem here.

**Minimal Reproduction**
Link to a minimal reproduction repository or code snippet.
```

## ✨ Feature Requests

### Feature Request Template

```markdown
**Feature Description**
A clear and concise description of the feature you'd like to see.

**Problem Statement**
What problem does this feature solve?

**Proposed Solution**
Describe your proposed solution.

**Alternatives Considered**
Describe any alternative solutions you've considered.

**Use Cases**
Describe specific use cases for this feature.

**Additional Context**
Add any other context or screenshots about the feature request.
```

## 📚 Documentation

### Documentation Types

- **API Documentation**: Generated from TypeScript comments
- **User Guides**: Step-by-step tutorials and guides
- **Examples**: Code examples and sample applications
- **Architecture**: System design and architecture decisions

### Writing Documentation

1. **Clear and Concise**: Use simple, clear language
2. **Code Examples**: Include working code examples
3. **Up-to-Date**: Keep documentation synchronized with code
4. **Comprehensive**: Cover all public APIs and features

### Documentation Commands

```bash
# Generate API documentation
npm run docs:generate

# Serve documentation locally
npm run docs:serve

# Build complete documentation site
npm run docs:build-site
```

## 🏆 Recognition

Contributors are recognized in several ways:

- **Contributors List**: Listed in README.md
- **Release Notes**: Mentioned in release notes
- **GitHub**: Contributor statistics and graphs
- **NPM**: Listed as contributors in package.json

## 📞 Getting Help

- **GitHub Discussions**: For questions and general discussion
- **GitHub Issues**: For bug reports and feature requests
- **Email**: <support@hive-academy.dev> for private inquiries

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You

Thank you for contributing to the NestJS AI SaaS Starter! Your contributions help make this project better for everyone.

---

**Happy Contributing! 🚀**
