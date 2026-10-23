import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateSaleReturnDto, InspectReturnItemDto } from './dto/return.dto';
import Decimal from 'decimal.js';

@Injectable()
export class ReturnsService {
  constructor(private prisma: PrismaService) {}

  async findAll(storeId: string) {
    return this.prisma.saleReturn.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      include: {
        sale: { select: { invoiceNumber: true, grandTotal: true } },
        processedBy: { select: { id: true, fullName: true } },
        items: {
          include: {
            saleItem: {
              include: {
                medicine: { select: { id: true, name: true } },
              },
            },
            batch: { select: { id: true, batchNumber: true, expiryDate: true } },
          },
        },
      },
    });
  }

  async findOne(storeId: string, id: string) {
    const saleReturn = await this.prisma.saleReturn.findFirst({
      where: { id, storeId },
      include: {
        sale: true,
        processedBy: { select: { id: true, fullName: true } },
        items: {
          include: {
            saleItem: {
              include: {
                medicine: true,
              },
            },
            batch: true,
          },
        },
      },
    });

    if (!saleReturn) {
      throw new NotFoundException(`Return record "${id}" not found`);
    }

    return saleReturn;
  }

  async processReturn(storeId: string, userId: string, dto: CreateSaleReturnDto) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: dto.saleId, storeId },
        include: { items: true },
      });

      if (!sale) {
        throw new NotFoundException(`Sale invoice not found`);
      }

      let totalRefund = new Decimal(0);
      const returnItemsData: any[] = [];

      for (const item of dto.items) {
        const saleItem = sale.items.find((si) => si.id === item.saleItemId);
        if (!saleItem) {
          throw new NotFoundException(`Item not part of original invoice`);
        }

        const remainingReturnable = saleItem.quantity - saleItem.returnedQuantity;
        if (item.quantity > remainingReturnable) {
          throw new BadRequestException(
            `Cannot return ${item.quantity}. Maximum eligible quantity for return is ${remainingReturnable}`,
          );
        }

        // Proportional refund calculation
        const unitNet = new Decimal(saleItem.totalAmount).dividedBy(saleItem.quantity);
        const itemRefund = unitNet.times(item.quantity);
        totalRefund = totalRefund.plus(itemRefund);

        // Update saleItem returnedQuantity
        await tx.saleItem.update({
          where: { id: saleItem.id },
          data: {
            returnedQuantity: { increment: item.quantity },
          },
        });

        // Place stock into quarantine (not available!)
        await tx.medicineBatch.update({
          where: { id: saleItem.batchId },
          data: {
            quantityQuarantined: { increment: item.quantity },
          },
        });

        returnItemsData.push({
          saleItemId: saleItem.id,
          batchId: saleItem.batchId,
          quantityReturned: item.quantity,
          refundAmount: itemRefund.toDecimalPlaces(2).toNumber(),
          initialStockDisposition: 'QUARANTINE_FOR_INSPECTION' as const,
          isInspected: false,
        });
      }

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const returnNumber = `RET-${dateStr}-${Date.now().toString().slice(-4)}`;

      const saleReturn = await tx.saleReturn.create({
        data: {
          storeId,
          saleId: dto.saleId,
          returnNumber,
          reason: dto.reason.trim(),
          totalRefundAmount: totalRefund.toDecimalPlaces(2).toNumber(),
          refundMethod: dto.refundMethod,
          processedById: userId,
          items: {
            create: returnItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      // Update sale status
      const allItems = await tx.saleItem.findMany({ where: { saleId: sale.id } });
      const isFullReturn = allItems.every((si) => si.quantity === si.returnedQuantity);
      await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: isFullReturn ? 'RETURNED_FULL' : 'RETURNED_PARTIAL',
        },
      });

      // Post Cash/Bank outflow transaction for refund if totalRefund > 0
      if (totalRefund.greaterThan(0)) {
        try {
          let targetType = 'CASH';
          if (dto.refundMethod === 'UPI') {
            targetType = 'UPI_SETTLEMENT';
          } else if (dto.refundMethod === 'CARD' || dto.refundMethod === 'CHEQUE') {
            targetType = 'BANK';
          }

          let account = await tx.cashBankAccount.findFirst({
            where: { storeId, accountType: targetType as any, isActive: true },
            orderBy: { isDefault: 'desc' },
          });

          if (!account) {
            account = await tx.cashBankAccount.findFirst({
              where: { storeId, accountType: 'CASH' as any, isActive: true },
            });
          }

          if (account) {
            const refundAmt = totalRefund.toDecimalPlaces(2).toNumber();
            const updatedAcc = await tx.cashBankAccount.update({
              where: { id: account.id },
              data: { currentBalance: { decrement: refundAmt } },
            });

            await tx.cashBankTransaction.create({
              data: {
                storeId,
                accountId: account.id,
                transactionDate: new Date(),
                transactionType: 'REFUND' as any,
                amount: refundAmt,
                balanceAfter: updatedAcc.currentBalance,
                paymentMethod: dto.refundMethod,
                referenceNumber: returnNumber,
                partyName: (sale as any).patientName || 'Customer',
                narration: `Sale Return Refund: ${returnNumber} (${sale.invoiceNumber})`,
                category: 'CUSTOMER_REFUND',
                relatedSaleId: sale.id,
                createdById: userId,
              },
            });
          }
        } catch (e) {
          // If cash/bank accounts aren't configured yet, avoid breaking return creation
        }
      }

      return saleReturn;
    });
  }

  async inspectItem(storeId: string, returnItemId: string, userId: string, dto: InspectReturnItemDto) {
    return this.prisma.$transaction(async (tx) => {
      const returnItem = await tx.saleReturnItem.findFirst({
        where: {
          id: returnItemId,
          saleReturn: { storeId },
        },
        include: {
          saleReturn: true,
          saleItem: true,
          batch: true,
        },
      });

      if (!returnItem) {
        throw new NotFoundException('Return item not found');
      }

      if (returnItem.isInspected) {
        throw new BadRequestException('This item has already been inspected');
      }

      const qty = returnItem.quantityReturned;

      if (dto.approveToSellable) {
        // Transfer from quarantine to available stock
        const updatedBatch = await tx.medicineBatch.update({
          where: { id: returnItem.batchId },
          data: {
            quantityQuarantined: { decrement: qty },
            quantityAvailable: { increment: qty },
          },
        });

        // Record stock ledger addition
        await tx.stockLedgerEntry.create({
          data: {
            storeId,
            medicineId: returnItem.saleItem.medicineId,
            batchId: returnItem.batchId,
            movementType: 'SALE_RETURN',
            quantityChange: qty,
            balanceAfter: updatedBatch.quantityAvailable,
            referenceType: 'SALE_RETURN',
            referenceId: returnItem.saleReturnId,
            userId,
            notes: `Restocked after inspection: ${dto.inspectionNotes.trim()}`,
          },
        });

        return tx.saleReturnItem.update({
          where: { id: returnItemId },
          data: {
            isInspected: true,
            initialStockDisposition: 'RESTOCKED_AFTER_INSPECTION',
            inspectionNotes: dto.inspectionNotes.trim(),
          },
        });
      } else {
        // Write off as damaged
        await tx.medicineBatch.update({
          where: { id: returnItem.batchId },
          data: {
            quantityQuarantined: { decrement: qty },
            quantityDamaged: { increment: qty },
          },
        });

        // Record damage entry
        await tx.stockLedgerEntry.create({
          data: {
            storeId,
            medicineId: returnItem.saleItem.medicineId,
            batchId: returnItem.batchId,
            movementType: 'DAMAGE_WRITE_OFF',
            quantityChange: 0,
            balanceAfter: returnItem.batch.quantityAvailable,
            referenceType: 'SALE_RETURN',
            referenceId: returnItem.saleReturnId,
            userId,
            notes: `Rejected during return inspection: ${dto.inspectionNotes.trim()}`,
          },
        });

        return tx.saleReturnItem.update({
          where: { id: returnItemId },
          data: {
            isInspected: true,
            initialStockDisposition: 'DAMAGED_DISPOSAL',
            inspectionNotes: dto.inspectionNotes.trim(),
          },
        });
      }
    });
  }
}
