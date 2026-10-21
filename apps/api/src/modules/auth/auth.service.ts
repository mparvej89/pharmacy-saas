import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto, SelectStoreDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email.toLowerCase() },
      include: {
        storeRoles: {
          include: {
            store: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 1. Independent SaaS SUPER_ADMIN (Platform level, not bound to any clinic/store)
    if (user.isSuperAdmin) {
      const payload = {
        sub: user.id,
        email: user.email,
        storeId: null,
        role: 'SUPER_ADMIN',
        isSuperAdmin: true,
      };

      const accessToken = this.jwtService.sign(payload);

      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          isSuperAdmin: true,
          activeStore: null,
          stores: [],
        },
      };
    }

    // 2. Pharmacy Store Staff / Owner (Tied to specific clinic branches)
    if (!user.storeRoles || user.storeRoles.length === 0) {
      throw new UnauthorizedException('User account is not associated with any pharmacy store');
    }

    // Default to the first active store
    const activeStoreRole = user.storeRoles.find((sr) => sr.store.isActive) || user.storeRoles[0];
    const activeStore = activeStoreRole?.store;

    const payload = {
      sub: user.id,
      email: user.email,
      storeId: activeStore?.id,
      role: activeStoreRole?.role,
      isSuperAdmin: false,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        isSuperAdmin: false,
        activeStore: activeStore
          ? {
              id: activeStore.id,
              name: activeStore.name,
              code: activeStore.code,
              gstin: activeStore.gstin,
              drugLicenseNumber: activeStore.drugLicenseNumber,
              stateCode: activeStore.stateCode,
              role: activeStoreRole.role,
            }
          : null,
        stores: user.storeRoles.map((sr) => ({
          id: sr.store.id,
          name: sr.store.name,
          code: sr.store.code,
          role: sr.role,
        })),
      },
    };
  }

  async selectStore(userId: string, selectStoreDto: SelectStoreDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        storeRoles: {
          include: {
            store: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Super Admin can switch context to any store globally
    if (user.isSuperAdmin) {
      const targetStore = await this.prisma.tenantStore.findUnique({
        where: { id: selectStoreDto.storeId },
      });
      if (!targetStore) {
        throw new ForbiddenException('Store not found');
      }

      const payload = {
        sub: user.id,
        email: user.email,
        storeId: targetStore.id,
        role: 'SUPER_ADMIN',
        isSuperAdmin: true,
      };

      const accessToken = this.jwtService.sign(payload);

      return {
        accessToken,
        activeStore: {
          id: targetStore.id,
          name: targetStore.name,
          code: targetStore.code,
          gstin: targetStore.gstin,
          drugLicenseNumber: targetStore.drugLicenseNumber,
          stateCode: targetStore.stateCode,
          role: 'SUPER_ADMIN',
        },
      };
    }

    const targetMembership = user.storeRoles.find((sr) => sr.storeId === selectStoreDto.storeId);
    if (!targetMembership) {
      throw new ForbiddenException('User is not authorized for this pharmacy store');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      storeId: targetMembership.storeId,
      role: targetMembership.role,
      isSuperAdmin: false,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      activeStore: {
        id: targetMembership.store.id,
        name: targetMembership.store.name,
        code: targetMembership.store.code,
        gstin: targetMembership.store.gstin,
        drugLicenseNumber: targetMembership.store.drugLicenseNumber,
        stateCode: targetMembership.store.stateCode,
        role: targetMembership.role,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        storeRoles: {
          include: {
            store: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      stores: user.storeRoles.map((sr) => ({
        id: sr.store.id,
        name: sr.store.name,
        code: sr.store.code,
        role: sr.role,
      })),
    };
  }
}
