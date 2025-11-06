# Streaming Architecture Analysis

**Document Purpose**: Complete architectural analysis of the real-time streaming infrastructure for WebSocket-based workflow event broadcasting.

**Last Updated**: 2025-01-07

---

## Executive Summary

The streaming architecture implements a **three-layer event-driven system** for real-time workflow execution monitoring via WebSocket connections. The system routes events from LangGraph workflows through an EventEmitter2 bus to WebSocket clients, with proper namespace isolation and port separation.

### Key Components

1. **AppStreamingManager** - Application lifecycle coordinator (main.ts integration)
2. **StreamingWebSocketService** - Socket.io server with namespace support (port 8080)
3. **WebSocketBridgeService** - Event router (EventEmitter2 → WebSocket)
4. **TokenStreamingService** - Token buffering and emission
5. **WorkflowStreamingOrchestrator** - High-level consumer facade

---

## Port Architecture

### Current Configuration (Unified)

| Service                 | Port | URL                           | Purpose                  |
| ----------------------- | ---- | ----------------------------- | ------------------------ |
| **NestJS App**          | 3000 | http://localhost:3000         | REST API, Swagger docs   |
| **WebSocket Server**    | 8080 | ws://localhost:8080           | Socket.io namespace root |
| **Streaming Namespace** | 8080 | ws://localhost:8080/streaming | Event broadcasting       |

### Environment Variables

```bash
# Main application
PORT=3000

# WebSocket server (separate port)
WEBSOCKET_PORT=8080
WEBSOCKET_NAMESPACE=/streaming
WEBSOCKET_ENABLED=true
```

**Source**: `.env.app:52-55`

### Why Separate Ports?

1. **Scalability**: WebSocket server can be horizontally scaled independently
2. **Resource Isolation**: Long-lived WebSocket connections don't block HTTP requests
3. **Security**: Different firewall rules for HTTP vs WebSocket traffic
4. **Monitoring**: Separate metrics and health checks per service

---

## Testing & Verification

Run the backend and check logs for proper port configuration:

```bash
npx nx serve dev-brand-api

# Expected logs:
🚀 Application is running on: http://localhost:3000/api
🔌 WebSocket streaming available at: ws://localhost:8080/streaming
🌊 Frontend should connect to: ws://localhost:8080/streaming
```
