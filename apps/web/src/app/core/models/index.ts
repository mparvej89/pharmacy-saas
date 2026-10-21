export interface StoreInfo {
  id: string;
  name: string;
  code: string;
  gstin: string;
  drugLicenseNumber: string;
  stateCode: string;
  role: string;
}

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  isSuperAdmin?: boolean;
  activeStore: StoreInfo | null;
  stores: Array<{ id: string; name: string; code: string; role: string }>;
}

export interface MedicineBatch {
  id: string;
  batchNumber: string;
  expiryDate: string;
  quantityAvailable: number;
  mrp: number;
  purchasePrice: number;
  sellingPrice: number;
  rackLocation?: string;
  status: string;
}

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  brandName?: string;
  manufacturer?: string;
  composition?: string;
  dosageForm: string;
  packSize: number;
  unitOfMeasure: string;
  hsnCode: string;
  gstRate: number;
  prescriptionCategory: 'OTC' | 'SCHEDULE_H' | 'SCHEDULE_H1' | 'SCHEDULE_X';
  barcode?: string;
  sku?: string;
  reorderLevel: number;
  purchaseCost: number;
  sellingPrice: number;
  mrp: number;
  isActive: boolean;
  totalAvailableStock?: number;
  nearestExpiry?: string;
  batches?: MedicineBatch[];
}

export interface CartItem {
  medicine: Medicine;
  selectedBatch?: MedicineBatch;
  quantity: number;
  unitPrice: number;
  mrp: number;
  discountPercent: number;
  gstRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
}
