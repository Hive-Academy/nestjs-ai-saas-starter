/**
 * NestJS AI SaaS Starter Demo Application
 * Demonstrates the usage of all four ecosystem libraries
 */

// Load encapsulated environment configurations before any other imports
import { EnvLoader } from './app/config/env-loader.util';

const envResult = EnvLoader.load();

console.log('🔧 Encapsulated environment loaded:', {
  loadedFiles: envResult.loadedFiles,
  errors: envResult.errors,
});

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookie parser middleware (MUST be before CORS and other middleware)
  app.use(cookieParser());

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

  // Setup graceful shutdown
  process.on('SIGTERM', async () => {
    Logger.log('🛑 SIGTERM received, shutting down gracefully...');
    try {
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
}

bootstrap();
