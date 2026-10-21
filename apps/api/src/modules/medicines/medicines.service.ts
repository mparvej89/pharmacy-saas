import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateMedicineDto, UpdateMedicineDto, CheckDuplicateDto } from './dto/medicine.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MedicinesService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    storeId: string,
    query: {
      search?: string;
      category?: string;
      page?: number;
      limit?: number;
      activeOnly?: boolean;
    },
  ) {
    const { search, category, page = 1, limit = 50, activeOnly = true } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Prisma.MedicineWhereInput = {
      storeId,
      ...(activeOnly ? { isActive: true } : {}),
      ...(category ? { prescriptionCategory: category as any } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { genericName: { contains: search, mode: 'insensitive' } },
              { brandName: { contains: search, mode: 'insensitive' } },
              { barcode: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, medicines] = await Promise.all([
      this.prisma.medicine.count({ where }),
      this.prisma.medicine.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { name: 'asc' },
        include: {
          batches: {
            where: {
              status: 'ACTIVE',
              quantityAvailable: { gt: 0 },
            },
            orderBy: { expiryDate: 'asc' }, // FEFO ordering
            select: {
              id: true,
              batchNumber: true,
              expiryDate: true,
              quantityAvailable: true,
              mrp: true,
              sellingPrice: true,
              rackLocation: true,
            },
          },
        },
      }),
    ]);

    const items = medicines.map((med) => {
      const totalAvailable = med.batches.reduce((sum, b) => sum + b.quantityAvailable, 0);
      const nearestExpiry = med.batches[0]?.expiryDate || null;
      return {
        ...med,
        totalAvailableStock: totalAvailable,
        nearestExpiry,
      };
    });

    return {
      items,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  async findOne(storeId: string, id: string) {
    const medicine = await this.prisma.medicine.findFirst({
      where: { id, storeId },
      include: {
        batches: {
          orderBy: { expiryDate: 'asc' },
        },
      },
    });

    if (!medicine) {
      throw new NotFoundException(`Medicine with ID "${id}" not found`);
    }

    const totalAvailable = medicine.batches
      .filter((b) => b.status === 'ACTIVE')
      .reduce((sum, b) => sum + b.quantityAvailable, 0);

    return {
      ...medicine,
      totalAvailableStock: totalAvailable,
    };
  }

  async create(storeId: string, createDto: CreateMedicineDto) {
    const existing = await this.prisma.medicine.findFirst({
      where: {
        storeId,
        name: { equals: createDto.name.trim(), mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException(`Medicine "${createDto.name}" already exists in this store`);
    }

    if (createDto.barcode) {
      const existingBarcode = await this.prisma.medicine.findFirst({
        where: {
          storeId,
          barcode: createDto.barcode.trim(),
        },
      });
      if (existingBarcode) {
        throw new ConflictException(`Barcode "${createDto.barcode}" is already assigned to "${existingBarcode.name}"`);
      }
    }

    return this.prisma.medicine.create({
      data: {
        ...createDto,
        storeId,
        name: createDto.name.trim(),
        genericName: createDto.genericName.trim(),
      },
    });
  }

  async update(storeId: string, id: string, updateDto: UpdateMedicineDto) {
    await this.findOne(storeId, id);

    if (updateDto.barcode) {
      const existingBarcode = await this.prisma.medicine.findFirst({
        where: {
          storeId,
          barcode: updateDto.barcode.trim(),
          id: { not: id },
        },
      });
      if (existingBarcode) {
        throw new ConflictException(`Barcode "${updateDto.barcode}" already assigned to another medicine`);
      }
    }

    return this.prisma.medicine.update({
      where: { id },
      data: updateDto,
    });
  }

  async checkDuplicate(storeId: string, checkDto: CheckDuplicateDto) {
    const existingByName = await this.prisma.medicine.findFirst({
      where: {
        storeId,
        name: { equals: checkDto.name.trim(), mode: 'insensitive' },
        ...(checkDto.excludeId ? { id: { not: checkDto.excludeId } } : {}),
      },
    });

    let existingByBarcode = null;
    if (checkDto.barcode) {
      existingByBarcode = await this.prisma.medicine.findFirst({
        where: {
          storeId,
          barcode: checkDto.barcode.trim(),
          ...(checkDto.excludeId ? { id: { not: checkDto.excludeId } } : {}),
        },
      });
    }

    return {
      isDuplicateName: !!existingByName,
      isDuplicateBarcode: !!existingByBarcode,
      matchedMedicine: existingByName || existingByBarcode || null,
    };
  }

  async toggleStatus(storeId: string, id: string) {
    const medicine = await this.findOne(storeId, id);
    return this.prisma.medicine.update({
      where: { id },
      data: { isActive: !medicine.isActive },
    });
  }
}
