import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import Decimal from 'decimal.js';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary(storeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const now = new Date();
    const ninetyDaysAhead = new Date();
    ninetyDaysAhead.setDate(now.getDate() + 90);

    // 1. Today's sales and transactions
    const [todaySalesAgg, todayCount, paymentsToday] = await Promise.all([
      this.prisma.sale.aggregate({
        where: {
          storeId,
          saleDate: { gte: today },
          status: { in: ['COMPLETED', 'RETURNED_PARTIAL'] },
        },
        _sum: {
          grandTotal: true,
          totalTax: true,
        },
      }),
      this.prisma.sale.count({
        where: {
          storeId,
          saleDate: { gte: today },
        },
      }),
      this.prisma.payment.groupBy({
        by: ['paymentMethod'],
        where: {
          storeId,
          receivedAt: { gte: today },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    // 2. Low-stock medicines count
    const allMedicines = await this.prisma.medicine.findMany({
      where: { storeId, isActive: true },
      select: {
        id: true,
        name: true,
        reorderLevel: true,
        batches: {
          where: { status: 'ACTIVE', quantityAvailable: { gt: 0 } },
          select: { quantityAvailable: true },
        },
      },
    });

    const lowStockMedicines = allMedicines.filter((m) => {
      const totalStock = m.batches.reduce((sum, b) => sum + b.quantityAvailable, 0);
      return totalStock <= m.reorderLevel;
    });

    // 3. Expiring and Expired batches count
    const [expiringCount, expiredCount] = await Promise.all([
      this.prisma.medicineBatch.count({
        where: {
          storeId,
          quantityAvailable: { gt: 0 },
          expiryDate: { gte: now, lte: ninetyDaysAhead },
        },
      }),
      this.prisma.medicineBatch.count({
        where: {
          storeId,
          quantityAvailable: { gt: 0 },
          expiryDate: { lt: now },
        },
      }),
    ]);

    // 4. Stock valuation based on Batch Purchase Price (FIFO / Purchase Cost basis)
    const batches = await this.prisma.medicineBatch.findMany({
      where: { storeId, quantityAvailable: { gt: 0 } },
      select: {
        quantityAvailable: true,
        purchasePrice: true,
        sellingPrice: true,
        mrp: true,
      },
    });

    let totalPurchaseValuation = new Decimal(0);
    let totalRetailValuation = new Decimal(0);

    for (const b of batches) {
      totalPurchaseValuation = totalPurchaseValuation.plus(
        new Decimal(b.quantityAvailable).times(new Decimal(b.purchasePrice)),
      );
      totalRetailValuation = totalRetailValuation.plus(
        new Decimal(b.quantityAvailable).times(new Decimal(b.sellingPrice)),
      );
    }

    // 5. Recent Sales and Purchases
    const [recentSales, recentPurchases] = await Promise.all([
      this.prisma.sale.findMany({
        where: { storeId },
        orderBy: { saleDate: 'desc' },
        take: 5,
        include: {
          cashier: { select: { fullName: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.purchase.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          supplier: { select: { name: true } },
        },
      }),
    ]);

    return {
      todaySales: Number(todaySalesAgg._sum.grandTotal || 0),
      todayTax: Number(todaySalesAgg._sum.totalTax || 0),
      todayTransactions: todayCount,
      paymentsByMethod: paymentsToday.map((p) => ({
        method: p.paymentMethod,
        total: Number(p._sum.amount || 0),
      })),
      lowStockCount: lowStockMedicines.length,
      expiringCount,
      expiredCount,
      stockValuation: {
        method: 'FIFO_PURCHASE_COST',
        purchaseCostBasis: totalPurchaseValuation.toDecimalPlaces(2).toNumber(),
        retailValueBasis: totalRetailValuation.toDecimalPlaces(2).toNumber(),
        potentialGrossProfit: totalRetailValuation.minus(totalPurchaseValuation).toDecimalPlaces(2).toNumber(),
      },
      recentSales,
      recentPurchases,
    };
  }

  async getGstSummary(storeId: string, startDate?: string, endDate?: string) {
    const where: any = {
      storeId,
      status: { in: ['COMPLETED', 'RETURNED_PARTIAL'] },
    };

    if (startDate && endDate) {
      where.saleDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const sales = await this.prisma.sale.findMany({
      where,
      include: {
        items: {
          include: {
            medicine: { select: { hsnCode: true, name: true } },
          },
        },
      },
    });

    let totalTaxable = new Decimal(0);
    let totalCgst = new Decimal(0);
    let totalSgst = new Decimal(0);
    let totalIgst = new Decimal(0);
    let totalTax = new Decimal(0);

    const hsnMap = new Map<string, { hsnCode: string; taxable: Decimal; cgst: Decimal; sgst: Decimal; igst: Decimal; total: Decimal }>();

    for (const sale of sales) {
      totalTaxable = totalTaxable.plus(new Decimal(sale.taxableAmount));
      totalCgst = totalCgst.plus(new Decimal(sale.cgstAmount));
      totalSgst = totalSgst.plus(new Decimal(sale.sgstAmount));
      totalIgst = totalIgst.plus(new Decimal(sale.igstAmount));
      totalTax = totalTax.plus(new Decimal(sale.totalTax));

      for (const item of sale.items) {
        const hsn = item.medicine.hsnCode || '3004';
        const existing = hsnMap.get(hsn) || {
          hsnCode: hsn,
          taxable: new Decimal(0),
          cgst: new Decimal(0),
          sgst: new Decimal(0),
          igst: new Decimal(0),
          total: new Decimal(0),
        };

        existing.taxable = existing.taxable.plus(new Decimal(item.taxableAmount));
        existing.cgst = existing.cgst.plus(new Decimal(item.cgstAmount));
        existing.sgst = existing.sgst.plus(new Decimal(item.sgstAmount));
        existing.igst = existing.igst.plus(new Decimal(item.igstAmount));
        existing.total = existing.total.plus(new Decimal(item.totalAmount));

        hsnMap.set(hsn, existing);
      }
    }

    return {
      summary: {
        totalTaxable: totalTaxable.toDecimalPlaces(2).toNumber(),
        totalCgst: totalCgst.toDecimalPlaces(2).toNumber(),
        totalSgst: totalSgst.toDecimalPlaces(2).toNumber(),
        totalIgst: totalIgst.toDecimalPlaces(2).toNumber(),
        totalTax: totalTax.toDecimalPlaces(2).toNumber(),
        totalInvoices: sales.length,
      },
      hsnBreakdown: Array.from(hsnMap.values()).map((h) => ({
        hsnCode: h.hsnCode,
        taxable: h.taxable.toDecimalPlaces(2).toNumber(),
        cgst: h.cgst.toDecimalPlaces(2).toNumber(),
        sgst: h.sgst.toDecimalPlaces(2).toNumber(),
        igst: h.igst.toDecimalPlaces(2).toNumber(),
        total: h.total.toDecimalPlaces(2).toNumber(),
      })),
    };
  }

  async getScheduleH1Register(storeId: string, startDate?: string, endDate?: string) {
    const where: any = {
      storeId,
      status: { in: ['COMPLETED', 'RETURNED_PARTIAL'] },
    };

    if (startDate && endDate) {
      where.saleDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const sales = await this.prisma.sale.findMany({
      where,
      orderBy: { saleDate: 'desc' },
      include: {
        cashier: { select: { fullName: true } },
        items: {
          where: {
            medicine: {
              prescriptionCategory: { in: ['SCHEDULE_H1', 'SCHEDULE_X'] },
            },
          },
          include: {
            medicine: {
              select: {
                name: true,
                genericName: true,
                composition: true,
                prescriptionCategory: true,
              },
            },
            batch: {
              select: {
                batchNumber: true,
                expiryDate: true,
              },
            },
          },
        },
      },
    });

    const entries = [];
    for (const sale of sales) {
      for (const item of sale.items) {
        entries.push({
          date: sale.saleDate,
          invoiceNumber: sale.invoiceNumber,
          patientName: sale.patientName,
          doctorName: sale.doctorName,
          doctorRegNo: sale.doctorRegNo,
          medicineName: item.medicine.name,
          category: item.medicine.prescriptionCategory,
          batchNumber: item.batch.batchNumber,
          expiryDate: item.batch.expiryDate,
          quantity: item.quantity,
          cashier: sale.cashier.fullName,
        });
      }
    }

    return entries;
  }
}
