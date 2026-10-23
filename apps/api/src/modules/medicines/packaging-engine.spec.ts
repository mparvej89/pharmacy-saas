import { DosageForm } from '@prisma/client';
import {
  calculatePackagingConfiguration,
  DOSAGE_PACKAGING_TEMPLATES,
} from './packaging-engine';

describe('Packaging & Stock Conversion Unit Engine', () => {
  describe('Dosage Templates Verification', () => {
    it('1. Selecting Tablet suggests Tablet as stock unit and Strip as purchase unit', () => {
      const template = DOSAGE_PACKAGING_TEMPLATES[DosageForm.TABLET];
      expect(template.defaultBaseUnit).toBe('TABLET');
      expect(template.defaultPurchaseUnit).toBe('STRIP');
      expect(template.defaultSaleUnits).toEqual(['STRIP', 'TABLET']);
      expect(template.rejectFractionalQuantities).toBe(true);
    });

    it('Selecting Capsule suggests Capsule as stock unit and Strip as purchase unit', () => {
      const template = DOSAGE_PACKAGING_TEMPLATES[DosageForm.CAPSULE];
      expect(template.defaultBaseUnit).toBe('CAPSULE');
      expect(template.defaultPurchaseUnit).toBe('STRIP');
      expect(template.rejectFractionalQuantities).toBe(true);
    });

    it('8. Syrup bottle volume does not automatically enable mL sales', () => {
      const template = DOSAGE_PACKAGING_TEMPLATES[DosageForm.SYRUP];
      expect(template.defaultBaseUnit).toBe('BOTTLE');
      expect(template.defaultPurchaseUnit).toBe('BOTTLE');
      expect(template.defaultSaleUnits).toEqual(['BOTTLE']);
      expect(template.allowsLooseDispensing).toBe(false);
      expect(template.supportsVolumeWeight).toBe(true);
    });

    it('Drops defaults to sealed bottle sales only', () => {
      const template = DOSAGE_PACKAGING_TEMPLATES[DosageForm.DROPS];
      expect(template.defaultBaseUnit).toBe('BOTTLE');
      expect(template.defaultSaleUnits).toEqual(['BOTTLE']);
      expect(template.allowsLooseDispensing).toBe(false);
    });

    it('Powder defaults to Sachet stock unit and Box purchase unit', () => {
      const template = DOSAGE_PACKAGING_TEMPLATES[DosageForm.POWDER];
      expect(template.defaultBaseUnit).toBe('SACHET');
      expect(template.defaultPurchaseUnit).toBe('BOX');
      expect(template.defaultSaleUnits).toEqual(['BOX', 'SACHET']);
    });
  });

  describe('calculatePackagingConfiguration', () => {
    it('2. Entering 10 tablets per strip generates correct conversion (1 Strip = 10 Tablets, 1 Tablet = 1 Tablet)', () => {
      const config = calculatePackagingConfiguration({
        dosageForm: DosageForm.TABLET,
        unitsPerPack: 10,
        sellingPricePerPack: 50,
      });

      expect(config.baseUnit).toBe('TABLET');
      expect(config.purchaseUnit).toBe('STRIP');
      expect(config.conversionFactor).toBe(10);
      expect(config.unitConversions).toEqual([
        { unit: 'TABLET', factor: 1, isBase: true, isDerivedPriceEligible: true },
        { unit: 'STRIP', factor: 10, isBase: false, isDerivedPriceEligible: false },
      ]);
      expect(config.availableSaleUnits).toEqual(['STRIP', 'TABLET']);
      // Derived price: 50 / 10 = 5.00
      expect(config.unitSellingPrice).toBe(5);
    });

    it('3. Entering 10 strips per box generates correct box conversion (1 Box = 100 Tablets)', () => {
      const config = calculatePackagingConfiguration({
        dosageForm: DosageForm.TABLET,
        unitsPerPack: 10,
        stripsPerBox: 10,
        boxPackaging: true,
        sellingPricePerPack: 50,
      });

      expect(config.unitConversions).toEqual([
        { unit: 'TABLET', factor: 1, isBase: true, isDerivedPriceEligible: true },
        { unit: 'STRIP', factor: 10, isBase: false, isDerivedPriceEligible: false },
        { unit: 'BOX', factor: 100, isBase: false, isDerivedPriceEligible: false },
      ]);
      expect(config.availableSaleUnits).toContain('BOX');
      expect(config.boxSellingPrice).toBe(500); // 50 * 10
    });

    it('5. Missing or invalid pack sizes are caught in validationErrors and marked incomplete', () => {
      const result = calculatePackagingConfiguration({
        dosageForm: DosageForm.TABLET,
        unitsPerPack: 0,
      });
      expect(result.isComplete).toBe(false);
      expect(result.validationErrors.length).toBeGreaterThan(0);
      expect(result.validationErrors[0]).toContain('Units per pack must be a positive number');
    });

    it('7 & 9. Partial dispensing requires explicit configuration for liquids', () => {
      // By default without partial dispensing:
      const sealedSyrup = calculatePackagingConfiguration({
        dosageForm: DosageForm.SYRUP,
        unitsPerPack: 1,
        packageVolume: 100,
        allowPartialDispensing: false,
      });
      expect(sealedSyrup.availableSaleUnits).toEqual(['BOTTLE']);

      // When explicitly enabled:
      const partialSyrup = calculatePackagingConfiguration({
        dosageForm: DosageForm.SYRUP,
        unitsPerPack: 1,
        packageVolume: 100,
        allowPartialDispensing: true,
      });
      expect(partialSyrup.availableSaleUnits).toContain('BOTTLE');
    });

    it('Manual selling price override is preserved and not silently overwritten', () => {
      const config = calculatePackagingConfiguration({
        dosageForm: DosageForm.TABLET,
        unitsPerPack: 10,
        sellingPricePerPack: 50, // Derived would be 5
        unitSellingPriceManual: 6, // Manually configured higher unit price
      });

      expect(config.unitSellingPrice).toBe(6);
    });

    it('12. Historical / custom base units and purchase units are preserved', () => {
      const config = calculatePackagingConfiguration({
        dosageForm: DosageForm.OTHER,
        baseUnit: 'DOSE',
        purchaseUnit: 'KIT',
        unitsPerPack: 25,
      });

      expect(config.baseUnit).toBe('DOSE');
      expect(config.purchaseUnit).toBe('KIT');
      expect(config.conversionFactor).toBe(25);
    });
  });
});
