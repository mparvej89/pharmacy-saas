import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'pharmacy-jwt-secret-dev-2026',
    });
  }

  async validate(payload: { sub: string; email: string; storeId?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        storeRoles: {
          include: {
            store: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is inactive or no longer exists');
    }

    const activeStoreId = payload.storeId || user.storeRoles[0]?.storeId;
    const activeRole = user.storeRoles.find((r) => r.storeId === activeStoreId)?.role;

    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      activeStoreId,
      role: activeRole,
      storeRoles: user.storeRoles,
    };
  }
}
