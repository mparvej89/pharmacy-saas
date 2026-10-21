import { StoreTenantGuard } from './store-tenant.guard';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('StoreTenantGuard (Cross-Store Security)', () => {
  let guard: StoreTenantGuard;

  beforeEach(() => {
    guard = new StoreTenantGuard();
  });

  const createMockContext = (user: any, params: any = {}, body: any = {}, headers: any = {}) => {
    const request = {
      user,
      params,
      body,
      headers,
      storeId: undefined,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  it('should throw UnauthorizedException if no user is present', () => {
    const context = createMockContext(null);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should throw ForbiddenException if user has no active store', () => {
    const context = createMockContext({
      userId: 'user-1',
      activeStoreId: null,
      storeRoles: [],
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should block unauthorized cross-store access when client requests another storeId', () => {
    const user = {
      userId: 'user-1',
      activeStoreId: 'store-alpha',
      storeRoles: [{ storeId: 'store-alpha', role: UserRole.PHARMACIST }],
    };

    // Attacker attempts to pass another store's ID in params
    const context = createMockContext(user, { storeId: 'store-beta-victim' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow access and attach storeId when user is an authorized member', () => {
    const user = {
      userId: 'user-1',
      activeStoreId: 'store-alpha',
      storeRoles: [{ storeId: 'store-alpha', role: UserRole.PHARMACIST }],
    };

    const context = createMockContext(user);
    const result = guard.canActivate(context);

    expect(result).toBe(true);
    const req = context.switchToHttp().getRequest();
    expect(req.storeId).toBe('store-alpha');
  });

  it('should allow SUPER_ADMIN to access target store via header', () => {
    const adminUser = {
      userId: 'admin-1',
      role: UserRole.SUPER_ADMIN,
      activeStoreId: 'store-alpha',
      storeRoles: [],
    };

    const context = createMockContext(adminUser, {}, {}, { 'x-tenant-store-id': 'store-target' });
    const result = guard.canActivate(context);

    expect(result).toBe(true);
    const req = context.switchToHttp().getRequest();
    expect(req.storeId).toBe('store-target');
  });
});
