# Docker Configuration Documentation

## Overview

Anubis uses a simplified Docker setup optimized for development speed. We run **databases in Docker** and the **API locally** for rapid iteration during development.

## Architecture Decision

We **do NOT use Nx Docker integration** (`@nx/docker`) because:
1. It adds unnecessary complexity for our use case
2. We prioritize fast local development with hot reload
3. Production deployments use standard Docker Compose, not Nx builds

## Development Setup

### Quick Start

```bash
# Start all databases (Neo4j, ChromaDB, Redis)
npm run dev:services

# In another terminal, run the API
nx serve agent-api

# Or run everything at once
npm run dev
```

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start databases + API together |
| `npm run dev:services` | Start only database services |
| `npm run dev:stop` | Stop all Docker services |
| `npm run dev:reset` | Stop and remove all volumes (clean slate) |
| `npm run dev:logs` | View Docker service logs |

### Development Configuration

**File:** `docker-compose.dev.yml`

```yaml
services:
  neo4j:
    image: neo4j:5.26-community  # Latest LTS version
    ports: 7474 (browser), 7687 (bolt)
    environment: Development password, graph-data-science plugin
    
  chromadb:
    image: chromadb/chroma:latest
    ports: 8000
    environment: Telemetry disabled, debug logging
    
  redis:
    image: redis:latest
    ports: 6379
    configuration: Append-only persistence
```

### Environment Variables

Create `.env` in project root:

```env
# Required for API
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=development_password
CHROMADB_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379

# LLM Providers (at least one required)
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
```

## Production Setup

### Prerequisites

1. **Docker & Docker Compose** installed on production server
2. **Environment variables** properly configured
3. **Volumes** for data persistence

### Production Dockerfile

**File:** `docker/Dockerfile`

```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS builder
- Installs dependencies
- Builds all Nx projects
- Outputs to dist/

FROM node:18-alpine AS runtime
- Copies only dist/ and production dependencies
- Runs as non-root user
- Exposes port 3001
```

### Production Deployment

1. **Build the production image:**
```bash
docker build -f docker/Dockerfile -t anubis-agent:latest .
```

2. **Create production `.env.production`:**
```env
# Database Configuration
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=STRONG_PRODUCTION_PASSWORD
CHROMADB_URL=http://chromadb:8000
REDIS_URL=redis://redis:6379

# API Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# LLM Providers
OPENAI_API_KEY=production_key
ANTHROPIC_API_KEY=production_key

# Security
JWT_SECRET=random_long_string
CORS_ORIGINS=https://yourdomain.com
```

3. **Use production docker-compose.yml:**
```bash
docker compose -f docker-compose.yml --env-file .env.production up -d
```

### Production Configuration

**File:** `docker-compose.yml`

Key differences from development:
- Uses built `anubis-agent:latest` image instead of local code
- Configures proper resource limits
- Includes health checks and restart policies
- Uses named volumes for data persistence
- Runs services with production settings

### Production Checklist

- [ ] Set strong passwords for all services
- [ ] Configure firewall rules (only expose necessary ports)
- [ ] Set up SSL/TLS termination (use reverse proxy like Nginx)
- [ ] Configure volume backups
- [ ] Set resource limits in docker-compose.yml
- [ ] Enable production logging
- [ ] Configure monitoring (Prometheus/Grafana recommended)
- [ ] Set up health check endpoints
- [ ] Use secrets management (Docker Secrets or external vault)

## Key Differences: Dev vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| **API** | Runs locally with hot reload | Runs in Docker container |
| **Build** | No build needed, uses TypeScript | Pre-built JavaScript in dist/ |
| **Volumes** | Local bind mounts | Named Docker volumes |
| **Passwords** | Simple defaults | Strong, unique passwords |
| **Logging** | Debug level | Info/Warning level |
| **Resources** | No limits | Memory/CPU limits set |
| **Restart** | Manual | Automatic (unless-stopped) |

## Troubleshooting

### Common Issues

**Ports already in use:**
```bash
# Check what's using the port
netstat -an | findstr :3001

# Stop conflicting service or change port in .env
PORT=3002
```

**Database connection failures:**
```bash
# Ensure services are running
docker ps

# Check logs
npm run dev:logs

# Reset if needed
npm run dev:reset
```

**Permission issues on Linux:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again
```

## Migration from Old Setup

If upgrading from the old multi-script setup:

1. Delete old scripts: `docker-*.ps1`, `dev-*.ps1`, `*.sh`
2. Remove `docker-compose.dev-*.yml` variants
3. Update any CI/CD pipelines to use new npm scripts
4. Ensure `.env` file has all required variables

## Best Practices

1. **Development:** Always run API locally for fastest iteration
2. **Testing:** Test with `docker:prod` before deploying
3. **Secrets:** Never commit `.env` files
4. **Volumes:** Regularly backup production volumes
5. **Updates:** Keep base images updated for security
6. **Monitoring:** Always monitor resource usage in production

## Quick Reference

```bash
# Development workflow
npm run dev:services  # Start databases
nx serve agent-api    # Start API
npm run dev:stop      # Stop everything

# Production workflow
docker build -f docker/Dockerfile -t anubis-agent:latest .
docker compose -f docker-compose.yml up -d

# Debugging
npm run dev:logs      # View logs
npm run dev:reset     # Clean reset
docker ps             # Check running containers
docker stats          # Monitor resources
```