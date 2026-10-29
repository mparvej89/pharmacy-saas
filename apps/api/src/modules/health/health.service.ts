import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService, redactDatabaseSecrets } from '@/prisma/prisma.service';

export interface DatabaseHealthStatus {
  status: 'ok' | 'degraded' | 'down';
  database: {
    connected: boolean;
    latencyMs: number;
    provider: 'postgresql';
    tlsEnabled: boolean;
    pooledConnection: boolean;
  };
  timestamp: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Inspects DATABASE_URL metadata safely without ever returning or logging
   * hostnames, usernames, passwords, or query tokens.
   */
  private getConnectionMetadata(): { tlsEnabled: boolean; pooledConnection: boolean } {
    const rawUrl = process.env.DATABASE_URL || '';
    try {
      const parsed = new URL(rawUrl);
      const sslMode = parsed.searchParams.get('sslmode') || '';
      const isLocalhost =
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname === 'postgres';
      const tlsEnabled =
        sslMode === 'require' ||
        sslMode === 'verify-full' ||
        sslMode === 'verify-ca' ||
        !isLocalhost;
      const pooledConnection =
        parsed.hostname.includes('-pooler') ||
        parsed.searchParams.has('pgbouncer') ||
        parsed.searchParams.has('connection_limit');

      return { tlsEnabled, pooledConnection };
    } catch {
      return { tlsEnabled: false, pooledConnection: false };
    }
  }

  async checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
    const start = Date.now();
    const meta = this.getConnectionMetadata();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - start;

      return {
        status: 'ok',
        database: {
          connected: true,
          latencyMs,
          provider: 'postgresql',
          tlsEnabled: meta.tlsEnabled,
          pooledConnection: meta.pooledConnection,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      const latencyMs = Date.now() - start;
      const safeError = redactDatabaseSecrets(
        error?.message || 'Database connectivity check failed',
      );
      this.logger.error(`Database health check failed: ${safeError}`);

      throw new ServiceUnavailableException({
        status: 'down',
        database: {
          connected: false,
          latencyMs,
          provider: 'postgresql',
          tlsEnabled: meta.tlsEnabled,
          pooledConnection: meta.pooledConnection,
        },
        error: 'Database connectivity check failed',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

