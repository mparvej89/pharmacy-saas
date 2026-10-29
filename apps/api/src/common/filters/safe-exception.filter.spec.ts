import { ArgumentsHost, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SafeExceptionFilter } from './safe-exception.filter';
import { parseAllowedOrigins } from '@/main';
import { StoresController } from '@/modules/stores/stores.controller';
import { UserRole } from '@prisma/client';

describe('Production Security: SafeExceptionFilter, CORS & Store Authorization', () => {
  let filter: SafeExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new SafeExceptionFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({ status: mockStatus }),
        getRequest: () => ({ method: 'GET', url: '/api/v1/sales' }),
      }),
    } as unknown as ArgumentsHost;
  });

  it('prevents leaking Neon database credentials or stack traces on unhandled errors', () => {
    const rawError = new Error(
      'Invalid `prisma.sale.findMany()` invocation: Can\'t reach database server at postgresql://neondb_owner:secretPass123@ep-still-brook-pooler.aws.neon.tech/pharmacy_db',
    );
    rawError.stack = 'Error: stack trace line 1\n    at Object.<anonymous> (/app/src/sales.ts:42:11)';

    filter.catch(rawError, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    const body = mockJson.mock.calls[0][0];
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe('An unexpected error occurred while processing the request.');
    expect(JSON.stringify(body)).not.toContain('secretPass123');
    expect(JSON.stringify(body)).not.toContain('neondb_owner');
    expect(JSON.stringify(body)).not.toContain('stack trace');
  });

  it('redacts any database URL accidentally embedded inside an HttpException message', () => {
    const httpErr = new BadRequestException(
      'Failed connecting to postgresql://user1:mySecret99@ep-neon.tech/pharmacy_db',
    );

    filter.catch(httpErr, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    const body = mockJson.mock.calls[0][0];
    expect(JSON.stringify(body)).not.toContain('mySecret99');
    expect(JSON.stringify(body)).toContain('[REDACTED]');
  });

  it('rejects wildcard (*) CORS origins in production while allowing explicit origins', () => {
    const prodOrigins = parseAllowedOrigins(
      '*, https://pharmacy-web.onrender.com, http://localhost:4200',
      'production',
    );
    expect(prodOrigins).toEqual([
      'https://pharmacy-web.onrender.com',
      'http://localhost:4200',
    ]);
    expect(prodOrigins).not.toContain('*');
  });

  it('enforces store ownership on StoresController.findOne and update for non-SuperAdmins', async () => {
    const storesServiceMock = {
      findAll: jest.fn(),
      findOne: jest.fn().mockResolvedValue({ id: 'store-1', name: 'Apollo' }),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'store-1', name: 'Apollo Updated' }),
    };
    const controller = new StoresController(storesServiceMock as any);

    const storeAlphaPharmacist = {
      userId: 'u-1',
      role: UserRole.PHARMACIST,
      activeStoreId: 'store-1',
      storeRoles: [{ storeId: 'store-1', role: UserRole.PHARMACIST }],
    };

    // Allowed to view own store
    const ownStore = await controller.findOne('store-1', storeAlphaPharmacist);
    expect(ownStore.id).toBe('store-1');

    // Blocked from viewing another tenant's store
    let viewErr: any;
    try {
      await controller.findOne('store-2-other-tenant', storeAlphaPharmacist);
    } catch (e) {
      viewErr = e;
    }
    expect(viewErr).toBeInstanceOf(ForbiddenException);

    // Blocked from updating another tenant's store even if STORE_OWNER of store-1
    const storeAlphaOwner = {
      userId: 'u-owner',
      role: UserRole.STORE_OWNER,
      activeStoreId: 'store-1',
      storeRoles: [{ storeId: 'store-1', role: UserRole.STORE_OWNER }],
    };
    let updateErr: any;
    try {
      await controller.update('store-2-other-tenant', { name: 'Hacked' } as any, storeAlphaOwner);
    } catch (e) {
      updateErr = e;
    }
    expect(updateErr).toBeInstanceOf(ForbiddenException);
  });
});

