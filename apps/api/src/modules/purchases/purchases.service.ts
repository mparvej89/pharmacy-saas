import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreatePurchaseDto } from './dto/purchase.dto';
import Decimal from 'decimal.js';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async findAll(storeId: string) {
    return this.prisma.purchase.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, gstin: true },
        },
        postedBy: {
          select: { id: true, fullName: true },
        },
        _count: {
          select: { items: true },
        },
      },
    });
  }

  async findOne(storeId: string, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, storeId },
      include: {
        supplier: true,
        postedBy: { select: { id: true, fullName: true, email: true } },
        items: {
          include: {
            medicine: {
              select: { id: true, name: true, genericName: true, packSize: true, unitOfMeasure: true },
            },
          },
        },
      },
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase with ID "${id}" not found`);
    }

    return purchase;
  }

  async createDraft(storeId: string, createDto: CreatePurchaseDto) {
    const existing = await this.prisma.purchase.findFirst({
      where: {
        storeId,
        supplierId: createDto.supplierId,
        supplierInvoiceNumber: createDto.supplierInvoiceNumber.trim(),
      },
    });

    if (existing) {
      throw new ConflictException(
        `Supplier invoice "${createDto.supplierInvoiceNumber}" has already been entered for this supplier`,
      );
    }

    let subtotal = new Decimal(0);
    let totalDiscount = new Decimal(0);
    let totalTax = new Decimal(0);

    const purchaseNumber = `PO-${Date.now().toString().slice(-8)}`;

    const itemData = await Promise.all(
      createDto.items.map(async (item) => {
        const medicine = await this.prisma.medicine.findFirst({
          where: { id: item.medicineId, storeId },
        });

        const conversionFactor = item.conversionFactor || (medicine?.conversionFactor) || 1;
        const purchaseUnit = item.purchaseUnit || (medicine?.purchaseUnit) || 'STRIP';
        const totalPacks = item.quantity + (item.freeQuantity || 0);
        const freeLooseQuantity = item.freeLooseQuantity || 0;
        const baseQuantity = (totalPacks * conversionFactor) + freeLooseQuantity;

        // Free quantity and loose free items do NOT increase the line gross rate
        const lineGross = new Decimal(item.quantity).times(item.purchaseRate);
        const discount = lineGross.times(new Decimal(item.discountPercent).dividedBy(100));
        const taxable = lineGross.minus(discount);
        const tax = taxable.times(new Decimal(item.gstRate).dividedBy(100));
        const net = taxable.plus(tax);

        subtotal = subtotal.plus(lineGross);
        totalDiscount = totalDiscount.plus(discount);
        totalTax = totalTax.plus(tax);

        return {
          medicineId: item.medicineId,
          batchNumber: item.batchNumber.trim().toUpperCase(),
          expiryDate: new Date(item.expiryDate),
          quantity: item.quantity,
          freeQuantity: item.freeQuantity || 0,
          freeLooseQuantity,
          purchaseUnit,
          conversionFactor,
          baseQuantity,
          purchaseRate: item.purchaseRate,
          discountPercent: item.discountPercent || 0,
          gstRate: item.gstRate,
          taxAmount: tax.toDecimalPlaces(2).toNumber(),
          netAmount: net.toDecimalPlaces(2).toNumber(),
          mrp: item.mrp,
          sellingPrice: item.sellingPrice,
          rackLocation: item.rackLocation ? item.rackLocation.trim().toUpperCase() : null,
        };
      }),
    );

    const totalAmount = subtotal.minus(totalDiscount).plus(totalTax);

    return this.prisma.purchase.create({
      data: {
        storeId,
        supplierId: createDto.supplierId,
        purchaseNumber,
        supplierInvoiceNumber: createDto.supplierInvoiceNumber.trim(),
        supplierInvoiceDate: new Date(createDto.supplierInvoiceDate),
        status: 'DRAFT',
        subtotal: subtotal.toDecimalPlaces(2).toNumber(),
        discountAmount: totalDiscount.toDecimalPlaces(2).toNumber(),
        taxAmount: totalTax.toDecimalPlaces(2).toNumber(),
        totalAmount: totalAmount.toDecimalPlaces(2).toNumber(),
        notes: createDto.notes,
        items: {
          create: itemData,
        },
      },
      include: {
        items: true,
      },
    });
  }

  async postPurchase(storeId: string, id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id, storeId },
        include: { items: true },
      });

      if (!purchase) {
        throw new NotFoundException(`Purchase with ID "${id}" not found`);
      }

      if (purchase.status === 'POSTED') {
        throw new ConflictException('This purchase has already been posted and stock credited');
      }

      if (purchase.status === 'CANCELLED') {
        throw new BadRequestException('Cannot post a cancelled purchase');
      }

      for (const item of purchase.items) {
        const factor = (item as any).conversionFactor || 1;
        const totalPacks = item.quantity + (item.freeQuantity || 0);
        const freeLoose = (item as any).freeLooseQuantity || 0;
        const totalBaseReceived = (item as any).baseQuantity || ((totalPacks * factor) + freeLoose);

        // Upsert batch
        let batch = await tx.medicineBatch.findUnique({
          where: {
            storeId_medicineId_batchNumber: {
              storeId,
              medicineId: item.medicineId,
              batchNumber: item.batchNumber,
            },
          },
        });

        if (!batch) {
          batch = await tx.medicineBatch.create({
            data: {
              storeId,
              medicineId: item.medicineId,
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate,
              quantityAvailable: totalBaseReceived,
              mrp: item.mrp,
              purchasePrice: item.purchaseRate,
              sellingPrice: item.sellingPrice,
              rackLocation: item.rackLocation || null,
              status: 'ACTIVE',
            },
          });
        } else {
          batch = await tx.medicineBatch.update({
            where: { id: batch.id },
            data: {
              quantityAvailable: { increment: totalBaseReceived },
              mrp: item.mrp,
              purchasePrice: item.purchaseRate,
              sellingPrice: item.sellingPrice,
              ...(item.rackLocation ? { rackLocation: item.rackLocation } : {}),
              status: 'ACTIVE',
            },
          });
        }

        // Link item to batch
        await tx.purchaseItem.update({
          where: { id: item.id },
          data: { batchId: batch.id },
        });

        const freeText = freeLoose > 0 ? ` + ${freeLoose} loose free` : '';
        // Create immutable StockLedgerEntry
        await tx.stockLedgerEntry.create({
          data: {
            storeId,
            medicineId: item.medicineId,
            batchId: batch.id,
            movementType: 'PURCHASE_RECEIPT',
            quantityChange: totalBaseReceived,
            balanceAfter: batch.quantityAvailable,
            referenceType: 'PURCHASE',
            referenceId: purchase.id,
            userId,
            notes: `Purchase Receipt from ${purchase.supplierInvoiceNumber} (Packs: ${item.quantity}+${item.freeQuantity} ${(item as any).purchaseUnit || 'pack'} @ ${factor}/pack${freeText} = ${totalBaseReceived} base units)`,
          },
        });
      }

      // Update supplier outstanding balance
      await tx.supplier.update({
        where: { id: purchase.supplierId },
        data: {
          outstandingBalance: { increment: purchase.totalAmount },
        },
      });

      // Update purchase status
      return tx.purchase.update({
        where: { id: purchase.id },
        data: {
          status: 'POSTED',
          postedAt: new Date(),
          postedById: userId,
        },
        include: {
          items: true,
          supplier: true,
        },
      });
    });
  }

  async cancelPurchase(storeId: string, id: string, userId: string, reason?: string) {
    const purchase = await this.findOne(storeId, id);

    if (purchase.status === 'CANCELLED') {
      throw new BadRequestException('Purchase invoice is already cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      // If purchase was already POSTED, reverse the batches and ledger
      if (purchase.status === 'POSTED') {
        for (const item of purchase.items) {
          const factor = (item as any).conversionFactor || 1;
          const totalPacks = item.quantity + (item.freeQuantity || 0);
          const totalBaseReceived = (item as any).baseQuantity || (totalPacks * factor);

          if (item.batchId) {
            const batch = await tx.medicineBatch.findUnique({
              where: { id: item.batchId },
            });

            if (batch) {
              if (batch.quantityAvailable < totalBaseReceived) {
                throw new BadRequestException(
                  `Cannot cancel purchase: ${totalBaseReceived - batch.quantityAvailable} units of batch "${batch.batchNumber}" have already been sold or dispensed`,
                );
              }

              const updatedBatch = await tx.medicineBatch.update({
                where: { id: batch.id },
                data: {
                  quantityAvailable: { decrement: totalBaseReceived },
                },
              });

              // Write reversing stock ledger entry
              await tx.stockLedgerEntry.create({
                data: {
                  storeId,
                  medicineId: item.medicineId,
                  batchId: batch.id,
                  movementType: 'STOCK_ADJUSTMENT',
                  quantityChange: -totalBaseReceived,
                  balanceAfter: updatedBatch.quantityAvailable,
                  referenceType: 'PURCHASE',
                  referenceId: purchase.id,
                  userId,
                  notes: `Purchase Cancellation Reversal: ${purchase.supplierInvoiceNumber} (Reason: ${reason || 'N/A'})`,
                },
              });
            }
          }
        }

        // Revert supplier outstanding balance
        await tx.supplier.update({
          where: { id: purchase.supplierId },
          data: {
            outstandingBalance: { decrement: purchase.totalAmount },
          },
        });
      }

      // Mark purchase status as CANCELLED
      return tx.purchase.update({
        where: { id: purchase.id },
        data: {
          status: 'CANCELLED',
          notes: purchase.notes ? `${purchase.notes} | Cancelled: ${reason || 'N/A'}` : `Cancelled: ${reason || 'N/A'}`,
        },
        include: {
          items: true,
          supplier: true,
        },
      });
    });
  }
}
