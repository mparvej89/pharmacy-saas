import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateStoreDto, UpdateStoreDto } from './dto/store.dto';

@Injectable()
export class StoresService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tenantStore.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            medicines: true,
            batches: true,
            sales: true,
            userRoles: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const store = await this.prisma.tenantStore.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID "${id}" not found`);
    }

    return store;
  }

  async create(createStoreDto: CreateStoreDto) {
    const existing = await this.prisma.tenantStore.findUnique({
      where: { code: createStoreDto.code },
    });

    if (existing) {
      throw new ConflictException(`Store code "${createStoreDto.code}" already exists`);
    }

    return this.prisma.tenantStore.create({
      data: createStoreDto,
    });
  }

  async update(id: string, updateStoreDto: UpdateStoreDto) {
    await this.findOne(id);
    return this.prisma.tenantStore.update({
      where: { id },
      data: updateStoreDto,
    });
  }
}
