import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateAdjustmentDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getBatches(storeId: string, medicineId?: string) {
    return this.prisma.medicineBatch.findMany({
      where: {
        storeId,
        ...(medicineId ? { medicineId } : {}),
      },
      include: {
        medicine: {
          select: {
            id: true,
            name: true,
            genericName: true,
            brandName: true,
            prescriptionCategory: true,
            hsnCode: true,
            gstRate: true,
          },
        },
      },
      orderBy: [{ medicine: { name: 'asc' } }, { expiryDate: 'asc' }],
    });
  }

  /**
   * FEFO Allocation Helper:
   * Selects earliest unexpired active batches for a medicine.
   */
  async getFefoAllocation(storeId: string, medicineId: string, requiredQuantity: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const batches = await this.prisma.medicineBatch.findMany({
      where: {
        storeId,
        medicineId,
        status: 'ACTIVE',
        quantityAvailable: { gt: 0 },
        expiryDate: { gt: today }, // Exclude expired batches strictly
      },
      orderBy: { expiryDate: 'asc' }, // FEFO: Earliest expiry first
    });

    const totalAvailable = batches.reduce((sum, b) => sum + b.quantityAvailable, 0);
    if (totalAvailable < requiredQuantity) {
      throw new BadRequestException(
        `Insufficient unexpired stock: Requested ${requiredQuantity}, but only ${totalAvailable} available`,
      );
    }

    let remainingNeeded = requiredQuantity;
    const allocations: Array<{
      batchId: string;
      batchNumber: string;
      expiryDate: Date;
      quantityToDeduct: number;
      sellingPrice: number;
      mrp: number;
    }> = [];

    for (const batch of batches) {
      if (remainingNeeded <= 0) break;

      const takeQty = Math.min(batch.quantityAvailable, remainingNeeded);
      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantityToDeduct: takeQty,
        sellingPrice: Number(batch.sellingPrice),
        mrp: Number(batch.mrp),
      });

      remainingNeeded -= takeQty;
    }

    return allocations;
  }

  async getLowStock(storeId: string) {
    const medicines = await this.prisma.medicine.findMany({
      where: { storeId, isActive: true },
      include: {
        batches: {
          where: { status: 'ACTIVE', quantityAvailable: { gt: 0 } },
        },
      },
    });

    return medicines
      .map((med) => {
        const currentStock = med.batches.reduce((sum, b) => sum + b.quantityAvailable, 0);
        return {
          id: med.id,
          name: med.name,
          genericName: med.genericName,
          brandName: med.brandName,
          reorderLevel: med.reorderLevel,
          currentStock,
          deficit: Math.max(0, med.reorderLevel - currentStock),
          isLowStock: currentStock <= med.reorderLevel,
        };
      })
      .filter((m) => m.isLowStock)
      .sort((a, b) => b.deficit - a.deficit);
  }

  async getExpiringBatches(storeId: string, daysAhead: number = 90) {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + Number(daysAhead));

    const batches = await this.prisma.medicineBatch.findMany({
      where: {
        storeId,
        quantityAvailable: { gt: 0 },
        expiryDate: { lte: thresholdDate },
      },
      include: {
        medicine: {
          select: { id: true, name: true, genericName: true, brandName: true },
        },
      },
      orderBy: { expiryDate: 'asc' },
    });

    return batches.map((batch) => {
      const isExpired = new Date(batch.expiryDate) < now;
      const daysRemaining = Math.ceil(
        (new Date(batch.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        ...batch,
        isExpired,
        daysRemaining,
      };
    });
  }

  async createStockAdjustment(storeId: string, userId: string, dto: CreateAdjustmentDto) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.medicineBatch.findFirst({
        where: { id: dto.batchId, storeId, medicineId: dto.medicineId },
      });

      if (!batch) {
        throw new NotFoundException(`Batch not found for specified medicine`);
      }

      const previousQuantity = batch.quantityAvailable;
      const adjustedQuantity = dto.adjustedQuantity;
      const variance = adjustedQuantity - previousQuantity;

      if (variance === 0) {
        throw new BadRequestException('Adjusted quantity is identical to current balance');
      }

      // Update batch quantity
      const updatedBatch = await tx.medicineBatch.update({
        where: { id: batch.id },
        data: {
          quantityAvailable: adjustedQuantity,
          status: adjustedQuantity === 0 ? 'DEPLETED' : batch.status,
        },
      });

      // Record adjustment audit
      const adjustment = await tx.stockAdjustment.create({
        data: {
          storeId,
          medicineId: dto.medicineId,
          batchId: dto.batchId,
          adjustmentType: dto.adjustmentType,
          previousQuantity,
          adjustedQuantity,
          variance,
          reason: dto.reason.trim(),
          performedById: userId,
        },
      });

      // Record immutable stock ledger movement
      await tx.stockLedgerEntry.create({
        data: {
          storeId,
          medicineId: dto.medicineId,
          batchId: dto.batchId,
          movementType: 'STOCK_ADJUSTMENT',
          quantityChange: variance,
          balanceAfter: updatedBatch.quantityAvailable,
          referenceType: 'STOCK_ADJUSTMENT',
          referenceId: adjustment.id,
          userId,
          notes: `Reason: ${dto.reason.trim()} (Variance: ${variance > 0 ? '+' : ''}${variance})`,
        },
      });

      return adjustment;
    });
  }

  async getStockLedger(storeId: string, query: { medicineId?: string; batchId?: string; limit?: number }) {
    const limit = query.limit || 100;
    return this.prisma.stockLedgerEntry.findMany({
      where: {
        storeId,
        ...(query.medicineId ? { medicineId: query.medicineId } : {}),
        ...(query.batchId ? { batchId: query.batchId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      include: {
        medicine: { select: { id: true, name: true, genericName: true } },
        batch: { select: { id: true, batchNumber: true, expiryDate: true } },
        user: { select: { id: true, fullName: true } },
      },
    });
  }
}
