import { DosageForm } from '@prisma/client';

export interface PackagingTemplate {
  dosageForm: DosageForm;
  defaultBaseUnit: string;
  defaultPurchaseUnit: string;
  defaultSaleUnits: string[];
  defaultPackSizeLabel: string; // e.g. "Tablets per Strip"
  hasSecondaryPackaging: boolean; // e.g. Boxes of Strips
  secondaryPackLabel?: string; // e.g. "Strips per Box"
  secondaryUnitName?: string; // e.g. "BOX"
  allowsLooseDispensing: boolean;
  supportsVolumeWeight: boolean; // e.g. Syrups (ml), Ointments (g)
  volumeWeightUnit?: string; // e.g. "ml", "g"
  volumeWeightLabel?: string; // e.g. "Bottle Volume (ml)"
  rejectFractionalQuantities: boolean;
  description: string;
}

export const DOSAGE_PACKAGING_TEMPLATES: Record<DosageForm, PackagingTemplate> = {
  [DosageForm.TABLET]: {
    dosageForm: DosageForm.TABLET,
    defaultBaseUnit: 'TABLET',
    defaultPurchaseUnit: 'STRIP',
    defaultSaleUnits: ['STRIP', 'TABLET'],
    defaultPackSizeLabel: 'Tablets per Strip',
    hasSecondaryPackaging: true,
    secondaryPackLabel: 'Strips per Box',
    secondaryUnitName: 'BOX',
    allowsLooseDispensing: true,
    supportsVolumeWeight: false,
    rejectFractionalQuantities: true,
    description: 'Countable solid oral dose. Tracks base stock in individual tablets. Can sell by Strip or loose Tablet.',
  },
  [DosageForm.CAPSULE]: {
    dosageForm: DosageForm.CAPSULE,
    defaultBaseUnit: 'CAPSULE',
    defaultPurchaseUnit: 'STRIP',
    defaultSaleUnits: ['STRIP', 'CAPSULE'],
    defaultPackSizeLabel: 'Capsules per Strip',
    hasSecondaryPackaging: true,
    secondaryPackLabel: 'Strips per Box',
    secondaryUnitName: 'BOX',
    allowsLooseDispensing: true,
    supportsVolumeWeight: false,
    rejectFractionalQuantities: true,
    description: 'Countable solid oral dose. Tracks base stock in individual capsules. Can sell by Strip or loose Capsule.',
  },
  [DosageForm.SYRUP]: {
    dosageForm: DosageForm.SYRUP,
    defaultBaseUnit: 'BOTTLE',
    defaultPurchaseUnit: 'BOTTLE',
    defaultSaleUnits: ['BOTTLE'],
    defaultPackSizeLabel: 'Units per Pack',
    hasSecondaryPackaging: true,
    secondaryPackLabel: 'Bottles per Box/Shipper',
    secondaryUnitName: 'BOX',
    allowsLooseDispensing: false,
    supportsVolumeWeight: true,
    volumeWeightUnit: 'ml',
    volumeWeightLabel: 'Bottle Volume (e.g. 100 ml, 200 ml)',
    rejectFractionalQuantities: true,
    description: 'Liquid oral suspension. Stock is tracked in sealed Bottles. ml dispensing requires explicit partial dispensing configuration.',
  },
  [DosageForm.POWDER]: {
    dosageForm: DosageForm.POWDER,
    defaultBaseUnit: 'SACHET',
    defaultPurchaseUnit: 'BOX',
    defaultSaleUnits: ['BOX', 'SACHET'],
    defaultPackSizeLabel: 'Sachets per Box',
    hasSecondaryPackaging: false,
    allowsLooseDispensing: true,
    supportsVolumeWeight: true,
    volumeWeightUnit: 'g',
    volumeWeightLabel: 'Content per Sachet/Pack (g)',
    rejectFractionalQuantities: true,
    description: 'Powders & Granules. Individually sealed Sachets tracked as base stock. Sachet contents are not converted into loose grams.',
  },
  [DosageForm.OINTMENT]: {
    dosageForm: DosageForm.OINTMENT,
    defaultBaseUnit: 'TUBE',
    defaultPurchaseUnit: 'TUBE',
    defaultSaleUnits: ['TUBE'],
    defaultPackSizeLabel: 'Tubes per Pack',
    hasSecondaryPackaging: true,
    secondaryPackLabel: 'Tubes per Box/Pack',
    secondaryUnitName: 'BOX',
    allowsLooseDispensing: false,
    supportsVolumeWeight: true,
    volumeWeightUnit: 'g',
    volumeWeightLabel: 'Tube Weight (e.g. 15 g, 30 g)',
    rejectFractionalQuantities: true,
    description: 'Semisolid topical. Stock tracked per sealed Tube or Jar. Weight (g) is descriptive metadata unless bulk compounding is enabled.',
  },
  [DosageForm.DROPS]: {
    dosageForm: DosageForm.DROPS,
    defaultBaseUnit: 'BOTTLE',
    defaultPurchaseUnit: 'BOTTLE',
    defaultSaleUnits: ['BOTTLE'],
    defaultPackSizeLabel: 'Units per Pack',
    hasSecondaryPackaging: true,
    secondaryPackLabel: 'Bottles per Box',
    secondaryUnitName: 'BOX',
    allowsLooseDispensing: false,
    supportsVolumeWeight: true,
    volumeWeightUnit: 'ml',
    volumeWeightLabel: 'Volume (e.g. 5 ml, 10 ml)',
    rejectFractionalQuantities: true,
    description: 'Ophthalmic / Otic sterile drops. Always sold in sealed original bottles. Opening sealed drops is prohibited.',
  },
  [DosageForm.INJECTION]: {
    dosageForm: DosageForm.INJECTION,
    defaultBaseUnit: 'VIAL',
    defaultPurchaseUnit: 'VIAL',
    defaultSaleUnits: ['VIAL'],
    defaultPackSizeLabel: 'Vials / Ampoules per Pack',
    hasSecondaryPackaging: true,
    secondaryPackLabel: 'Vials/Ampoules per Box',
    secondaryUnitName: 'BOX',
    allowsLooseDispensing: true,
    supportsVolumeWeight: true,
    volumeWeightUnit: 'ml',
    volumeWeightLabel: 'Vial Volume (e.g. 2 ml, 10 ml)',
    rejectFractionalQuantities: true,
    description: 'Parenteral sterile injection. Stock tracked in individual Vials or Ampoules.',
  },
  [DosageForm.INHALER]: {
    dosageForm: DosageForm.INHALER,
    defaultBaseUnit: 'PIECE',
    defaultPurchaseUnit: 'PIECE',
    defaultSaleUnits: ['PIECE'],
    defaultPackSizeLabel: 'Units per Pack',
    hasSecondaryPackaging: true,
    secondaryPackLabel: 'Inhalers per Box',
    secondaryUnitName: 'BOX',
    allowsLooseDispensing: false,
    supportsVolumeWeight: false,
    rejectFractionalQuantities: true,
    description: 'Respiratory inhalers and sprays. Sold and tracked as individual whole devices. Doses per inhaler are not sold individually.',
  },
  [DosageForm.OTHER]: {
    dosageForm: DosageForm.OTHER,
    defaultBaseUnit: 'UNIT',
    defaultPurchaseUnit: 'PACK',
    defaultSaleUnits: ['PACK', 'UNIT'],
    defaultPackSizeLabel: 'Units per Pack',
    hasSecondaryPackaging: true,
    secondaryPackLabel: 'Packs per Master Box',
    secondaryUnitName: 'BOX',
    allowsLooseDispensing: true,
    supportsVolumeWeight: false,
    rejectFractionalQuantities: true,
    description: 'Custom dosage form. Allows flexible manual configuration of packaging hierarchy.',
  },
};

