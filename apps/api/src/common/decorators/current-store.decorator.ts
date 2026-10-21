import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const CurrentStore = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const storeId = request.storeId || request.user?.activeStoreId;
    if (!storeId) {
      throw new UnauthorizedException('No active pharmacy store selected for this session');
    }
    return storeId;
  },
);
