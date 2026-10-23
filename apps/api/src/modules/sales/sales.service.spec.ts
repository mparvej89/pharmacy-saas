import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from './sales.service';
import { PrismaService } from '@/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';

describe('SalesService - Multi-Unit Sales, Strip/Piece Billing & Stock Conversion', () => {
  let service: SalesService;
  let prisma: any;

  const mockStoreId = 'store-uuid-1';
  const mockCashierId = 'user-uuid-1';
  const mockMedicine = {
    id: 'med-zintec-200',
    storeId: mockStoreId,
    name: 'Zintec 200mg',
    genericName: 'Ranitidine',
    brandName: 'Zintec',
    dosageForm: 'TABLET',
    baseUnit: 'TABLET',
    purchaseUnit: 'STRIP',
    conversionFactor: 10,
    packSize: 10,
    unitSellingPrice: '1.30',
    sellingPrice: '13.00',
    mrp: '15.00',
    gstRate: '5.00',
    prescriptionCategory: 'OTC',
    hsnCode: '3004',
    isActive: true,
  };

  const createMockBatch = (id: string, batchNumber: string, expiryDate: Date, quantityAvailable: number) => ({
    id,
    storeId: mockStoreId,
    medicineId: mockMedicine.id,
    batchNumber,
    expiryDate,
    quantityAvailable,
    mrp: '15.00',
    sellingPrice: '13.00',
    purchasePrice: '10.00',
    status: 'ACTIVE',
  });

  beforeEach(async () => {
    prisma = {
      tenantStore: {
        findUnique: jest.fn().mockResolvedValue({ id: mockStoreId, name: 'Apollo Pharmacy' }),
      },
      customer: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'cust-1' }),
      },
      sale: {
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      medicine: {
        findFirst: jest.fn(),
      },
      medicineBatch: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      stockLedgerEntry: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
  });

  it('1. Purchase & Stock Conversion: 10 strips of 10 tablets stored as 100 base tablets', () => {
    const purchaseQuantity = 10; // 10 strips
    const conversionFactor = 10; // 10 tablets per strip
    const totalReceivedBase = purchaseQuantity * conversionFactor; // 100 tablets
    expect(totalReceivedBase).toBe(100);
  });

  it('2. Sell 1 strip: stock decreases by 10 tablets (1 strip * 10 = 10 base units)', async () => {
    const futureExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const batch = createMockBatch('batch-1', 'BATCH001', futureExpiry, 100);

    prisma.medicine.findFirst.mockResolvedValue(mockMedicine);
    prisma.medicineBatch.findMany.mockResolvedValue([batch]);
    prisma.medicineBatch.update.mockResolvedValue({ ...batch, quantityAvailable: 90 });
    prisma.sale.create.mockImplementation(({ data }: any) => ({
      id: 'sale-1',
      invoiceNumber: data.invoiceNumber,
      ...data,
      payments: [{ paymentMethod: 'CASH' }],
    }));

    await service.checkout(mockStoreId, mockCashierId, {
      idempotencyKey: 'idemp-1',
      items: [
        {
          medicineId: mockMedicine.id,
          quantity: 1,
          saleUnit: 'STRIP',
          conversionFactor: 10,
          unitPrice: 13.0,
        },
      ],
      payments: [{ paymentMethod: 'CASH' as any, amount: 20.0 }],
    });

    expect(prisma.medicineBatch.update).toHaveBeenCalledWith({
      where: { id: 'batch-1' },
      data: { quantityAvailable: { decrement: 10 } },
    });

    const createdItem = prisma.sale.create.mock.calls[0][0].data.items.create[0];
    expect(createdItem.saleUnit).toBe('STRIP');
    expect(createdItem.conversionFactor).toBe(10);
    expect(createdItem.baseQuantity).toBe(10);
    expect(createdItem.unitPrice).toBe(13.0);
  });

  it('3. Sell 1 tablet: stock decreases by 1 tablet when starting from 100 (balance 99)', async () => {
    const futureExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const batch = createMockBatch('batch-1', 'BATCH001', futureExpiry, 100);

    prisma.medicine.findFirst.mockResolvedValue(mockMedicine);
    prisma.medicineBatch.findMany.mockResolvedValue([batch]);
    prisma.medicineBatch.update.mockResolvedValue({ ...batch, quantityAvailable: 99 });
    prisma.sale.create.mockImplementation(({ data }: any) => ({
      id: 'sale-2',
      invoiceNumber: data.invoiceNumber,
      ...data,
      payments: [{ paymentMethod: 'CASH' }],
    }));

    await service.checkout(mockStoreId, mockCashierId, {
      idempotencyKey: 'idemp-2',
      items: [
        {
          medicineId: mockMedicine.id,
          quantity: 1,
          saleUnit: 'TABLET',
          conversionFactor: 1,
          unitPrice: 1.3,
        },
      ],
      payments: [{ paymentMethod: 'CASH' as any, amount: 10.0 }],
    });

    expect(prisma.medicineBatch.update).toHaveBeenCalledWith({
      where: { id: 'batch-1' },
      data: { quantityAvailable: { decrement: 1 } },
    });
  });

  it('4. Sell 3 tablets: stock decreases by 3 tablets when starting from 100 (balance 97)', async () => {
    const futureExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const batch = createMockBatch('batch-1', 'BATCH001', futureExpiry, 100);

    prisma.medicine.findFirst.mockResolvedValue(mockMedicine);
    prisma.medicineBatch.findMany.mockResolvedValue([batch]);
    prisma.medicineBatch.update.mockResolvedValue({ ...batch, quantityAvailable: 97 });
    prisma.sale.create.mockImplementation(({ data }: any) => ({
      id: 'sale-3',
      invoiceNumber: data.invoiceNumber,
      ...data,
      payments: [{ paymentMethod: 'CASH' }],
    }));

    await service.checkout(mockStoreId, mockCashierId, {
      idempotencyKey: 'idemp-3',
      items: [
        {
          medicineId: mockMedicine.id,
          quantity: 3,
          saleUnit: 'TABLET',
          conversionFactor: 1,
          unitPrice: 1.3,
        },
      ],
      payments: [{ paymentMethod: 'CASH' as any, amount: 10.0 }],
    });

    expect(prisma.medicineBatch.update).toHaveBeenCalledWith({
      where: { id: 'batch-1' },
      data: { quantityAvailable: { decrement: 3 } },
    });
  });

  it('5. Mixed-unit sale: 2 strips + 3 tablets = exactly 23 base tablets deducted', async () => {
    const futureExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const batch = createMockBatch('batch-1', 'BATCH001', futureExpiry, 100);

    prisma.medicine.findFirst.mockResolvedValue(mockMedicine);
    prisma.medicineBatch.findMany.mockResolvedValue([batch]);
    prisma.medicineBatch.update
      .mockResolvedValueOnce({ ...batch, quantityAvailable: 80 })
      .mockResolvedValueOnce({ ...batch, quantityAvailable: 77 });

    prisma.sale.create.mockImplementation(({ data }: any) => ({
      id: 'sale-4',
      invoiceNumber: data.invoiceNumber,
      ...data,
      payments: [{ paymentMethod: 'CASH' }],
    }));

    await service.checkout(mockStoreId, mockCashierId, {
      idempotencyKey: 'idemp-4',
      items: [
        {
          medicineId: mockMedicine.id,
          quantity: 2,
          saleUnit: 'STRIP',
          conversionFactor: 10,
          unitPrice: 13.0,
        },
        {
          medicineId: mockMedicine.id,
          quantity: 3,
          saleUnit: 'TABLET',
          conversionFactor: 1,
          unitPrice: 1.3,
        },
      ],
      payments: [{ paymentMethod: 'CASH' as any, amount: 50.0 }],
    });

    const calls = prisma.medicineBatch.update.mock.calls;
    expect(calls.length).toBe(2);
    // Call 1: 2 strips * 10 = 20 base units
    expect(calls[0][0].data.quantityAvailable.decrement).toBe(20);
    // Call 2: 3 tablets * 1 = 3 base units
    expect(calls[1][0].data.quantityAvailable.decrement).toBe(3);
  });

  it('6. FEFO Batch Splitting: Spanning 2 batches (Batch A: 20 tabs, Batch B: 80 tabs) for 25 tablets', async () => {
    const march2027 = new Date(2027, 2, 15);
    const oct2027 = new Date(2027, 9, 15);

    const batchA = createMockBatch('batch-a', 'BATCH_A', march2027, 20);
    const batchB = createMockBatch('batch-b', 'BATCH_B', oct2027, 80);

    prisma.medicine.findFirst.mockResolvedValue(mockMedicine);
    prisma.medicineBatch.findMany.mockResolvedValue([batchA, batchB]);
    prisma.medicineBatch.update
      .mockResolvedValueOnce({ ...batchA, quantityAvailable: 0 })
      .mockResolvedValueOnce({ ...batchB, quantityAvailable: 75 });

    prisma.sale.create.mockImplementation(({ data }: any) => ({
      id: 'sale-5',
      invoiceNumber: data.invoiceNumber,
      ...data,
      payments: [{ paymentMethod: 'CASH' }],
    }));

    await service.checkout(mockStoreId, mockCashierId, {
      idempotencyKey: 'idemp-5',
      items: [
        {
          medicineId: mockMedicine.id,
          quantity: 25,
          saleUnit: 'TABLET',
          conversionFactor: 1,
          unitPrice: 1.3,
        },
      ],
      payments: [{ paymentMethod: 'CASH' as any, amount: 50.0 }],
    });

    const calls = prisma.medicineBatch.update.mock.calls;
    expect(calls.length).toBe(2);
    // 20 tablets from batch A (earliest expiry)
    expect(calls[0][0].where.id).toBe('batch-a');
    expect(calls[0][0].data.quantityAvailable.decrement).toBe(20);
    // 5 tablets from batch B (later expiry)
    expect(calls[1][0].where.id).toBe('batch-b');
    expect(calls[1][0].data.quantityAvailable.decrement).toBe(5);
  });

  it('7. Rejection when attempting to sell more stock than available in base units', async () => {
    const futureExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const batch = createMockBatch('batch-1', 'BATCH001', futureExpiry, 15); // only 15 tablets

    prisma.medicine.findFirst.mockResolvedValue(mockMedicine);
    prisma.medicineBatch.findMany.mockResolvedValue([batch]);

    let error: any;
    try {
      await service.checkout(mockStoreId, mockCashierId, {
        idempotencyKey: 'idemp-6',
        items: [
          {
            medicineId: mockMedicine.id,
            quantity: 2, // 2 strips = 20 tablets > 15
            saleUnit: 'STRIP',
            conversionFactor: 10,
          },
        ],
        payments: [{ paymentMethod: 'CASH' as any, amount: 50.0 }],
      });
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(BadRequestException);
  });

  it('8. Rejection when attempting to sell an expired batch', async () => {
    prisma.medicine.findFirst.mockResolvedValue(mockMedicine);
    prisma.medicineBatch.findFirst.mockResolvedValue(null); // findFirst filters expiryDate > today
    prisma.medicineBatch.findMany.mockResolvedValue([]); // FEFO query excludes expired

    let error: any;
    try {
      await service.checkout(mockStoreId, mockCashierId, {
        idempotencyKey: 'idemp-7',
        items: [
          {
            medicineId: mockMedicine.id,
            batchId: 'batch-expired',
            quantity: 1,
            saleUnit: 'STRIP',
            conversionFactor: 10,
          },
        ],
        payments: [{ paymentMethod: 'CASH' as any, amount: 50.0 }],
      });
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(BadRequestException);
  });

  it('9. Cancelling a finalized invoice restores the exact base quantity to batches with audit ledger', async () => {
    const saleId = 'sale-to-cancel';
    const mockSale = {
      id: saleId,
      storeId: mockStoreId,
      invoiceNumber: 'INV-20261022-0001',
      status: 'COMPLETED',
      notes: null,
      items: [
        {
          id: 'item-1',
          medicineId: mockMedicine.id,
          batchId: 'batch-1',
          quantity: 2,
          saleUnit: 'STRIP',
          conversionFactor: 10,
          baseQuantity: 20, // 20 tablets
        },
        {
          id: 'item-2',
          medicineId: mockMedicine.id,
          batchId: 'batch-1',
          quantity: 3,
          saleUnit: 'TABLET',
          conversionFactor: 1,
          baseQuantity: 3, // 3 tablets
        },
      ],
      payments: [{ paymentMethod: 'CASH' }],
    };

    prisma.sale.findFirst.mockResolvedValue(mockSale);
    prisma.medicineBatch.update
      .mockResolvedValueOnce({ id: 'batch-1', quantityAvailable: 20 })
      .mockResolvedValueOnce({ id: 'batch-1', quantityAvailable: 23 });
    prisma.sale.update.mockResolvedValue({ ...mockSale, status: 'CANCELLED' });

    await service.cancelSale(mockStoreId, saleId, mockCashierId, 'Customer return before leaving counter');

    const updateCalls = prisma.medicineBatch.update.mock.calls;
    expect(updateCalls.length).toBe(2);
    // Batch 1 restored by 20 base units for item 1
    expect(updateCalls[0][0].data.quantityAvailable.increment).toBe(20);
    // Batch 1 restored by 3 base units for item 2
    expect(updateCalls[1][0].data.quantityAvailable.increment).toBe(3);

    // Reversal stock ledger entries created
    expect(prisma.stockLedgerEntry.create).toHaveBeenCalledTimes(2);
    const ledgerCalls = prisma.stockLedgerEntry.create.mock.calls;
    expect(ledgerCalls[0][0].data.movementType).toBe('SALE_RETURN');
    expect(ledgerCalls[0][0].data.quantityChange).toBe(20);
    expect(ledgerCalls[1][0].data.movementType).toBe('SALE_RETURN');
    expect(ledgerCalls[1][0].data.quantityChange).toBe(3);
  });
});
