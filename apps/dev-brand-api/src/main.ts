/**
 * NestJS AI SaaS Starter Demo Application
 * Demonstrates the usage of all four ecosystem libraries
 */

// Load encapsulated environment configurations before any other imports
import { EnvLoader } from './app/config/env-loader.util';

// Initialize environment loading with only encapsulated .env files
const envResult = EnvLoader.load({
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

  // Start server
  const port = process.env.PORT || 3001;
  await app.listen(port);

  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(
    `📚 API Documentation available at: http://localhost:${port}/docs`
  );
  Logger.log(
    `🔧 Health check available at: http://localhost:${port}/${globalPrefix}/health`
  );
}

bootstrap();
