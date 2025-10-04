/**
 * NestJS AI SaaS Starter Demo Application
 * Demonstrates the usage of all four ecosystem libraries
 */

// Load encapsulated environment configurations before any other imports
import { EnvLoader } from './app/config/env-loader.util';

// Initialize environment loading with only encapsulated .env files
import { join } from 'path';
// Use process.cwd() directly - when running via nx or node, we're already in project root
const projectRoot = process.cwd();
const envResult = EnvLoader.load({
  rootDir: projectRoot,
  envFiles: [
    '.env.chromadb', // ChromaDB & Memory configuration
    '.env.neo4j', // Neo4j configuration
    '.env.llm', // LLM providers configuration
    '.env.platform', // LangGraph platform configuration
    '.env.app', // Application-level configuration
  ],
  expand: true,
});

console.log('🔧 Encapsulated environment loaded:', {
  loadedFiles: envResult.loadedFiles,
  errors: envResult.errors,
});

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { AppStreamingManager } from './app/services/app-streaming-manager.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Enable CORS
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('NestJS AI SaaS Starter Demo')
    .setDescription('API documentation for the AI SaaS Starter ecosystem demo')
    .setVersion('1.0')
    .addTag('documents', 'ChromaDB document operations')
    .addTag('graph', 'Neo4j graph operations')
    .addTag('workflows', 'LangGraph workflow operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Initialize the app completely first
  await app.init();

  // Start server FIRST - ensure HTTP server and WebSocket server are ready
  const port = process.env.PORT || 3000;
  await app.listen(port);

  // Initialize streaming services after HTTP server is ready
  try {
    Logger.log('🚀 Initializing streaming services...');
    const streamingManager = app.get(AppStreamingManager);
    await streamingManager.initializeStreaming();
    Logger.log('✅ Streaming services initialized successfully');
  } catch (error) {
    Logger.error('❌ Failed to initialize streaming services:', error);
    Logger.warn('⚠️  Application will continue without streaming capabilities');
  }

  // Setup graceful shutdown
  process.on('SIGTERM', async () => {
    Logger.log('🛑 SIGTERM received, shutting down gracefully...');
    try {
      const streamingManager = app.get(AppStreamingManager);
      await streamingManager.stopStreaming();
      await app.close();
      Logger.log('✅ Application shut down successfully');
      process.exit(0);
    } catch (error) {
      Logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });

  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(
    `📚 API Documentation available at: http://localhost:${port}/docs`
  );
  Logger.log(
    `🔧 Health check available at: http://localhost:${port}/${globalPrefix}/health`
  );
  Logger.log(
    `🔌 WebSocket streaming available at: ws://localhost:${port}/streaming`
  );
  Logger.log(`🌊 Frontend should connect to: ws://localhost:${port}/streaming`);
}

bootstrap();
