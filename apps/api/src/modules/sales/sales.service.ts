import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateSaleDto } from './dto/sale.dto';
import Decimal from 'decimal.js';
import { BankAccountType, BankTransactionType } from '@prisma/client';

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
    if (startDate || endDate) {
      where.saleDate = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.saleDate.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.saleDate.lte = end;
      }
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

  /**
   * Generates a clean, professional GST Tax Invoice in HTML format
   * Supports both 80mm Thermal Slip and standard A4 Print / PDF.
   */
  async generateInvoiceHtml(storeId: string, id: string, format: 'thermal' | 'a4' = 'a4') {
    const sale = await this.findOne(storeId, id);

    const store = sale.store;
    const items = sale.items;
    const isThermal = format === 'thermal';

    const itemsRows = items
      .map(
        (item: any, idx: number) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td>
            <strong>${item.medicine.name}</strong><br/>
            <small style="color: #64748b;">HSN: ${item.medicine.hsnCode} | Unit: ${item.saleUnit || 'STRIP'}${item.conversionFactor > 1 ? ` (${item.conversionFactor}s)` : ''}</small>
          </td>
          <td style="text-align: center;">${item.batch?.batchNumber || 'N/A'}</td>
          <td style="text-align: center;">${item.batch?.expiryDate ? new Date(item.batch.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' }) : 'N/A'}</td>
          <td style="text-align: right;">${item.quantity} ${item.saleUnit || ''}</td>
          <td style="text-align: right;">₹${Number(item.mrp).toFixed(2)}</td>
          <td style="text-align: right;">₹${Number(item.unitPrice).toFixed(2)}</td>
          <td style="text-align: right;">${Number(item.discountPercent || 0)}%</td>
          <td style="text-align: right;">${Number(item.gstRate)}%</td>
          <td style="text-align: right; font-weight: bold;">₹${Number(item.totalAmount).toFixed(2)}</td>
        </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tax Invoice - ${sale.invoiceNumber}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: ${isThermal ? '10px' : '30px'};
      max-width: ${isThermal ? '80mm' : '850px'};
      margin: 0 auto;
      font-size: ${isThermal ? '11px' : '13px'};
      line-height: 1.4;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .store-name {
      font-size: ${isThermal ? '16px' : '22px'};
      font-weight: 800;
      color: #0f766e;
      text-transform: uppercase;
      margin: 0 0 4px 0;
    }
    .store-sub {
      margin: 2px 0;
      color: #334155;
    }
    .badge-title {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 12px;
      background: #0f172a;
      color: #fff;
      font-weight: bold;
      border-radius: 4px;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: ${isThermal ? '1fr' : '1fr 1fr'};
      gap: 12px;
      margin-bottom: 16px;
      background: #f8fafc;
      padding: 10px 14px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .info-col p {
      margin: 3px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      padding: 6px 8px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 2px solid #94a3b8;
      font-size: 11px;
    }
    td {
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    .totals-box {
      float: right;
      width: ${isThermal ? '100%' : '320px'};
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 16px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      margin: 4px 0;
    }
    .grand-total {
      font-size: ${isThermal ? '14px' : '16px'};
      font-weight: 800;
      color: #0f766e;
      border-top: 2px dashed #94a3b8;
      padding-top: 6px;
      margin-top: 6px;
    }
    .footer {
      clear: both;
      text-align: center;
      border-top: 1px dashed #cbd5e1;
      padding-top: 12px;
      color: #64748b;
      font-size: 11px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="store-name">${store.name}</h1>
    <div class="store-sub">${store.address || ''}${store.city ? ', ' + store.city : ''}${store.pincode ? ' - ' + store.pincode : ''}</div>
    <div class="store-sub">Phone: ${store.phone} | Email: ${store.email || 'N/A'}</div>
    <div class="store-sub"><strong>GSTIN:</strong> ${store.gstin || 'UNREGISTERED'} | <strong>D.L. No:</strong> ${store.drugLicenseNumber || 'N/A'}</div>
    <div><span class="badge-title">RETAIL TAX INVOICE (GST)</span></div>
  </div>

  <div class="info-grid">
    <div class="info-col">
      <p><strong>Invoice No:</strong> ${sale.invoiceNumber}</p>
      <p><strong>Date & Time:</strong> ${new Date(sale.saleDate).toLocaleString('en-IN')}</p>
      <p><strong>Cashier:</strong> ${sale.cashier?.fullName || 'Counter 1'}</p>
    </div>
    <div class="info-col">
      <p><strong>Patient / Customer:</strong> ${sale.patientName || sale.customer?.name || 'Walk-in Customer'}</p>
      <p><strong>Phone:</strong> ${sale.customer?.phone || 'N/A'}</p>
      ${sale.doctorName ? `<p><strong>Doctor:</strong> ${sale.doctorName} ${sale.doctorRegNo ? '(' + sale.doctorRegNo + ')' : ''}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 25px;">#</th>
        <th>Description</th>
        <th style="text-align: center;">Batch</th>
        <th style="text-align: center;">Exp</th>
        <th style="text-align: right;">Qty</th>
        <th style="text-align: right;">MRP</th>
        <th style="text-align: right;">Rate</th>
        <th style="text-align: right;">Disc</th>
        <th style="text-align: right;">GST</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="totals-box">
    <div class="totals-row"><span>Gross Subtotal:</span><span>₹${Number(sale.subtotal).toFixed(2)}</span></div>
    <div class="totals-row"><span>Total Discounts:</span><span>-₹${(Number(sale.itemDiscountTotal) + Number(sale.billDiscountAmount)).toFixed(2)}</span></div>
    <div class="totals-row"><span>Taxable Value:</span><span>₹${Number(sale.taxableAmount).toFixed(2)}</span></div>
    <div class="totals-row"><span>CGST (Intra-state):</span><span>₹${Number(sale.cgstAmount).toFixed(2)}</span></div>
    <div class="totals-row"><span>SGST (Intra-state):</span><span>₹${Number(sale.sgstAmount).toFixed(2)}</span></div>
    ${Number(sale.roundOff) !== 0 ? `<div class="totals-row"><span>Round Off:</span><span>${Number(sale.roundOff) > 0 ? '+' : ''}₹${Number(sale.roundOff).toFixed(2)}</span></div>` : ''}
    <div class="totals-row grand-total"><span>Net Payable:</span><span>₹${Number(sale.grandTotal).toFixed(2)}</span></div>
    <div class="totals-row" style="font-size: 11px; color: #475569; margin-top: 4px;">
      <span>Paid (${sale.payments[0]?.paymentMethod || 'CASH'}):</span>
      <span>₹${Number(sale.paidAmount).toFixed(2)}</span>
    </div>
    ${Number(sale.changeAmount) > 0 ? `<div class="totals-row" style="font-size: 11px; color: #047857;"><span>Change Returned:</span><span>₹${Number(sale.changeAmount).toFixed(2)}</span></div>` : ''}
  </div>

  <div class="footer">
    <p>Terms: Goods once sold will be exchanged/refunded within 7 days against valid batch & invoice.</p>
    <p><strong>Thank you for choosing ${store.name}! Wish you good health and a speedy recovery.</strong></p>
  </div>
</body>
</html>`;
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
            `Prescription details required: "${medicine.name}" is classified under ${medicine.prescriptionCategory}. Patient Name and Doctor Name must be provided.`,
          );
        }

        // Statutory requirement: Doctor Registration No is mandatory for Schedule H1 and Schedule X dispensing register
        if (
          ['SCHEDULE_H1', 'SCHEDULE_X'].includes(medicine.prescriptionCategory) &&
          !dto.doctorRegNo?.trim()
        ) {
          throw new BadRequestException(
            `Doctor Registration Number is mandatory for statutory ${medicine.prescriptionCategory} drug: "${medicine.name}". Please enter Doctor Reg #.`,
          );
        }

        // Validate quantity is positive and non-zero
        if (!line.quantity || line.quantity <= 0) {
          throw new BadRequestException(
            `Invalid quantity for "${medicine.name}". Quantity must be greater than zero. Received: ${line.quantity}`,
          );
        }

        // Unit conversion & packaging calculations
        // Check countable forms rejection for fractional quantities
        const isCountable = ['TABLET', 'CAPSULE', 'POWDER'].includes(medicine.dosageForm);
        if (isCountable && !Number.isInteger(line.quantity)) {
          throw new BadRequestException(
            `Fractional quantity is not permitted for countable medicine form "${medicine.dosageForm}". Quantity must be a whole number.`,
          );
        }

        // Determine conversion factor based on selected unit
        let factor = 1;
        const normalizedUnit = (line.saleUnit || medicine.purchaseUnit || 'STRIP').trim().toUpperCase();
        const purchaseUnitUpper = (medicine.purchaseUnit || 'STRIP').trim().toUpperCase();
        const baseUnitUpper = (medicine.baseUnit || 'TABLET').trim().toUpperCase();

        if (normalizedUnit === purchaseUnitUpper) {
          // If selling in the purchase pack unit (e.g. STRIP or BOX):
          factor = medicine.conversionFactor || 1;
        } else if (normalizedUnit === baseUnitUpper || ['TABLET', 'CAPSULE', 'SACHET', 'BOTTLE', 'UNIT', 'PIECE'].includes(normalizedUnit)) {
          // Selling in base unit
          factor = 1;
        } else if (normalizedUnit === 'BOX' && medicine.boxPackaging && medicine.stripsPerBox) {
          // Explicit secondary box packaging where purchaseUnit was STRIP and BOX is a tertiary container
          factor = medicine.stripsPerBox * (medicine.conversionFactor || 1);
        } else {
          factor = line.conversionFactor || 1;
        }

        const saleUnit = normalizedUnit;
        const totalBaseNeeded = line.quantity * factor;

        // Determine price per selected unit:
        // Priority:
        // 1. Explicit line.unitPrice (if supplied)
        // 2. If selling in base unit (e.g. 1 bottle / 1 loose tablet) and pack has conversionFactor > 1:
        //    use unitSellingPrice if set, otherwise sellingPrice / conversionFactor
        // 3. If selling in secondary outer BOX packaging:
        //    sellingPrice * stripsPerBox
        // 4. Default: medicine.sellingPrice (the price of 1 purchaseUnit)
        let effectiveUnitPrice: Decimal;
        if (line.unitPrice !== undefined && line.unitPrice !== null) {
          effectiveUnitPrice = new Decimal(line.unitPrice);
        } else if (factor === 1 && (medicine.conversionFactor || 1) > 1) {
          effectiveUnitPrice = medicine.unitSellingPrice
            ? new Decimal(medicine.unitSellingPrice)
            : new Decimal(medicine.sellingPrice).dividedBy(medicine.conversionFactor || 1);
        } else if (saleUnit === 'BOX' && purchaseUnitUpper !== 'BOX' && medicine.boxPackaging && medicine.stripsPerBox) {
          const stripsPerBox = new Decimal(medicine.stripsPerBox || 10);
          effectiveUnitPrice = new Decimal(medicine.sellingPrice).times(stripsPerBox);
        } else {
          effectiveUnitPrice = new Decimal(medicine.sellingPrice);
        }

        // Batch allocation logic: Manual or FEFO in base stock units
        let allocatedBatches: Array<{
          batchId: string;
          batch: any;
          qtyBase: number;
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
          if (!batch || batch.quantityAvailable < totalBaseNeeded) {
            throw new BadRequestException(
              `Batch ${batch?.batchNumber || ''} has insufficient unexpired stock (available: ${batch?.quantityAvailable || 0} ${medicine.baseUnit || 'units'}, required: ${totalBaseNeeded})`,
            );
          }
          allocatedBatches.push({ batchId: batch.id, batch, qtyBase: totalBaseNeeded });
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
          if (totalAvail < totalBaseNeeded) {
            throw new BadRequestException(
              `Insufficient unexpired stock for "${medicine.name}". Requested: ${line.quantity} ${saleUnit} (${totalBaseNeeded} ${medicine.baseUnit || 'units'}), Available: ${totalAvail} ${medicine.baseUnit || 'units'}`,
            );
          }

          let remainingToFulfill = totalBaseNeeded;
          for (const batch of eligibleBatches) {
            if (remainingToFulfill <= 0) break;
            const take = Math.min(batch.quantityAvailable, remainingToFulfill);
            allocatedBatches.push({ batchId: batch.id, batch, qtyBase: take });
            remainingToFulfill -= take;
          }
        }

        // Calculate line items for each batch allocation
        // If single batch: preserve full entered line.quantity and saleUnit
        // If split across multiple batches: allocate proportional sale quantity and base quantity
        for (const alloc of allocatedBatches) {
          // Proportion of sale quantity for this batch
          const allocSaleQty = allocatedBatches.length === 1
            ? line.quantity
            : Number((alloc.qtyBase / factor).toFixed(2));

          const lineGross = effectiveUnitPrice.times(allocSaleQty);
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
            quantity: allocSaleQty,
            saleUnit,
            conversionFactor: factor,
            baseQuantity: alloc.qtyBase,
            unitPrice: effectiveUnitPrice.toDecimalPlaces(2).toNumber(),
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

          // Deduct batch quantity in canonical base units
          const updatedBatch = await tx.medicineBatch.update({
            where: { id: alloc.batchId },
            data: {
              quantityAvailable: { decrement: alloc.qtyBase },
            },
          });

          stockLedgerUpdates.push({
            storeId,
            medicineId: line.medicineId,
            batchId: alloc.batchId,
            movementType: 'SALE' as const,
            quantityChange: -alloc.qtyBase,
            balanceAfter: updatedBatch.quantityAvailable,
            referenceType: 'SALE',
            userId: cashierId,
            notes: `Sold ${allocSaleQty} ${saleUnit} (${alloc.qtyBase} ${medicine.baseUnit || 'units'}) via ${invoiceNumber}`,
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
      const totalPaid = (dto.payments || []).reduce(
        (sum, p) => sum.plus(new Decimal(p.amount || 0)),
        new Decimal(0),
      );

      let paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = 'PAID';
      let changeAmount = new Decimal(0);

      if (totalPaid.lessThan(grandTotal)) {
        if (totalPaid.isZero()) {
          paymentStatus = 'UNPAID';
        } else {
          paymentStatus = 'PARTIAL';
        }

        // For credit / unpaid / partial sales, require customer info for receivable tracking
        if (!customerId && !dto.customerPhone && !dto.patientName) {
          throw new BadRequestException(
            `Customer name or phone is required for Credit / Partial payments (₹${totalPaid} paid of ₹${grandTotal} total).`,
          );
        }
      } else {
        paymentStatus = 'PAID';
        changeAmount = totalPaid.minus(grandTotal);
      }

      // Record actual cash/bank received for this invoice (capped at grandTotal if change is given)
      const actualReceived = totalPaid.greaterThan(grandTotal) ? grandTotal : totalPaid;

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
          paidAmount: actualReceived.toDecimalPlaces(2).toNumber(),
          changeAmount: changeAmount.toDecimalPlaces(2).toNumber(),
          paymentStatus,
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

      // Automatically post Cash/Bank transaction ledger entries for received payments
      if (tx.cashBankAccount && tx.cashBankTransaction) {
        for (const p of dto.payments) {
          const pAmount = new Decimal(p.amount);
          if (pAmount.greaterThan(0) && p.paymentMethod !== 'CREDIT') {
            let targetType: BankAccountType = BankAccountType.CASH;
            if (p.paymentMethod === 'UPI') {
              targetType = BankAccountType.UPI_SETTLEMENT;
            } else if (p.paymentMethod === 'CARD' || p.paymentMethod === 'CHEQUE') {
              targetType = BankAccountType.BANK;
            }

            // Find account for this store
            let account = await tx.cashBankAccount.findFirst({
              where: { storeId, accountType: targetType, isActive: true },
              orderBy: { isDefault: 'desc' },
            });

            // Fallback to cash account if specific account type isn't created yet
            if (!account) {
              account = await tx.cashBankAccount.findFirst({
                where: { storeId, accountType: BankAccountType.CASH, isActive: true },
              });
            }

            if (account) {
              const updatedAccount = await tx.cashBankAccount.update({
                where: { id: account.id },
                data: { currentBalance: { increment: pAmount.toNumber() } },
              });

              await tx.cashBankTransaction.create({
                data: {
                  storeId,
                  accountId: account.id,
                  transactionDate: new Date(),
                  transactionType: BankTransactionType.RECEIPT,
                  amount: pAmount.toNumber(),
                  balanceAfter: updatedAccount.currentBalance,
                  paymentMethod: p.paymentMethod,
                  referenceNumber: p.referenceNumber || sale.invoiceNumber,
                  partyName: dto.patientName || 'Retail Customer',
                  narration: `POS Sale Receipt: ${sale.invoiceNumber} (${p.paymentMethod})`,
                  category: 'SALES_RECEIPT',
                  createdById: cashierId,
                },
              });
            }
          }
        }
      }

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

  /**
   * Reverses a finalized sale atomically:
   * Restores base stock units back to respective batches and logs reversal stock ledger entries.
   */
  async cancelSale(storeId: string, id: string, cashierId: string, reason?: string) {
    const sale = await this.findOne(storeId, id);

    if (sale.status === 'CANCELLED') {
      throw new BadRequestException('Sales invoice is already cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        const baseQtyToReturn = (item as any).baseQuantity || item.quantity;

        // Restore quantity to the original batch
        const updatedBatch = await tx.medicineBatch.update({
          where: { id: item.batchId },
          data: {
            quantityAvailable: { increment: baseQtyToReturn },
          },
        });

        // Write auditable reversing stock ledger entry
        await tx.stockLedgerEntry.create({
          data: {
            storeId,
            medicineId: item.medicineId,
            batchId: item.batchId,
            movementType: 'SALE_RETURN',
            quantityChange: baseQtyToReturn,
            balanceAfter: updatedBatch.quantityAvailable,
            referenceType: 'SALE',
            referenceId: sale.id,
            userId: cashierId,
            notes: `Sale Cancellation Reversal: ${sale.invoiceNumber} (Restored ${baseQtyToReturn} base units; Reason: ${reason || 'Cashier Cancellation'})`,
          },
        });
      }

      // Reverse cash/bank payments received
      if (tx.cashBankAccount && tx.cashBankTransaction && sale.payments && Array.isArray(sale.payments)) {
        for (const p of sale.payments) {
          if (!p || p.amount === undefined || p.amount === null) continue;
          const pAmount = new Decimal(p.amount);
          if (pAmount.greaterThan(0)) {
            let targetType: BankAccountType = BankAccountType.CASH;
            if (p.paymentMethod === 'UPI') {
              targetType = BankAccountType.UPI_SETTLEMENT;
            } else if (p.paymentMethod === 'CARD' || p.paymentMethod === 'CHEQUE') {
              targetType = BankAccountType.BANK;
            }

            let account = await tx.cashBankAccount.findFirst({
              where: { storeId, accountType: targetType, isActive: true },
              orderBy: { isDefault: 'desc' },
            });
            if (!account) {
              account = await tx.cashBankAccount.findFirst({
                where: { storeId, accountType: BankAccountType.CASH, isActive: true },
              });
            }

            if (account) {
              const updatedAccount = await tx.cashBankAccount.update({
                where: { id: account.id },
                data: { currentBalance: { decrement: pAmount.toNumber() } },
              });

              await tx.cashBankTransaction.create({
                data: {
                  storeId,
                  accountId: account.id,
                  transactionDate: new Date(),
                  transactionType: BankTransactionType.REFUND,
                  amount: pAmount.toNumber(),
                  balanceAfter: updatedAccount.currentBalance,
                  paymentMethod: p.paymentMethod || 'CASH',
                  referenceNumber: `REV-${sale.invoiceNumber}`,
                  partyName: sale.patientName || 'Retail Customer',
                  narration: `Sale Cancellation Refund: ${sale.invoiceNumber} (${reason || 'Cancelled'})`,
                  category: 'SALE_REFUND',
                  createdById: cashierId,
                },
              });
            }
          }
        }
      }

      return tx.sale.update({
        where: { id: sale.id },
        data: {
          status: 'CANCELLED',
          notes: sale.notes
            ? `${sale.notes} | CANCELLED: ${reason || 'N/A'}`
            : `CANCELLED: ${reason || 'N/A'}`,
        },
        include: {
          items: true,
          payments: true,
        },
      });
    });
  }
}
