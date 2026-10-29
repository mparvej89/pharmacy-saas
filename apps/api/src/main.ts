import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger, ForbiddenException } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SafeExceptionFilter } from './common/filters/safe-exception.filter';

/**
 * Parses CORS_ORIGIN into an explicit allowlist of origins.
 * Rejects wildcard ('*') origins in production to enforce strict origin access control.
 */
export function parseAllowedOrigins(
  corsOriginEnv?: string,
  nodeEnv: string = process.env.NODE_ENV || 'development',
): string[] {
  const defaultDevOrigins = 'http://localhost:4200,http://localhost:8100';
  const raw = corsOriginEnv || defaultDevOrigins;

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => {
      if (!origin) return false;
      if (nodeEnv === 'production' && origin === '*') {
        return false; // Disallow wildcard in production
      }
      return true;
    });
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Global REST API prefix: /api/v1
  app.setGlobalPrefix('api/v1');

  // Global Safe Exception Filter (prevents leaking credentials, Prisma internals, or stack traces)
  app.useGlobalFilters(new SafeExceptionFilter());

  // Strict Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Strict CORS configuration (only explicit production & required development origins)
  const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGIN, nodeEnv);
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow server-to-server, Render health probes, and curl requests without an Origin header
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(
        new ForbiddenException(`Origin "${origin}" is not allowed by CORS`),
        false,
      );
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-Store-Id',
      'X-Requested-With',
      'Accept',
    ],
  });

  // Enable graceful shutdown hooks for Render container lifecycle (SIGTERM)
  app.enableShutdownHooks();

  // Swagger OpenAPI Documentation (disabled in production unless ENABLE_SWAGGER=true)
  if (nodeEnv !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
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
  }

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';

  await app.listen(port, host);
  logger.log(
    `Pharmacy SaaS API server running in ${nodeEnv} mode on: http://${host}:${port}/api/v1`,
  );
  logger.log(
    `Health Check Endpoint: http://${host}:${port}/api/v1/health`,
  );
}

if (require.main === module) {
  bootstrap();
}
