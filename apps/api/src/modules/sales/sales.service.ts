import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateSaleDto } from './dto/sale.dto';
import Decimal from 'decimal.js';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    storeId: string,
    query: {
      startDate?: string;
      endDate?: string;
      cashierId?: string;
      limit?: number;
      page?: number;
    },
  ) {
    const { startDate, endDate, cashierId, limit = 50, page = 1 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { storeId };
    if (startDate && endDate) {
      where.saleDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    if (cashierId) {
      where.cashierId = cashierId;
    }

    const [total, items] = await Promise.all([
      this.prisma.sale.count({ where }),
      this.prisma.sale.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { saleDate: 'desc' },
        include: {
          cashier: { select: { id: true, fullName: true } },
          payments: true,
          _count: { select: { items: true } },
        },
      }),
    ]);

    return {
      items,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  async findOne(storeId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, storeId },
      include: {
        store: true,
        cashier: { select: { id: true, fullName: true, email: true } },
        customer: true,
        payments: true,
        items: {
          include: {
            medicine: {
              select: {
                id: true,
                name: true,
                genericName: true,
                hsnCode: true,
                packSize: true,
                unitOfMeasure: true,
                prescriptionCategory: true,
              },
            },
            batch: {
              select: {
                id: true,
                batchNumber: true,
                expiryDate: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale invoice "${id}" not found`);
    }

    return sale;
  }

  async checkout(storeId: string, cashierId: string, dto: CreateSaleDto) {
    // 1. Idempotency Check: Prevent duplicate billing on network re-submission
    if (dto.idempotencyKey) {
      const existingSale = await this.prisma.sale.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: {
          items: true,
          payments: true,
        },
      });
      if (existingSale) {
        return existingSale;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const store = await tx.tenantStore.findUnique({
        where: { id: storeId },
      });
      if (!store) {
        throw new NotFoundException('Store not found');
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Customer link or creation
      let customerId: string | null = null;
      if (dto.customerPhone && dto.patientName) {
        let customer = await tx.customer.findFirst({
          where: { storeId, phone: dto.customerPhone.trim() },
        });
        if (!customer) {
          customer = await tx.customer.create({
            data: {
              storeId,
              name: dto.patientName.trim(),
              phone: dto.customerPhone.trim(),
              doctorName: dto.doctorName,
              doctorRegNo: dto.doctorRegNo,
            },
          });
        }
        customerId = customer.id;
      }

      // Generate invoice number: INV-YYYYMMDD-XXXX
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const countToday = await tx.sale.count({
        where: {
          storeId,
          saleDate: { gte: today },
        },
      });
      const invoiceNumber = `INV-${dateStr}-${(countToday + 1).toString().padStart(4, '0')}`;

      // Allocations array to write
      const saleItemsToCreate: any[] = [];
      const stockLedgerUpdates: any[] = [];

      let subtotal = new Decimal(0);
      let itemDiscountTotal = new Decimal(0);
      let totalCgst = new Decimal(0);
      let totalSgst = new Decimal(0);

      for (const line of dto.items) {
        const medicine = await tx.medicine.findFirst({
          where: { id: line.medicineId, storeId, isActive: true },
        });
        if (!medicine) {
          throw new NotFoundException(`Medicine not found or inactive`);
        }

        // Prescription validation for Schedule H / H1 / X
        if (
          medicine.prescriptionCategory !== 'OTC' &&
          (!dto.doctorName || !dto.patientName)
        ) {
          throw new BadRequestException(
            `Prescription details required: "${medicine.name}" is classified under ${medicine.prescriptionCategory}`,
          );
        }

        // Batch allocation logic: Manual or FEFO
        let allocatedBatches: Array<{
          batchId: string;
          batch: any;
          qty: number;
        }> = [];

        if (line.batchId) {
          // Manual batch selection
          const batch = await tx.medicineBatch.findFirst({
            where: {
              id: line.batchId,
              storeId,
              medicineId: line.medicineId,
              status: 'ACTIVE',
              expiryDate: { gt: today },
            },
          });
          if (!batch || batch.quantityAvailable < line.quantity) {
            throw new BadRequestException(
              `Batch ${batch?.batchNumber || ''} has insufficient unexpired stock (available: ${batch?.quantityAvailable || 0})`,
            );
          }
          allocatedBatches.push({ batchId: batch.id, batch, qty: line.quantity });
        } else {
          // FEFO Automatic Allocation
          const eligibleBatches = await tx.medicineBatch.findMany({
            where: {
              storeId,
              medicineId: line.medicineId,
              status: 'ACTIVE',
              quantityAvailable: { gt: 0 },
              expiryDate: { gt: today },
            },
            orderBy: { expiryDate: 'asc' }, // Earliest expiry first
          });

          const totalAvail = eligibleBatches.reduce((s, b) => s + b.quantityAvailable, 0);
          if (totalAvail < line.quantity) {
            throw new BadRequestException(
              `Insufficient unexpired stock for "${medicine.name}". Requested: ${line.quantity}, Available: ${totalAvail}`,
            );
          }

          let remainingToFulfill = line.quantity;
          for (const batch of eligibleBatches) {
            if (remainingToFulfill <= 0) break;
            const take = Math.min(batch.quantityAvailable, remainingToFulfill);
            allocatedBatches.push({ batchId: batch.id, batch, qty: take });
            remainingToFulfill -= take;
          }
        }

        // Calculate line items for each batch
        for (const alloc of allocatedBatches) {
          const unitPrice = new Decimal(alloc.batch.sellingPrice);
          const lineGross = unitPrice.times(alloc.qty);
          const discountPct = new Decimal(line.discountPercent || 0);
          const lineDiscount = lineGross.times(discountPct.dividedBy(100));
          const taxable = lineGross.minus(lineDiscount);

          const gstRate = new Decimal(medicine.gstRate);
          // Standard Indian Intra-state split: half CGST, half SGST
          const halfGstRate = gstRate.dividedBy(2);
          const cgst = taxable.times(halfGstRate.dividedBy(100));
          const sgst = taxable.times(halfGstRate.dividedBy(100));
          const lineTotal = taxable.plus(cgst).plus(sgst);

          subtotal = subtotal.plus(lineGross);
          itemDiscountTotal = itemDiscountTotal.plus(lineDiscount);
          totalCgst = totalCgst.plus(cgst);
          totalSgst = totalSgst.plus(sgst);

          saleItemsToCreate.push({
            medicineId: line.medicineId,
            batchId: alloc.batchId,
            quantity: alloc.qty,
            unitPrice: unitPrice.toDecimalPlaces(2).toNumber(),
            mrp: Number(alloc.batch.mrp),
            discountPercent: discountPct.toNumber(),
            discountAmount: lineDiscount.toDecimalPlaces(2).toNumber(),
            taxableAmount: taxable.toDecimalPlaces(2).toNumber(),
            gstRate: gstRate.toNumber(),
            cgstAmount: cgst.toDecimalPlaces(2).toNumber(),
            sgstAmount: sgst.toDecimalPlaces(2).toNumber(),
            igstAmount: 0.0,
            totalAmount: lineTotal.toDecimalPlaces(2).toNumber(),
          });

          // Deduct batch quantity
          const updatedBatch = await tx.medicineBatch.update({
            where: { id: alloc.batchId },
            data: {
              quantityAvailable: { decrement: alloc.qty },
            },
          });

          stockLedgerUpdates.push({
            storeId,
            medicineId: line.medicineId,
            batchId: alloc.batchId,
            movementType: 'SALE' as const,
            quantityChange: -alloc.qty,
            balanceAfter: updatedBatch.quantityAvailable,
            referenceType: 'SALE',
            userId: cashierId,
            notes: `Sold via ${invoiceNumber}`,
          });
        }
      }

      // Bill-level discount
      const billDiscountPct = new Decimal(dto.billDiscountPercent || 0);
      const taxableBeforeBillDiscount = subtotal.minus(itemDiscountTotal);
      const billDiscountAmount = taxableBeforeBillDiscount.times(billDiscountPct.dividedBy(100));
      const finalTaxable = taxableBeforeBillDiscount.minus(billDiscountAmount);

      const totalTax = totalCgst.plus(totalSgst);
      const exactTotal = finalTaxable.plus(totalTax);

      // Round-off to nearest rupee
      const grandTotal = exactTotal.round();
      const roundOff = grandTotal.minus(exactTotal);

      // Verify payment split totals
      const totalPaid = dto.payments.reduce((sum, p) => sum.plus(new Decimal(p.amount)), new Decimal(0));
      if (totalPaid.lessThan(grandTotal)) {
        throw new BadRequestException(
          `Total payment amount (₹${totalPaid}) is less than grand total (₹${grandTotal})`,
        );
      }
      const changeAmount = totalPaid.minus(grandTotal);

      // Create Sale
      const sale = await tx.sale.create({
        data: {
          storeId,
          invoiceNumber,
          customerId,
          idempotencyKey: dto.idempotencyKey,
          patientName: dto.patientName,
          doctorName: dto.doctorName,
          doctorRegNo: dto.doctorRegNo,
          subtotal: subtotal.toDecimalPlaces(2).toNumber(),
          itemDiscountTotal: itemDiscountTotal.toDecimalPlaces(2).toNumber(),
          billDiscountPercent: billDiscountPct.toNumber(),
          billDiscountAmount: billDiscountAmount.toDecimalPlaces(2).toNumber(),
          taxableAmount: finalTaxable.toDecimalPlaces(2).toNumber(),
          cgstAmount: totalCgst.toDecimalPlaces(2).toNumber(),
          sgstAmount: totalSgst.toDecimalPlaces(2).toNumber(),
          igstAmount: 0.0,
          totalTax: totalTax.toDecimalPlaces(2).toNumber(),
          roundOff: roundOff.toDecimalPlaces(2).toNumber(),
          grandTotal: grandTotal.toNumber(),
          paidAmount: totalPaid.toDecimalPlaces(2).toNumber(),
          changeAmount: changeAmount.toDecimalPlaces(2).toNumber(),
          paymentStatus: 'PAID',
          status: 'COMPLETED',
          cashierId,
          notes: dto.notes,
          items: {
            create: saleItemsToCreate,
          },
          payments: {
            create: dto.payments.map((p) => ({
              storeId,
              paymentMethod: p.paymentMethod,
              amount: p.amount,
              referenceNumber: p.referenceNumber,
            })),
          },
        },
        include: {
          items: {
            include: {
              medicine: true,
              batch: true,
            },
          },
          payments: true,
          store: true,
          cashier: { select: { id: true, fullName: true } },
        },
      });

      // Write immutable stock ledger entries
      for (const entry of stockLedgerUpdates) {
        await tx.stockLedgerEntry.create({
          data: {
            ...entry,
            referenceId: sale.id,
          },
        });
      }

      return sale;
    });
  }
}
