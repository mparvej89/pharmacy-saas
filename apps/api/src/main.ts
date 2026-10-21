import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global REST API prefix: /api/v1
  app.setGlobalPrefix('api/v1');

  // Strict Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Enable CORS for web frontend
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:4200,http://localhost:8100').split(',');
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Pharmacy Billing & Stock Management SaaS API')
    .setDescription(
      'Multi-tenant REST API for Indian retail and wholesale pharmacies, with FEFO inventory, Indian GST compliance, and Schedule H1 prescription tracking.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Pharmacy SaaS API server running on: http://localhost:${port}/api/v1`);
  logger.log(`Swagger OpenAPI Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
