import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateUserDto, UpdateUserRoleDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(storeId: string) {
    const roles = await this.prisma.userStoreRole.findMany({
      where: { storeId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    return roles.map((r) => ({
      ...r.user,
      role: r.role,
    }));
  }

  async create(storeId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    let userId: string;

    if (existing) {
      const existingRole = await this.prisma.userStoreRole.findUnique({
        where: {
          userId_storeId: {
            userId: existing.id,
            storeId,
          },
        },
      });

      if (existingRole) {
        throw new ConflictException('User is already a member of this pharmacy store');
      }

      userId = existing.id;
    } else {
      const passwordHash = await bcrypt.hash(dto.password, 10);
      const newUser = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          fullName: dto.fullName.trim(),
          phone: dto.phone,
          passwordHash,
        },
      });
      userId = newUser.id;
    }

    await this.prisma.userStoreRole.create({
      data: {
        userId,
        storeId,
        role: dto.role,
      },
    });

    return {
      userId,
      email: dto.email,
      fullName: dto.fullName,
      role: dto.role,
    };
  }

  async updateRole(storeId: string, userId: string, dto: UpdateUserRoleDto) {
    const userRole = await this.prisma.userStoreRole.findUnique({
      where: {
        userId_storeId: {
          userId,
          storeId,
        },
      },
    });

    if (!userRole) {
      throw new NotFoundException('User membership not found in this store');
    }

    return this.prisma.userStoreRole.update({
      where: { id: userRole.id },
      data: { role: dto.role },
    });
  }
}
