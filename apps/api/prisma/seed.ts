import { PrismaClient, UserRole, DosageForm, PrescriptionCategory, BatchStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial pharmacy store, staff, medicines, and inventory batches...');

  // 0. Create or update Default SaaS Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'apollo-pharmacy' },
    update: {},
    create: {
      name: 'Apollo Pharmacy Enterprises',
      slug: 'apollo-pharmacy',
      legalName: 'Apollo Pharmacies Limited',
      gstin: '29ABCDE1234F1Z5',
      contactEmail: 'indiranagar@apollopharmacy.local',
      contactPhone: '+91 80 2525 9900',
      subscriptionPlan: 'ENTERPRISE',
    },
  });

  // 1. Create or update Default Pharmacy Store
  const store = await prisma.tenantStore.upsert({
    where: { code: 'APOLLO-IND' },
    update: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      name: 'Apollo Pharmacy Indiranagar',
      code: 'APOLLO-IND',
      drugLicenseNumber: 'KA-B2-887766',
      gstin: '29ABCDE1234F1Z5',
      address: '100 Feet Road, HAL 2nd Stage, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      stateCode: '29',
      pincode: '560038',
      phone: '+91 80 2525 9900',
      email: 'indiranagar@apollopharmacy.local',
      currency: 'INR',
    },
  });

  const branchStore = await prisma.store.upsert({
    where: { code: 'APOLLO-IND' },
    update: { tenantId: tenant.id },
    create: {
      id: store.id,
      tenantId: tenant.id,
      name: store.name,
      code: store.code,
      drugLicenseNumber: store.drugLicenseNumber,
      gstin: store.gstin,
      address: store.address,
      city: store.city,
      state: store.state,
      stateCode: store.stateCode,
      pincode: store.pincode,
      phone: store.phone,
      email: store.email,
      currency: store.currency,
    },
  });

  console.log(`Store initialized: ${store.name} (${store.id})`);

  // 2. Create Staff Users
  const defaultPassword = await bcrypt.hash('Password@123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@apollopharmacy.local' },
    update: {},
    create: {
      email: 'admin@apollopharmacy.local',
      fullName: 'Dr. Rajiv Menon',
      passwordHash: defaultPassword,
      phone: '+91 98450 11111',
    },
  });

  const pharmacistUser = await prisma.user.upsert({
    where: { email: 'pharmacist@apollopharmacy.local' },
    update: {},
    create: {
      email: 'pharmacist@apollopharmacy.local',
      fullName: 'Priya Sharma (R.Ph)',
      passwordHash: defaultPassword,
      phone: '+91 98450 22222',
    },
  });

  const cashierUser = await prisma.user.upsert({
    where: { email: 'cashier@apollopharmacy.local' },
    update: {},
    create: {
      email: 'cashier@apollopharmacy.local',
      fullName: 'Anil Deshmukh',
      passwordHash: defaultPassword,
      phone: '+91 98450 33333',
    },
  });

  const superAdminUser = await prisma.user.upsert({
    where: { email: 'superadmin@pharmapulse.io' },
    update: { isSuperAdmin: true },
    create: {
      email: 'superadmin@pharmapulse.io',
      fullName: 'PharmaPulse SaaS Super Admin',
      passwordHash: defaultPassword,
      phone: '+91 99999 00000',
      isSuperAdmin: true,
    },
  });

  // Assign store roles for store staff
  await prisma.userStoreRole.upsert({
    where: { userId_storeId: { userId: adminUser.id, storeId: store.id } },
    update: { role: UserRole.STORE_OWNER },
    create: { userId: adminUser.id, storeId: store.id, role: UserRole.STORE_OWNER },
  });

  await prisma.userStoreRole.upsert({
    where: { userId_storeId: { userId: pharmacistUser.id, storeId: store.id } },
    update: { role: UserRole.PHARMACIST },
    create: { userId: pharmacistUser.id, storeId: store.id, role: UserRole.PHARMACIST },
  });

  await prisma.userStoreRole.upsert({
    where: { userId_storeId: { userId: cashierUser.id, storeId: store.id } },
    update: { role: UserRole.BILLING_OPERATOR },
    create: { userId: cashierUser.id, storeId: store.id, role: UserRole.BILLING_OPERATOR },
  });

  // Sync StoreMembership records
  for (const [usr, role, isDefault] of [
    [adminUser, UserRole.STORE_OWNER, true],
    [pharmacistUser, UserRole.PHARMACIST, true],
    [cashierUser, UserRole.BILLING_OPERATOR, true],
  ] as const) {
    await prisma.storeMembership.upsert({
      where: { storeId_userId: { storeId: branchStore.id, userId: usr.id } },
      update: { role, isDefault },
      create: {
        tenantId: tenant.id,
        storeId: branchStore.id,
        userId: usr.id,
        role,
        isDefault,
      },
    });
  }

  // Ensure Super Admin has NO store role linkage (pure SaaS Platform Administrator)
  await prisma.userStoreRole.deleteMany({
    where: { userId: superAdminUser.id },
  });

  console.log('Accounts configured: 1 SaaS Super Admin (Independent), 3 Store Staff');

  // 3. Register Supplier
  const supplier = await prisma.supplier.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      storeId: store.id,
      name: 'MedLife Distributors Bangalore',
      contactPerson: 'Sanjay Gupta',
      phone: '+91 98860 55443',
      email: 'orders@medlifeblr.local',
      gstin: '29AABCM9876F1Z2',
      dlNumber: 'KA-B2-SUP-1122',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560058',
      outstandingBalance: 14500.0,
    },
  });

  console.log(`Supplier registered: ${supplier.name}`);

  // 4. Sample Medicines & Batches (Demonstrating FEFO, Schedules, and Indian GST)
  const medicinesData = [
    {
      name: 'Paracetamol 650mg',
      genericName: 'Paracetamol',
      brandName: 'Dolo 650',
      manufacturer: 'Micro Labs Ltd',
      composition: 'Paracetamol IP 650mg',
      dosageForm: DosageForm.TABLET,
      packSize: 15,
      unitOfMeasure: 'STRIP',
      hsnCode: '30049060',
      gstRate: 12.0,
      prescriptionCategory: PrescriptionCategory.OTC,
      barcode: '890111100101',
      sku: 'MED-DOLO-650',
      reorderLevel: 25,
      purchaseCost: 24.5,
      sellingPrice: 32.0,
      mrp: 35.0,
      batches: [
        {
          batchNumber: 'DL650-24A',
          expiryDate: new Date('2027-05-31'),
          quantityAvailable: 120,
          mrp: 35.0,
          purchasePrice: 24.5,
          sellingPrice: 32.0,
          rackLocation: 'A1-R2',
        },
        {
          batchNumber: 'DL650-23D',
          expiryDate: new Date('2026-12-31'), // Earlier expiry -> FEFO candidate 1
          quantityAvailable: 45,
          mrp: 34.0,
          purchasePrice: 23.8,
          sellingPrice: 32.0,
          rackLocation: 'A1-R1',
        },
      ],
    },
    {
      name: 'Amoxicillin & Potassium Clavulanate 625mg',
      genericName: 'Amoxicillin + Clavulanic Acid',
      brandName: 'Augmentin 625 Duo',
      manufacturer: 'GlaxoSmithKline Pharmaceuticals Ltd',
      composition: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
      dosageForm: DosageForm.TABLET,
      packSize: 10,
      unitOfMeasure: 'STRIP',
      hsnCode: '30041030',
      gstRate: 12.0,
      prescriptionCategory: PrescriptionCategory.SCHEDULE_H1,
      barcode: '890111100102',
      sku: 'MED-AUG-625',
      reorderLevel: 20,
      purchaseCost: 145.0,
      sellingPrice: 195.0,
      mrp: 215.0,
      batches: [
        {
          batchNumber: 'AUG-24B01',
          expiryDate: new Date('2027-08-31'),
          quantityAvailable: 60,
          mrp: 215.0,
          purchasePrice: 145.0,
          sellingPrice: 195.0,
          rackLocation: 'B2-R1',
        },
      ],
    },
    {
      name: 'Azithromycin 500mg',
      genericName: 'Azithromycin',
      brandName: 'Azee 500',
      manufacturer: 'Cipla Ltd',
      composition: 'Azithromycin IP 500mg',
      dosageForm: DosageForm.TABLET,
      packSize: 5,
      unitOfMeasure: 'STRIP',
      hsnCode: '30042099',
      gstRate: 12.0,
      prescriptionCategory: PrescriptionCategory.SCHEDULE_H,
      barcode: '890111100103',
      sku: 'MED-AZEE-500',
      reorderLevel: 15,
      purchaseCost: 85.0,
      sellingPrice: 115.0,
      mrp: 128.0,
      batches: [
        {
          batchNumber: 'AZ-24G09',
          expiryDate: new Date('2027-10-31'),
          quantityAvailable: 50,
          mrp: 128.0,
          purchasePrice: 85.0,
          sellingPrice: 115.0,
          rackLocation: 'B2-R3',
        },
      ],
    },
    {
      name: 'Cetirizine 10mg',
      genericName: 'Cetirizine Dihydrochloride',
      brandName: 'Cetzine',
      manufacturer: 'Dr. Reddy\'s Laboratories',
      composition: 'Cetirizine 10mg',
      dosageForm: DosageForm.TABLET,
      packSize: 10,
      unitOfMeasure: 'STRIP',
      hsnCode: '30049099',
      gstRate: 12.0,
      prescriptionCategory: PrescriptionCategory.OTC,
      barcode: '890111100104',
      sku: 'MED-CET-10',
      reorderLevel: 30,
      purchaseCost: 15.0,
      sellingPrice: 22.0,
      mrp: 24.5,
      batches: [
        {
          batchNumber: 'CTZ-24K',
          expiryDate: new Date('2028-01-31'),
          quantityAvailable: 15, // Below reorder level (30) to test Low Stock report!
          mrp: 24.5,
          purchasePrice: 15.0,
          sellingPrice: 22.0,
          rackLocation: 'C1-R1',
        },
      ],
    },
    {
      name: 'Alprazolam 0.5mg',
      genericName: 'Alprazolam',
      brandName: 'Alprax 0.5',
      manufacturer: 'Torrent Pharmaceuticals',
      composition: 'Alprazolam IP 0.5mg',
      dosageForm: DosageForm.TABLET,
      packSize: 15,
      unitOfMeasure: 'STRIP',
      hsnCode: '30049080',
      gstRate: 12.0,
      prescriptionCategory: PrescriptionCategory.SCHEDULE_X,
      barcode: '890111100105',
      sku: 'MED-ALPX-05',
      reorderLevel: 10,
      purchaseCost: 35.0,
      sellingPrice: 48.0,
      mrp: 55.0,
      batches: [
        {
          batchNumber: 'ALP-24H',
          expiryDate: new Date('2027-04-30'),
          quantityAvailable: 40,
          mrp: 55.0,
          purchasePrice: 35.0,
          sellingPrice: 48.0,
          rackLocation: 'LOCKER-SCH-X',
        },
      ],
    },
  ];

  for (const m of medicinesData) {
    const { batches, ...medDetails } = m;
    let medicine = await prisma.medicine.findFirst({
      where: { storeId: store.id, barcode: medDetails.barcode },
    });

    if (!medicine) {
      medicine = await prisma.medicine.create({
        data: {
          ...medDetails,
          storeId: store.id,
        },
      });
    }

    if (medDetails.barcode) {
      await prisma.medicineBarcode.upsert({
        where: {
          storeId_barcode: {
            storeId: store.id,
            barcode: medDetails.barcode,
          },
        },
        update: { isPrimary: true },
        create: {
          tenantId: tenant.id,
          storeId: store.id,
          branchId: branchStore.id,
          medicineId: medicine.id,
          barcode: medDetails.barcode,
          isPrimary: true,
        },
      });
    }

    for (const b of batches) {
      await prisma.medicineBatch.upsert({
        where: {
          storeId_medicineId_batchNumber: {
            storeId: store.id,
            medicineId: medicine.id,
            batchNumber: b.batchNumber,
          },
        },
        update: {},
        create: {
          ...b,
          storeId: store.id,
          medicineId: medicine.id,
          status: BatchStatus.ACTIVE,
        },
      });
    }
  }

  console.log('Catalogue medicines and batches seeded with FEFO dates.');
  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
