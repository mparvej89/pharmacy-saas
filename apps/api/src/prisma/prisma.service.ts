import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Redacts credentials, usernames, passwords, and query tokens from any database URL or error message.
 * Ensures Neon PostgreSQL connection strings are never exposed in logs or API responses.
 */
export function redactDatabaseSecrets(input: string): string {
  if (!input) return input;
  return input
    .replace(
      /(postgres(?:ql)?:\/\/)([^:@\s/]+)(?::([^@\s/]*))?@/gi,
      '$1[REDACTED]:[REDACTED]@',
    )
    .replace(/(password|secret|token|api_key)=([^&\s]+)/gi, '$1=[REDACTED]');
}

/**
 * Normalizes the DATABASE_URL for Neon PostgreSQL over TLS with sensible pooling & timeout defaults
 * if not already specified in the environment variable.
 */
export function buildSafeDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  try {
    const parsed = new URL(rawUrl);
    const isLocalhost =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === 'postgres';

    // Enforce TLS for Neon and remote PostgreSQL hosts unless explicitly configured
    if (!isLocalhost && !parsed.searchParams.has('sslmode')) {
      parsed.searchParams.set('sslmode', 'require');
    }

    // Configure sensible connection pooling & timeout defaults for serverless/Neon
    if (!parsed.searchParams.has('connect_timeout')) {
      const timeoutSec = Math.ceil(
        Number(process.env.DB_CONNECT_TIMEOUT_MS || 15000) / 1000,
      );
      parsed.searchParams.set('connect_timeout', String(timeoutSec));
    }
    if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', '15');
    }
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', '10');
    }

    return parsed.toString();
  } catch {
    // Fallback to rawUrl if URL parsing fails, without logging the raw string
    return rawUrl;
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const safeUrl = buildSafeDatabaseUrl(process.env.DATABASE_URL);
    super({
      ...(safeUrl ? { datasources: { db: { url: safeUrl } } } : {}),
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
      transactionOptions: {
        maxWait: Number(process.env.DB_MAX_WAIT_MS || 5000),
        timeout: Number(process.env.DB_TRANSACTION_TIMEOUT_MS || 15000),
      },
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connection established securely (TLS/Pool ready).');
    } catch (error: any) {
      const safeMessage = redactDatabaseSecrets(
        error?.message || 'Database connection failed',
      );
      this.logger.error(`Database initialization error: ${safeMessage}`);
      throw new Error(safeMessage);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed cleanly.');
  }
}
