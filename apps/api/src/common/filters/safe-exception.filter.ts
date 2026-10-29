import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { redactDatabaseSecrets } from '@/prisma/prisma.service';

/**
 * Global exception filter that guarantees:
 * 1. Database credentials, connection strings, and query tokens are never leaked.
 * 2. Raw Prisma errors, stack traces, and internal configuration details are never exposed to clients.
 * 3. Standard NestJS HttpExceptions preserve their HTTP status and safe validation messages.
 */
@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SafeExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const rawResponse = exception.getResponse();

      let payload: Record<string, any>;
      if (typeof rawResponse === 'string') {
        payload = {
          statusCode: status,
          message: redactDatabaseSecrets(rawResponse),
          timestamp: new Date().toISOString(),
          path: request?.url,
        };
      } else {
        const sanitized = JSON.parse(
          redactDatabaseSecrets(JSON.stringify(rawResponse)),
        );
        // Strip any accidental stack trace property
        delete sanitized.stack;
        payload = {
          statusCode: status,
          ...sanitized,
        };
      }

      response.status(status).json(payload);
      return;
    }

    // Non-HTTP / unhandled exceptions (e.g. PrismaClientKnownRequestError, runtime errors)
    const rawErrorMessage =
      exception instanceof Error ? exception.message : 'Internal server error';
    const safeLogMessage = redactDatabaseSecrets(rawErrorMessage);

    this.logger.error(
      `Unhandled exception on ${request?.method} ${request?.url}: ${safeLogMessage}`,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while processing the request.',
      timestamp: new Date().toISOString(),
      path: request?.url,
    });
  }
}

