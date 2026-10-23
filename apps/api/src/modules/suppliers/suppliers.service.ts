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

  async recordPayment(
    storeId: string,
    id: string,
    userId: string,
    dto: { amount: number; paymentMethod: string; referenceNumber?: string; notes?: string },
  ) {
    const supplier = await this.findOne(storeId, id);

    return this.prisma.$transaction(async (tx) => {
      const updatedSupplier = await tx.supplier.update({
        where: { id },
        data: {
          outstandingBalance: { decrement: dto.amount },
        },
      });

      // Record audit log for immutable financial traceability
      await tx.auditLog.create({
        data: {
          storeId,
          userId,
          action: 'SUPPLIER_PAYMENT',
          entityName: 'SUPPLIER',
          entityId: id,
          newValues: {
            amountPaid: dto.amount,
            paymentMethod: dto.paymentMethod,
            referenceNumber: dto.referenceNumber,
            notes: dto.notes,
            previousBalance: Number(supplier.outstandingBalance),
            newBalance: Number(updatedSupplier.outstandingBalance),
          },
        },
      });

      return {
        message: 'Supplier payment recorded successfully',
        supplierId: id,
        amountPaid: dto.amount,
        remainingBalance: updatedSupplier.outstandingBalance,
      };
    });
  }
}
