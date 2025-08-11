/**
 * NestJS AI SaaS Starter Demo Application
 * Demonstrates the usage of all four ecosystem libraries
 */

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
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  
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
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`📚 API Documentation available at: http://localhost:${port}/docs`);
  Logger.log(`🔧 Health check available at: http://localhost:${port}/${globalPrefix}/health`);
}

bootstrap();