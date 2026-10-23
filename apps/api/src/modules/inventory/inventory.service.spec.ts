import { InventoryService } from './inventory.service';
import { BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';

describe('MARG ERP Core Calculations & FEFO Allocation', () => {
  describe('InventoryService.getFefoAllocation', () => {
    let service: InventoryService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        medicineBatch: {
          findMany: jest.fn(),
        },
      };
      service = new InventoryService(mockPrisma);
    });

    it('should strictly allocate from earliest expiring active batches first', async () => {
      const now = new Date();
      const batch1 = {
        id: 'batch-1',
        batchNumber: 'B1-EXP-JUNE',
        expiryDate: new Date(now.getFullYear() + 1, 5, 30), // June next year
        quantityAvailable: 15,
        sellingPrice: '25.00',
        mrp: '30.00',
        status: 'ACTIVE',
      };
      const batch2 = {
        id: 'batch-2',
        batchNumber: 'B2-EXP-DEC',
        expiryDate: new Date(now.getFullYear() + 1, 11, 31), // Dec next year
        quantityAvailable: 50,
        sellingPrice: '25.00',
        mrp: '30.00',
        status: 'ACTIVE',
      };

      mockPrisma.medicineBatch.findMany.mockResolvedValue([batch1, batch2]);

      const result = await service.getFefoAllocation('store-1', 'med-1', 25);

      expect(result.length).toBe(2);
      // Batch 1 (earlier expiry) should be fully exhausted (15 units)
      expect(result[0].batchId).toBe('batch-1');
      expect(result[0].quantityToDeduct).toBe(15);
      // Batch 2 should fulfill remaining 10 units
      expect(result[1].batchId).toBe('batch-2');
      expect(result[1].quantityToDeduct).toBe(10);
    });

    it('should throw BadRequestException when total available unexpired stock is insufficient', async () => {
      const batch = {
        id: 'batch-1',
        batchNumber: 'B1',
        expiryDate: new Date(2028, 1, 1),
        quantityAvailable: 5,
        sellingPrice: '10.00',
        mrp: '12.00',
      };

      mockPrisma.medicineBatch.findMany.mockResolvedValue([batch]);

      let error: any;
      try {
        await service.getFefoAllocation('store-1', 'med-1', 10);
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(BadRequestException);
    });
  });

  describe('GST Tax Calculation & Round-off', () => {
    it('should accurately calculate taxable value, 50/50 intra-state CGST & SGST, and round-off', () => {
      const unitPrice = new Decimal('45.50');
      const qty = 3;
      const lineGross = unitPrice.times(qty); // 136.50
      const discountPercent = new Decimal('10'); // 10%
      const lineDiscount = lineGross.times(discountPercent.dividedBy(100)); // 13.65
      const taxable = lineGross.minus(lineDiscount); // 122.85

      const gstRate = new Decimal('12.00'); // 12% total GST
      const halfRate = gstRate.dividedBy(2); // 6% CGST, 6% SGST

      const cgst = taxable.times(halfRate.dividedBy(100)); // 7.371
      const sgst = taxable.times(halfRate.dividedBy(100)); // 7.371
      const totalTax = cgst.plus(sgst); // 14.742
      const totalAmount = taxable.plus(totalTax); // 137.592
      const roundedTotal = totalAmount.round(); // 138

      expect(lineGross.toString()).toBe('136.5');
      expect(taxable.toString()).toBe('122.85');
      expect(cgst.toFixed(2)).toBe('7.37');
      expect(sgst.toFixed(2)).toBe('7.37');
      expect(roundedTotal.toNumber()).toBe(138);
    });
  });
});