export interface UnitConversionRule {
  unit: string;
  factor: number; // multiplier to convert 1 of this unit to baseUnit
  isBase: boolean;
  isDerivedPriceEligible: boolean;
  derivedPrice?: number;
}

export interface PackagingCalculationResult {
  dosageForm: DosageForm;
  baseUnit: string;
  purchaseUnit: string;
  conversionFactor: number;
  availableSaleUnits: string[];
  unitConversions: UnitConversionRule[];
  unitSellingPrice?: number;
  boxSellingPrice?: number;
  isComplete: boolean;
  validationErrors: string[];
}

/**
 * Intelligent Packaging & Unit Calculation Engine
 * Calculates canonical packaging conversion rules, sale units, and prices safely.
 */
export function calculatePackagingConfiguration(params: {
  dosageForm: DosageForm;
  baseUnit?: string;
  purchaseUnit?: string;
  unitsPerPack?: number; // e.g. 10 tablets per strip, or 1 bottle
  boxPackaging?: boolean;
  stripsPerBox?: number; // e.g. 10 strips per box
  sellingPricePerPack?: number; // e.g. ₹13.00 per strip
  unitSellingPriceManual?: number; // e.g. ₹1.30 per tablet (if manually overridden)
  packageVolume?: number;
  allowPartialDispensing?: boolean;
}): PackagingCalculationResult {
  const template = DOSAGE_PACKAGING_TEMPLATES[params.dosageForm] || DOSAGE_PACKAGING_TEMPLATES[DosageForm.OTHER];
  const validationErrors: string[] = [];

  const baseUnit = (params.baseUnit || template.defaultBaseUnit).trim().toUpperCase();
  const purchaseUnit = (params.purchaseUnit || template.defaultPurchaseUnit).trim().toUpperCase();

  const unitsPerPack = params.unitsPerPack !== undefined && params.unitsPerPack !== null
    ? Number(params.unitsPerPack)
    : (params.dosageForm === DosageForm.TABLET || params.dosageForm === DosageForm.CAPSULE ? 10 : 1);

  if (unitsPerPack <= 0) {
    validationErrors.push('Units per pack must be a positive number greater than 0.');
  }

  if (template.rejectFractionalQuantities && !Number.isInteger(unitsPerPack)) {
    validationErrors.push(`Fractional units are not permitted for countable form "${params.dosageForm}". Must be an integer.`);
  }

  const conversions: UnitConversionRule[] = [];
  const saleUnits: string[] = [];

  // 1. Base unit is always 1:1
  conversions.push({
    unit: baseUnit,
    factor: 1,
    isBase: true,
    isDerivedPriceEligible: true,
  });

  // 2. Primary Pack unit (e.g. Strip, Bottle, Box)
  if (purchaseUnit !== baseUnit) {
    conversions.push({
      unit: purchaseUnit,
      factor: unitsPerPack,
      isBase: false,
      isDerivedPriceEligible: false,
    });
    saleUnits.push(purchaseUnit);
  }

  // Base unit is a valid sale unit if template allows loose dispensing or partial dispensing is enabled
  if (template.allowsLooseDispensing || params.allowPartialDispensing) {
    if (!saleUnits.includes(baseUnit)) {
      saleUnits.push(baseUnit);
    }
  } else {
    // Sealed packages like Syrups / Drops / Inhalers only sell in whole package unless partial is explicitly enabled
    if (saleUnits.length === 0) {
      saleUnits.push(baseUnit);
    }
  }

  // 3. Secondary Box Packaging (e.g. 1 Box = 10 Strips = 100 Tablets)
  let boxTotalBaseFactor = unitsPerPack;
  if (params.boxPackaging && params.stripsPerBox && params.stripsPerBox > 0) {
    const boxUnit = template.secondaryUnitName || 'BOX';
    boxTotalBaseFactor = params.stripsPerBox * unitsPerPack;
    conversions.push({
      unit: boxUnit,
      factor: boxTotalBaseFactor,
      isBase: false,
      isDerivedPriceEligible: false,
    });
    if (!saleUnits.includes(boxUnit)) {
      saleUnits.push(boxUnit);
    }
  }

  // Price Derivations
  let derivedUnitSellingPrice: number | undefined = undefined;
  let derivedBoxPrice: number | undefined = undefined;

  if (params.sellingPricePerPack && params.sellingPricePerPack > 0) {
    if (params.unitSellingPriceManual && params.unitSellingPriceManual > 0) {
      derivedUnitSellingPrice = params.unitSellingPriceManual;
    } else if (unitsPerPack > 1) {
      derivedUnitSellingPrice = Number((params.sellingPricePerPack / unitsPerPack).toFixed(2));
    } else {
      derivedUnitSellingPrice = params.sellingPricePerPack;
    }

    if (params.boxPackaging && params.stripsPerBox && params.stripsPerBox > 0) {
      derivedBoxPrice = Number((params.sellingPricePerPack * params.stripsPerBox).toFixed(2));
    }
  }

  return {
    dosageForm: params.dosageForm,
    baseUnit,
    purchaseUnit,
    conversionFactor: unitsPerPack,
    availableSaleUnits: saleUnits,
    unitConversions: conversions,
    unitSellingPrice: derivedUnitSellingPrice,
    boxSellingPrice: derivedBoxPrice,
    isComplete: validationErrors.length === 0 && unitsPerPack > 0,
    validationErrors,
  };
}
