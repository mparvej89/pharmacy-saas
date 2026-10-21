import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

@Injectable()
export class StoreTenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      request.storeId = request.headers['x-tenant-store-id'] || user.activeStoreId;
      return true;
    }

    const requestedStoreId = request.params?.storeId || request.body?.storeId;
    const activeStoreId = user.activeStoreId;

    if (!activeStoreId) {
      throw new ForbiddenException('User has no active store assigned');
    }

    // Verify user is an authorized member of requested store if explicitly specified
    if (requestedStoreId && requestedStoreId !== activeStoreId) {
      const isMember = user.storeRoles?.some((sr: any) => sr.storeId === requestedStoreId);
      if (!isMember) {
        throw new ForbiddenException('You do not have permission to access data for this pharmacy store');
      }
      request.storeId = requestedStoreId;
    } else {
      request.storeId = activeStoreId;
    }

    return true;
  }
}
