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

    const itemData = createDto.items.map((item) => {
      // Free quantity does NOT increase the line gross rate
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
        purchaseRate: item.purchaseRate,
        discountPercent: item.discountPercent || 0,
        gstRate: item.gstRate,
        taxAmount: tax.toDecimalPlaces(2).toNumber(),
        netAmount: net.toDecimalPlaces(2).toNumber(),
        mrp: item.mrp,
        sellingPrice: item.sellingPrice,
      };
    });

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
        const totalReceived = item.quantity + item.freeQuantity;

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
              quantityAvailable: totalReceived,
              mrp: item.mrp,
              purchasePrice: item.purchaseRate,
              sellingPrice: item.sellingPrice,
              status: 'ACTIVE',
            },
          });
        } else {
          batch = await tx.medicineBatch.update({
            where: { id: batch.id },
            data: {
              quantityAvailable: { increment: totalReceived },
              mrp: item.mrp,
              purchasePrice: item.purchaseRate,
              sellingPrice: item.sellingPrice,
              status: 'ACTIVE',
            },
          });
        }

        // Link item to batch
        await tx.purchaseItem.update({
          where: { id: item.id },
          data: { batchId: batch.id },
        });

        // Create immutable StockLedgerEntry
        await tx.stockLedgerEntry.create({
          data: {
            storeId,
            medicineId: item.medicineId,
            batchId: batch.id,
            movementType: 'PURCHASE_RECEIPT',
            quantityChange: totalReceived,
            balanceAfter: batch.quantityAvailable,
            referenceType: 'PURCHASE',
            referenceId: purchase.id,
            userId,
            notes: `Purchase Receipt from ${purchase.supplierInvoiceNumber} (Qty: ${item.quantity} + Free: ${item.freeQuantity})`,
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
}
