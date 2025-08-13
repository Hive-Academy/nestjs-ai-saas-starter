# NestJS AI SaaS Starter Demo

A comprehensive demonstration application showcasing the capabilities of the NestJS AI SaaS Starter ecosystem libraries.

## Features

This demo application integrates all four ecosystem libraries:

- **@hive-academy/nestjs-chromadb** - Vector database operations and semantic search
- **@hive-academy/nestjs-neo4j** - Graph database operations and relationship modeling
- **@hive-academy/nestjs-langgraph** - AI workflow orchestration with LangGraph

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- OpenAI API key (for LangGraph features)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

### 3. Start External Services

```bash
docker-compose up -d
```

This starts:

- ChromaDB on http://localhost:8000
- Neo4j on http://localhost:7474 (browser) and bolt://localhost:7687
- Redis on localhost:6379

### 4. Run the Application

```bash
npx nx serve nestjs-ai-saas-starter-demo
```

The application will be available at:

- API: http://localhost:3000/api
- Swagger Docs: http://localhost:3000/docs
- Health Check: http://localhost:3000/api/health

## API Endpoints

### Documents (ChromaDB)

- `POST /api/documents` - Create and index a document
- `GET /api/documents/search` - Semantic search for documents
- `GET /api/documents/collections` - List all collections
- `GET /api/documents/collection/:name` - Get collection details
- `DELETE /api/documents/:id` - Delete a document
- `POST /api/documents/embedding` - Generate embeddings for text

### Graph (Neo4j)

- `POST /api/graph/node` - Create a node
- `GET /api/graph/node/:id` - Get node by ID
- `DELETE /api/graph/node/:id` - Delete a node
- `POST /api/graph/relationship` - Create a relationship
- `GET /api/graph/relationships/:nodeId` - Get node relationships
- `POST /api/graph/query` - Execute Cypher query
- `GET /api/graph/shortest-path` - Find shortest path between nodes
- `GET /api/graph/neighbors/:nodeId` - Get node neighbors
- `GET /api/graph/stats` - Get graph statistics

### Workflows (LangGraph)

- `GET /api/workflows` - List available workflows
- `GET /api/workflows/:id` - Get workflow details
- `POST /api/workflows/:id/execute` - Execute a workflow
- `GET /api/workflows/:id/status/:executionId` - Get execution status
- `POST /api/workflows/:id/approve/:executionId` - Approve workflow step

## Example Usage

### 1. Index a Document

```bash
curl -X POST http://localhost:3000/api/documents \
  -H "Content-Type: application/json" \
  -d '{
    "content": "NestJS is a framework for building efficient, scalable Node.js applications.",
    "metadata": {"category": "framework", "language": "typescript"}
  }'
```

### 2. Search Documents

```bash
curl "http://localhost:3000/api/documents/search?query=typescript%20framework"
```

### 3. Create Graph Nodes and Relationships

```bash
# Create a node
curl -X POST http://localhost:3000/api/graph/node \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Framework",
    "properties": {"name": "NestJS", "type": "backend"}
  }'

# Create a relationship
curl -X POST http://localhost:3000/api/graph/relationship \
  -H "Content-Type: application/json" \
  -d '{
    "fromNodeId": "1",
    "toNodeId": "2",
    "type": "USES"
  }'
```

### 4. Execute a Workflow

```bash
curl -X POST http://localhost:3000/api/workflows/sample/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input": {"text": "Process this data"},
    "metadata": {"user": "demo"}
  }'
```

## Development

### Running Tests

```bash
npx nx test nestjs-ai-saas-starter-demo
```

### Building for Production

```bash
npx nx build nestjs-ai-saas-starter-demo
```

### Docker Development

To run the entire stack in Docker:

```bash
# Build the application image
docker build -t nestjs-ai-demo .

# Run with docker-compose
docker-compose -f docker-compose.full.yml up
```

## Architecture

The demo application follows a modular architecture:

```
src/
├── app/                    # Main application module
├── modules/
│   ├── documents/         # ChromaDB integration module
│   │   ├── dto/          # Data transfer objects
│   │   ├── documents.controller.ts
│   │   ├── documents.service.ts
│   │   └── documents.module.ts
│   ├── graph/            # Neo4j integration module
│   │   ├── dto/
│   │   ├── graph.controller.ts
│   │   ├── graph.service.ts
│   │   └── graph.module.ts
│   └── workflows/        # LangGraph integration module
│       ├── dto/
│       ├── workflows.controller.ts
│       ├── workflows.service.ts
│       ├── sample.workflow.ts
│       └── workflows.module.ts
└── main.ts               # Application bootstrap

```

## Troubleshooting

### ChromaDB Connection Issues

- Ensure Docker is running
- Check if port 8000 is available
- Verify ChromaDB container logs: `docker logs chromadb`

### Neo4j Connection Issues

- Default credentials: neo4j/password
- Access browser UI at http://localhost:7474
- Check Neo4j logs: `docker logs neo4j`

### OpenAI API Issues

- Verify your API key is set in .env
- Check API key permissions and quotas
- Enable debug mode: `LANGGRAPH_DEBUG=true`

## License

MIT
