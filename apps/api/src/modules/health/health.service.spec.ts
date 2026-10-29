import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';
import { PrismaService, redactDatabaseSecrets, buildSafeDatabaseUrl } from '@/prisma/prisma.service';

describe('HealthService & Database Security Utilities', () => {
  let service: HealthService;
  let prismaMock: { $queryRaw: jest.Mock };
  const originalEnv = process.env.DATABASE_URL;

  beforeEach(async () => {
    prismaMock = {
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  afterEach(() => {
    process.env.DATABASE_URL = originalEnv;
  });

  it('returns healthy status with TLS and pool metadata without exposing credentials', async () => {
    process.env.DATABASE_URL =
      'postgresql://neon_user:superSecretPass123@ep-cool-pharmacy-pooler.ap-southeast-1.aws.neon.tech/pharmacy_db?sslmode=require';
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await service.checkDatabaseHealth();

    expect(result.status).toBe('ok');
    expect(result.database.connected).toBe(true);
    expect(result.database.provider).toBe('postgresql');
    expect(result.database.tlsEnabled).toBe(true);
    expect(result.database.pooledConnection).toBe(true);
    expect(typeof result.database.latencyMs).toBe('number');

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('superSecretPass123');
    expect(serialized).not.toContain('neon_user');
    expect(serialized).not.toContain('ep-cool-pharmacy-pooler');
  });

  it('throws ServiceUnavailableException and redacts credentials when database query fails', async () => {
    process.env.DATABASE_URL =
      'postgresql://neon_user:superSecretPass123@ep-cool-pharmacy-pooler.ap-southeast-1.aws.neon.tech/pharmacy_db?sslmode=require';
    prismaMock.$queryRaw.mockRejectedValue(
      new Error(
        'Can\'t reach database server at postgresql://neon_user:superSecretPass123@ep-cool-pharmacy-pooler.ap-southeast-1.aws.neon.tech/pharmacy_db',
      ),
    );

    let thrownError: any;
    try {
      await service.checkDatabaseHealth();
    } catch (err: any) {
      thrownError = err;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError).toBeInstanceOf(ServiceUnavailableException);

    const responseStr = JSON.stringify(thrownError.getResponse());
    expect(responseStr).not.toContain('superSecretPass123');
    expect(responseStr).not.toContain('neon_user');
  });

  it('redacts credentials from connection strings and error messages', () => {
    const rawError =
      'Connection failed to postgresql://admin_user:myP@ssw0rd!@ep-neon.aws.neon.tech:5432/pharmacy_db?sslmode=require';
    const redacted = redactDatabaseSecrets(rawError);
    expect(redacted).toContain('postgresql://[REDACTED]:[REDACTED]@');
    expect(redacted).not.toContain('admin_user');
    expect(redacted).not.toContain('myP@ssw0rd!');
  });

  it('enforces sslmode=require and pooling parameters on remote Neon URLs', () => {
    const raw =
      'postgresql://user:pass@ep-pharmacy-pooler.us-east-2.aws.neon.tech/pharmacy_db';
    const safeUrl = buildSafeDatabaseUrl(raw)!;
    const parsed = new URL(safeUrl);

    expect(parsed.searchParams.get('sslmode')).toBe('require');
    expect(parsed.searchParams.get('connect_timeout')).toBe('15');
    expect(parsed.searchParams.get('pool_timeout')).toBe('15');
    expect(parsed.searchParams.get('connection_limit')).toBe('10');
  });
});
