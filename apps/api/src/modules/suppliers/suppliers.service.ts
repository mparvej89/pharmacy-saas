import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll(storeId: string) {
    return this.prisma.supplier.findMany({
      where: { storeId, isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });
  }

  async findOne(storeId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, storeId },
      include: {
        purchases: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID "${id}" not found`);
    }

    return supplier;
  }

  async create(storeId: string, createDto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        ...createDto,
        storeId,
      },
    });
  }

  async update(storeId: string, id: string, updateDto: UpdateSupplierDto) {
    await this.findOne(storeId, id);
    return this.prisma.supplier.update({
      where: { id },
      data: updateDto,
    });
  }
}
