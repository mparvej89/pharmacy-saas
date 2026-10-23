import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonBadge,
  IonCard,
  IonCardContent,
  IonModal,
  IonItem,
  IonInput,
  IonToast,
  IonSpinner,
  IonGrid,
  IonRow,
  IonCol,
  IonMenuButton,
  IonButtons,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  searchOutline,
  medkitOutline,
  warningOutline,
  closeOutline,
  checkmarkOutline,
  shieldCheckmarkOutline,
  createOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  eyeOutline,
  trashOutline,
} from 'ionicons/icons';
import { ApiService } from '../../core/services/api.service';
import { Medicine } from '../../core/models';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-medicines',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PaginationComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonBadge,
    IonCard,
    IonCardContent,
    IonModal,
    IonItem,
    IonInput,
    IonToast,
    IonSpinner,
    IonGrid,
    IonRow,
    IonCol,
    IonMenuButton,
    IonButtons,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button color="light"></ion-menu-button>
        </ion-buttons>
        <ion-title>Medicine Catalogue</ion-title>
        <ion-button slot="end" fill="solid" color="light" (click)="openAddModal()">
          <ion-icon name="add-outline" slot="start"></ion-icon>
          Add Medicine
        </ion-button>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-content">
      <!-- Filter Bar -->
      <div class="filter-bar ion-margin-bottom">
        <ion-searchbar
          placeholder="Search by Brand Name, Generic Name, SKU or Barcode..."
          [debounce]="300"
          (ionInput)="onSearch($event)"
          class="custom-search"
        ></ion-searchbar>

        <ion-select
          placeholder="Prescription Schedule"
          [(ngModel)]="selectedCategory"
          (ionChange)="loadMedicines()"
          interface="popover"
          [interfaceOptions]="{ cssClass: 'custom-popover' }"
          class="category-select"
        >
          <ion-select-option value="">All Schedules</ion-select-option>
          <ion-select-option value="OTC">OTC (Over the Counter)</ion-select-option>
          <ion-select-option value="SCHEDULE_H">Schedule H</ion-select-option>
          <ion-select-option value="SCHEDULE_H1">Schedule H1</ion-select-option>
          <ion-select-option value="SCHEDULE_X">Schedule X</ion-select-option>
        </ion-select>
      </div>

      <!-- Medicines Table Card -->
      <ion-card class="table-card">
        <ion-card-content class="ion-no-padding">
          <div class="table-responsive">
            <table class="catalogue-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Generic Name</th>
                  <th>Schedule</th>
                  <th>HSN Code</th>
                  <th>GST%</th>
                  <th>MRP</th>
                  <th>Selling Price</th>
                  <th>Stock Available</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let med of medicines()">
                  <td>
                    <div class="med-name">{{ med.name }}</div>
                    <div class="med-brand" *ngIf="med.brandName">{{ med.brandName }}</div>
                  </td>
                  <td>{{ med.genericName }}</td>
                  <td>
                    <ion-badge [class]="'badge-' + med.prescriptionCategory.toLowerCase().replace('_', '-')">
                      {{ med.prescriptionCategory }}
                    </ion-badge>
                  </td>
                  <td class="font-mono">{{ med.hsnCode }}</td>
                  <td>{{ med.gstRate }}%</td>
                  <td>₹{{ med.mrp }}</td>
                  <td class="font-bold">₹{{ med.sellingPrice }}</td>
                  <td>
                    <span class="stock-badge" [class.low]="(med.totalAvailableStock || 0) <= med.reorderLevel">
                      {{ med.totalAvailableStock || 0 }} {{ med.baseUnit || med.unitOfMeasure }}
                    </span>
                    <div *ngIf="formatPackBreakdown(med.totalAvailableStock, med.conversionFactor, med.purchaseUnit, med.baseUnit)" style="font-size: 0.72rem; color: #64748b; margin-top: 2px;">
                      {{ formatPackBreakdown(med.totalAvailableStock, med.conversionFactor, med.purchaseUnit, med.baseUnit) }}
                    </div>
                  </td>
                  <td>
                    <ion-badge [color]="med.isActive ? 'success' : 'medium'">
                      {{ med.isActive ? 'Active' : 'Inactive' }}
                    </ion-badge>
                  </td>
                  <td>
                    <div class="action-buttons-group">
                      <button
                        type="button"
                        class="action-btn edit"
                        (click)="openEditModal(med)"
                        title="Edit Medicine Details"
                      >
                        <ion-icon name="create-outline"></ion-icon>
                      </button>
                      <button
                        type="button"
                        class="action-btn"
                        [class.toggle-on]="med.isActive"
                        [class.toggle-off]="!med.isActive"
                        (click)="toggleStatus(med)"
                        [title]="med.isActive ? 'Disable / Turn Off Medicine' : 'Enable Medicine'"
                      >
                        <ion-icon [name]="med.isActive ? 'close-circle-outline' : 'checkmark-circle-outline'"></ion-icon>
                      </button>
                      <button
                        type="button"
                        class="action-btn view"
                        (click)="viewBatches(med)"
                        title="View Active Batches & Stock"
                      >
                        <ion-icon name="eye-outline"></ion-icon>
                      </button>
                      <button
                        type="button"
                        class="action-btn delete"
                        (click)="deleteMedicine(med)"
                        title="Delete Medicine"
                      >
                        <ion-icon name="trash-outline"></ion-icon>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="!medicines().length && !isLoading()">
                  <td colspan="10" class="ion-text-center ion-padding">
                    No medicines found. Use "Add Medicine" to create entries.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <app-pagination
            [totalItems]="totalItems()"
            [currentPage]="currentPage()"
            [pageSize]="pageSize()"
            [pageSizeOptions]="[10, 25, 50, 100]"
            itemLabel="medicines"
            (pageChange)="onPageChange($event)"
            (pageSizeChange)="onPageSizeChange($event)"
          ></app-pagination>
        </ion-card-content>
      </ion-card>

      <!-- Add / Edit Medicine Modal -->
      <ion-modal [isOpen]="isModalOpen()" class="large-form-modal">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>{{ editingMedicineId() ? 'Edit Medicine Details' : 'Add New Medicine to Catalogue' }}</ion-title>
              <ion-button slot="end" fill="clear" color="light" (click)="closeModal()">
                <ion-icon name="close-outline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-toolbar>
          </ion-header>

          <ion-content class="ion-padding modal-content">
            <form [formGroup]="medicineForm" (ngSubmit)="saveMedicine()">
              <!-- General Info Section -->
              <div class="form-section-title">General & Composition</div>
              <ion-grid class="ion-no-padding">
                <ion-row>
                  <ion-col size="12" size-md="6">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        id="med-name"
                        name="name"
                        label="Medicine Name *"
                        labelPlacement="floating"
                        placeholder="e.g. Paracetamol 650mg"
                        formControlName="name"
                        (ionBlur)="checkDuplicate()"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="12" size-md="6">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        id="med-generic"
                        name="genericName"
                        label="Generic Name *"
                        labelPlacement="floating"
                        placeholder="e.g. Paracetamol"
                        formControlName="genericName"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                </ion-row>

                <div *ngIf="duplicateWarning()" class="duplicate-banner ion-margin-bottom">
                  <ion-icon name="warning-outline" color="warning"></ion-icon>
                  <span>{{ duplicateWarning() }}</span>
                </div>

                <ion-row class="ion-margin-top">
                  <ion-col size="12" size-md="6">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        id="med-brand"
                        name="brandName"
                        label="Brand / Trade Name"
                        labelPlacement="floating"
                        placeholder="e.g. Dolo 650"
                        formControlName="brandName"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="12" size-md="6">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        id="med-manufacturer"
                        name="manufacturer"
                        label="Manufacturer"
                        labelPlacement="floating"
                        placeholder="e.g. Micro Labs Ltd"
                        formControlName="manufacturer"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                </ion-row>

                <!-- Packaging & Regulatory Section -->
                <div class="form-section-title ion-margin-top">
                  Packaging & Automatic Unit Configuration
                  <span class="step-badge">Smart Auto-Config</span>
                </div>

                <ion-row>
                  <ion-col size="12" size-md="4">
                    <ion-item fill="outline" class="form-item">
                      <ion-select
                        id="med-dosage-form"
                        name="dosageForm"
                        label="Dosage Form *"
                        labelPlacement="floating"
                        interface="popover"
                        [interfaceOptions]="{ cssClass: 'custom-popover' }"
                        formControlName="dosageForm"
                        (ionChange)="onDosageFormChange()"
                      >
                        <ion-select-option value="TABLET">Tablet (Oral Solid)</ion-select-option>
                        <ion-select-option value="CAPSULE">Capsule (Oral Solid)</ion-select-option>
                        <ion-select-option value="SYRUP">Syrup / Oral Liquid</ion-select-option>
                        <ion-select-option value="POWDER">Powder / Sachet</ion-select-option>
                        <ion-select-option value="OINTMENT">Cream / Ointment</ion-select-option>
                        <ion-select-option value="DROPS">Eye / Ear Drops</ion-select-option>
                        <ion-select-option value="INJECTION">Injection (Vial/Ampoule)</ion-select-option>
                        <ion-select-option value="INHALER">Inhaler / Spray</ion-select-option>
                        <ion-select-option value="OTHER">Other Custom Form</ion-select-option>
                      </ion-select>
                    </ion-item>
                  </ion-col>
                  <ion-col size="6" size-md="4">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        id="med-base-unit"
                        name="baseUnit"
                        label="Stock Unit (Base) *"
                        labelPlacement="floating"
                        placeholder="Auto-suggested"
                        formControlName="baseUnit"
                        (ionChange)="updateConversionPreview()"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="6" size-md="4">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        id="med-purchase-unit"
                        name="purchaseUnit"
                        label="Purchase/Pack Unit *"
                        labelPlacement="floating"
                        placeholder="Auto-suggested"
                        formControlName="purchaseUnit"
                        (ionChange)="updateConversionPreview()"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                </ion-row>

                <!-- Packaging Details specific to dosage form -->
                <ion-row class="ion-margin-top">
                  <ion-col size="12" size-md="4">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        id="med-conversion-factor"
                        name="conversionFactor"
                        [label]="activePackLabel() + ' *'"
                        labelPlacement="floating"
                        type="number"
                        placeholder="e.g. 10"
                        formControlName="conversionFactor"
                        (ionChange)="onPackOrPriceChange()"
                      ></ion-input>
                    </ion-item>
                  </ion-col>

                  <!-- Secondary Box Packaging (for Tablets, Capsules, etc.) -->
                  <ion-col size="12" size-md="4" *ngIf="isBoxPackagingSupported()">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        id="med-strips-per-box"
                        name="stripsPerBox"
                        label="Packs/Strips per Box (Optional)"
                        labelPlacement="floating"
                        type="number"
                        placeholder="e.g. 10"
                        formControlName="stripsPerBox"
                        (ionChange)="onPackOrPriceChange()"
                      ></ion-input>
                    </ion-item>
                  </ion-col>

                  <!-- Volume / Weight (for Syrups, Drops, Ointments) -->
                  <ion-col size="12" size-md="4" *ngIf="isVolumeWeightSupported()">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        id="med-package-volume"
                        name="packageVolume"
                        [label]="volumeWeightLabel()"
                        labelPlacement="floating"
                        type="number"
                        placeholder="e.g. 100"
                        formControlName="packageVolume"
                      ></ion-input>
                    </ion-item>
                  </ion-col>

                  <ion-col size="12" size-md="4" *ngIf="isSyrupOrLiquid()">
                    <div class="partial-dispense-toggle">
                      <label class="toggle-label">
                        <input type="checkbox" formControlName="allowPartialDispensing" (change)="updateConversionPreview()" />
                        <span>Allow mL-based loose dispensing</span>
                      </label>
                      <small class="toggle-hint">Default is sealed whole bottles</small>
                    </div>
                  </ion-col>
                </ion-row>

                <!-- LIVE CONVERSION PREVIEW CARD -->
                <div class="conversion-preview-box ion-margin-top" *ngIf="conversionPreview()">
                  <div class="preview-title">
                    <ion-icon name="shield-checkmark-outline"></ion-icon>
                    <span>Automatic Stock Conversion Preview</span>
                  </div>
                  <table class="preview-table">
                    <thead>
                      <tr>
                        <th>Packaging Level</th>
                        <th>Equivalent Stock Quantity</th>
                        <th>Saleable Unit</th>
                        <th>Derived Selling Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let rule of conversionPreview().unitConversions">
                        <td><strong>1 {{ rule.unit }}</strong></td>
                        <td>
                          <span class="factor-badge">
                            = {{ rule.factor }} {{ conversionPreview().baseUnit }}
                          </span>
                        </td>
                        <td>
                          <span class="status-pill active" *ngIf="conversionPreview().availableSaleUnits.includes(rule.unit)">
                            ✓ Permitted Sale Unit
                          </span>
                          <span class="status-pill inactive" *ngIf="!conversionPreview().availableSaleUnits.includes(rule.unit)">
                            Sealed Pack Only
                          </span>
                        </td>
                        <td class="font-bold">
                          <span *ngIf="rule.isBase && conversionPreview().unitSellingPrice">
                            ₹{{ conversionPreview().unitSellingPrice }} / {{ rule.unit }}
                          </span>
                          <span *ngIf="rule.unit === conversionPreview().purchaseUnit">
                            ₹{{ medicineForm.get('sellingPrice')?.value || 0 }} / {{ rule.unit }}
                          </span>
                          <span *ngIf="rule.unit === 'BOX' && conversionPreview().boxSellingPrice">
                            ₹{{ conversionPreview().boxSellingPrice }} / Box
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div class="preview-footer-note">
                    * Inventory stock will always be tracked canonical in <strong>{{ conversionPreview().baseUnit }}</strong>. No fractional conversions.
                  </div>
                </div>

                <ion-row class="ion-margin-top">
                  <ion-col size="12" size-md="4">
                    <ion-item fill="outline" class="form-item">
                      <ion-select
                        id="med-category"
                        name="prescriptionCategory"
                        label="Prescription Category"
                        labelPlacement="floating"
                        interface="popover"
                        [interfaceOptions]="{ cssClass: 'custom-popover' }"
                        formControlName="prescriptionCategory"
                      >
                        <ion-select-option value="OTC">OTC (Over the Counter)</ion-select-option>
                        <ion-select-option value="SCHEDULE_H">Schedule H</ion-select-option>
                        <ion-select-option value="SCHEDULE_H1">Schedule H1</ion-select-option>
                        <ion-select-option value="SCHEDULE_X">Schedule X (Strict Narcotic)</ion-select-option>
                      </ion-select>
                    </ion-item>
                  </ion-col>
                  <ion-col size="12" size-md="4">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        id="med-hsn"
                        name="hsnCode"
                        label="HSN Code"
                        labelPlacement="floating"
                        formControlName="hsnCode"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="12" size-md="4">
                    <ion-item fill="outline" class="form-item">
                      <ion-select
                        id="med-gst"
                        name="gstRate"
                        label="Applicable GST Rate"
                        labelPlacement="floating"
                        interface="popover"
                        [interfaceOptions]="{ cssClass: 'custom-popover' }"
                        formControlName="gstRate"
                      >
                        <ion-select-option [value]="0">0% (Nil GST)</ion-select-option>
                        <ion-select-option [value]="5">5% GST</ion-select-option>
                        <ion-select-option [value]="12">12% GST (Standard)</ion-select-option>
                        <ion-select-option [value]="18">18% GST</ion-select-option>
                        <ion-select-option [value]="28">28% GST</ion-select-option>
                      </ion-select>
                    </ion-item>
                  </ion-col>
                </ion-row>

                <!-- Pricing & Inventory Section -->
                <div class="form-section-title ion-margin-top">Multi-Unit Pricing & Inventory</div>
                <ion-row>
                  <ion-col size="6" size-md="3">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        id="med-purchase-cost"
                        name="purchaseCost"
                        label="Purchase Cost/Pack (₹)"
                        labelPlacement="floating"
                        type="number"
                        formControlName="purchaseCost"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="6" size-md="3">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        id="med-selling-price"
                        name="sellingPrice"
                        label="Selling Rate/Pack (₹)"
                        labelPlacement="floating"
                        type="number"
                        formControlName="sellingPrice"
                        (ionChange)="onPackOrPriceChange()"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="6" size-md="3">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        id="med-unit-price"
                        name="unitSellingPrice"
                        [label]="'Rate/' + (medicineForm.get('baseUnit')?.value || 'Unit') + ' (₹)'"
                        labelPlacement="floating"
                        type="number"
                        placeholder="Auto-calculated"
                        formControlName="unitSellingPrice"
                        (ionChange)="updateConversionPreview()"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="6" size-md="3">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        id="med-mrp"
                        name="mrp"
                        label="MRP/Pack (₹)"
                        labelPlacement="floating"
                        type="number"
                        formControlName="mrp"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                </ion-row>

                <ion-row class="ion-margin-top">
                  <ion-col size="12" size-md="6">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        id="med-barcode"
                        name="barcode"
                        label="Barcode / EAN"
                        labelPlacement="floating"
                        placeholder="Scan or enter barcode"
                        formControlName="barcode"
                        (ionBlur)="checkDuplicate()"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="12" size-md="6">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        id="med-reorder-level"
                        name="reorderLevel"
                        label="Reorder Alert Level"
                        labelPlacement="floating"
                        type="number"
                        formControlName="reorderLevel"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                </ion-row>
              </ion-grid>

              <div class="modal-actions-bar ion-margin-top">
                <ion-button fill="outline" color="medium" (click)="closeModal()">
                  Cancel
                </ion-button>
                <ion-button
                  type="submit"
                  color="primary"
                  [disabled]="medicineForm.invalid || isSubmitting()"
                >
                  <ion-spinner *ngIf="isSubmitting()" name="crescent" slot="start"></ion-spinner>
                  <span *ngIf="!isSubmitting()">{{ editingMedicineId() ? 'Update Medicine' : 'Save Medicine to Catalogue' }}</span>
                </ion-button>
              </div>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>

      <!-- View Batches Modal (GET /medicines/:id with batches) -->
      <ion-modal [isOpen]="isBatchModalOpen()" class="batch-modal">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>Batches: {{ viewingMedicine()?.name }}</ion-title>
              <ion-button slot="end" fill="clear" color="light" (click)="closeBatchModal()">
                <ion-icon name="close-outline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-toolbar>
          </ion-header>

          <ion-content class="ion-padding modal-content">
            <div *ngIf="viewingMedicine() as med">
              <div class="batch-med-summary ion-margin-bottom">
                <div class="font-bold text-dark">{{ med.name }}</div>
                <div class="sub-text">Generic: {{ med.genericName }} | Pack: {{ med.packSize }} {{ med.unitOfMeasure }}</div>
              </div>

              <div class="table-responsive">
                <table class="batch-table">
                  <thead>
                    <tr>
                      <th>Batch #</th>
                      <th>Expiry</th>
                      <th>Available</th>
                      <th>Rack</th>
                      <th>MRP</th>
                      <th>Selling Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let b of med.batches">
                      <td class="font-mono font-bold">{{ b.batchNumber }}</td>
                      <td class="font-mono">{{ b.expiryDate | date:'mediumDate' }}</td>
                      <td class="font-bold text-primary">{{ b.quantityAvailable }}</td>
                      <td>{{ b.rackLocation || 'Unassigned' }}</td>
                      <td>₹{{ b.mrp }}</td>
                      <td>₹{{ b.sellingPrice }}</td>
                    </tr>
                    <tr *ngIf="!med.batches?.length">
                      <td colspan="6" class="ion-text-center ion-padding">
                        No active stock batches found for this medicine.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </ion-content>
        </ng-template>
      </ion-modal>

      <ion-toast
        [isOpen]="toastMessage() !== null"
        [message]="toastMessage() || ''"
        [duration]="3000"
        (didDismiss)="toastMessage.set(null)"
      ></ion-toast>
    </ion-content>
  `,
  styles: [
    `
      .page-content {
        --background: #f8fafc;
      }
      .filter-bar {
        display: flex;
        gap: 16px;
        align-items: center;
        background: #ffffff;
        padding: 8px 16px;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
      }
      .custom-search {
        padding: 0;
        --background: #f1f5f9;
        --border-radius: 8px;
        flex: 1;
      }
      .category-select {
        min-width: 200px;
        background: #f1f5f9;
        border-radius: 8px;
        padding: 8px 12px;
      }
      .table-card {
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        background: #ffffff;
        margin: 0;
        overflow: hidden;
      }
      .table-responsive {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      .catalogue-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.88rem;
      }
      .catalogue-table th {
        background: #f8fafc;
        padding: 12px 14px;
        color: #475569;
        font-weight: 600;
        border-bottom: 1px solid #e2e8f0;
        text-align: left;
      }
      .catalogue-table td {
        padding: 12px 14px;
        border-bottom: 1px solid #f1f5f9;
        color: #1e293b;
      }
      .med-name {
        font-weight: 600;
        color: #0f172a;
      }
      .med-brand {
        font-size: 0.78rem;
        color: #64748b;
      }
      .stock-badge {
        display: inline-block;
        padding: 3px 8px;
        background: #e2e8f0;
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.82rem;
      }
      .stock-badge.low {
        background: #fee2e2;
        color: #b91c1c;
      }
      .form-item {
        --background: #ffffff;
        border-radius: 8px;
        margin-bottom: 2px;
      }
      .form-section-title {
        font-size: 0.82rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #0284c7;
        margin-bottom: 8px;
        padding-bottom: 4px;
        border-bottom: 1px solid #e2e8f0;
      }
      .modal-actions-bar {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding-top: 16px;
        border-top: 1px solid #e2e8f0;
      }
      .action-buttons-group {
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
      }
      .action-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        color: #475569;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 16px;
      }
      .action-btn:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
        color: #0f172a;
      }
      .action-btn.edit:hover {
        background: #eff6ff;
        border-color: #bfdbfe;
        color: #2563eb;
      }
      .action-btn.toggle-on:hover {
        background: #fef2f2;
        border-color: #fecaca;
        color: #dc2626;
      }
      .action-btn.toggle-off:hover {
        background: #f0fdf4;
        border-color: #bbf7d0;
        color: #16a34a;
      }
      .action-btn.view:hover {
        background: #f5f3ff;
        border-color: #ddd6fe;
        color: #7c3aed;
      }
      .action-btn.delete:hover {
        background: #fef2f2;
        border-color: #fecaca;
        color: #dc2626;
      }
      .batch-modal {
        --width: 720px;
        --max-width: 95vw;
        --height: 480px;
        --border-radius: 12px;
      }
      .batch-med-summary {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 10px 14px;
        border-radius: 8px;
      }
      .batch-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.84rem;
      }
      .batch-table th {
        background: #f1f5f9;
        padding: 8px 10px;
        text-align: left;
        color: #475569;
        font-weight: 600;
        border-bottom: 1px solid #cbd5e1;
      }
      .batch-table td {
        padding: 8px 10px;
        border-bottom: 1px solid #f1f5f9;
      }
      .conversion-preview-box {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 8px;
        padding: 12px 16px;
      }
      .preview-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        color: #166534;
        font-size: 0.9rem;
        margin-bottom: 8px;
      }
      .preview-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.82rem;
        background: #ffffff;
        border-radius: 6px;
        overflow: hidden;
      }
      .preview-table th {
        background: #dcfce7;
        color: #166534;
        padding: 6px 10px;
        text-align: left;
        font-weight: 600;
        border-bottom: 1px solid #bbf7d0;
      }
      .preview-table td {
        padding: 6px 10px;
        border-bottom: 1px solid #f0fdf4;
        color: #1e293b;
      }
      .factor-badge {
        display: inline-block;
        padding: 2px 8px;
        background: #e0f2fe;
        color: #0369a1;
        border-radius: 4px;
        font-weight: 600;
      }
      .status-pill {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
      }
      .status-pill.active {
        background: #dcfce7;
        color: #15803d;
      }
      .status-pill.inactive {
        background: #f1f5f9;
        color: #64748b;
      }
      .preview-footer-note {
        font-size: 0.75rem;
        color: #15803d;
        margin-top: 6px;
      }
      .partial-dispense-toggle {
        display: flex;
        flex-direction: column;
        justify-content: center;
        height: 100%;
        padding-top: 8px;
      }
      .toggle-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.85rem;
        font-weight: 600;
        color: #334155;
        cursor: pointer;
      }
      .toggle-hint {
        font-size: 0.72rem;
        color: #64748b;
        margin-left: 24px;
      }
    `,
  ],
})
export class MedicinesComponent implements OnInit {
  medicines = signal<Medicine[]>([]);
  isLoading = signal(false);
  isModalOpen = signal(false);
  isSubmitting = signal(false);
  duplicateWarning = signal<string | null>(null);
  toastMessage = signal<string | null>(null);

  searchQuery = '';
  selectedCategory = '';

  formatPackBreakdown(qty?: number | null, conversionFactor?: number | null, purchaseUnit?: string | null, baseUnit?: string | null): string {
    const q = Number(qty) || 0;
    const factor = Number(conversionFactor) || 1;
    if (factor <= 1 || q <= 0) return '';
    const packs = Math.floor(q / factor);
    const loose = q % factor;
    const pUnit = purchaseUnit || 'Pack';
    const bUnit = baseUnit || 'units';
    if (packs > 0 && loose > 0) {
      return `(${packs} ${pUnit} + ${loose} ${bUnit})`;
    } else if (packs > 0) {
      return `(${packs} ${pUnit})`;
    }
    return '';
  }

  medicineForm: FormGroup;

  constructor(
    private apiService: ApiService,
    private fb: FormBuilder,
    private alertController: AlertController,
  ) {
    addIcons({
      addOutline,
      searchOutline,
      medkitOutline,
      warningOutline,
      closeOutline,
      checkmarkOutline,
      shieldCheckmarkOutline,
      createOutline,
      closeCircleOutline,
      checkmarkCircleOutline,
      eyeOutline,
      trashOutline,
    });

    this.medicineForm = this.fb.group({
      name: ['', Validators.required],
      genericName: ['', Validators.required],
      brandName: [''],
      manufacturer: [''],
      dosageForm: ['TABLET', Validators.required],
      packSize: [10, [Validators.required, Validators.min(1)]],
      unitOfMeasure: ['STRIP', Validators.required],
      baseUnit: ['TABLET', Validators.required],
      purchaseUnit: ['STRIP', Validators.required],
      conversionFactor: [10, [Validators.required, Validators.min(1)]],
      boxPackaging: [false],
      stripsPerBox: [null],
      packageVolume: [null],
      allowPartialDispensing: [false],
      unitSellingPrice: [null],
      prescriptionCategory: ['OTC', Validators.required],
      hsnCode: ['3004', Validators.required],
      gstRate: [12.0, Validators.required],
      purchaseCost: [0, [Validators.required, Validators.min(0)]],
      sellingPrice: [0, [Validators.required, Validators.min(0)]],
      mrp: [0, [Validators.required, Validators.min(0)]],
      barcode: [''],
      reorderLevel: [20, [Validators.required, Validators.min(0)]],
    });
  }

  // Packaging Engine defaults per Dosage Form
  private dosageFormDefaults: Record<string, {
    baseUnit: string;
    purchaseUnit: string;
    packLabel: string;
    hasBox: boolean;
    hasVolume: boolean;
    volumeLabel: string;
    isLiquid: boolean;
  }> = {
    TABLET: {
      baseUnit: 'TABLET',
      purchaseUnit: 'STRIP',
      packLabel: 'Tablets per Strip',
      hasBox: true,
      hasVolume: false,
      volumeLabel: '',
      isLiquid: false,
    },
    CAPSULE: {
      baseUnit: 'CAPSULE',
      purchaseUnit: 'STRIP',
      packLabel: 'Capsules per Strip',
      hasBox: true,
      hasVolume: false,
      volumeLabel: '',
      isLiquid: false,
    },
    SYRUP: {
      baseUnit: 'BOTTLE',
      purchaseUnit: 'BOTTLE',
      packLabel: 'Units per Pack',
      hasBox: true,
      hasVolume: true,
      volumeLabel: 'Bottle Volume (e.g. 100 ml, 200 ml)',
      isLiquid: true,
    },
    POWDER: {
      baseUnit: 'SACHET',
      purchaseUnit: 'BOX',
      packLabel: 'Sachets per Box',
      hasBox: false,
      hasVolume: true,
      volumeLabel: 'Content per Sachet (e.g. 5 g, 10 g)',
      isLiquid: false,
    },
    OINTMENT: {
      baseUnit: 'TUBE',
      purchaseUnit: 'TUBE',
      packLabel: 'Tubes per Pack',
      hasBox: true,
      hasVolume: true,
      volumeLabel: 'Tube Weight (e.g. 15 g, 30 g)',
      isLiquid: false,
    },
    DROPS: {
      baseUnit: 'BOTTLE',
      purchaseUnit: 'BOTTLE',
      packLabel: 'Units per Pack',
      hasBox: true,
      hasVolume: true,
      volumeLabel: 'Bottle Volume (e.g. 5 ml, 10 ml)',
      isLiquid: false,
    },
    INJECTION: {
      baseUnit: 'VIAL',
      purchaseUnit: 'VIAL',
      packLabel: 'Vials / Ampoules per Pack',
      hasBox: true,
      hasVolume: true,
      volumeLabel: 'Volume (e.g. 2 ml, 10 ml)',
      isLiquid: false,
    },
    INHALER: {
      baseUnit: 'PIECE',
      purchaseUnit: 'PIECE',
      packLabel: 'Units per Pack',
      hasBox: true,
      hasVolume: false,
      volumeLabel: '',
      isLiquid: false,
    },
    OTHER: {
      baseUnit: 'PIECE',
      purchaseUnit: 'BOX',
      packLabel: 'Units per Pack',
      hasBox: true,
      hasVolume: true,
      volumeLabel: 'Package Volume/Weight',
      isLiquid: false,
    },
  };

  conversionPreview = signal<any>(null);

  activePackLabel(): string {
    const form = this.medicineForm.get('dosageForm')?.value || 'TABLET';
    return this.dosageFormDefaults[form]?.packLabel || 'Units per Pack';
  }

  isBoxPackagingSupported(): boolean {
    const form = this.medicineForm.get('dosageForm')?.value || 'TABLET';
    return !!this.dosageFormDefaults[form]?.hasBox;
  }

  isVolumeWeightSupported(): boolean {
    const form = this.medicineForm.get('dosageForm')?.value || 'TABLET';
    return !!this.dosageFormDefaults[form]?.hasVolume;
  }

  isSyrupOrLiquid(): boolean {
    const form = this.medicineForm.get('dosageForm')?.value || 'TABLET';
    return !!this.dosageFormDefaults[form]?.isLiquid;
  }

  volumeWeightLabel(): string {
    const form = this.medicineForm.get('dosageForm')?.value || 'TABLET';
    return this.dosageFormDefaults[form]?.volumeLabel || 'Package Volume / Weight';
  }

  onDosageFormChange() {
    const form = this.medicineForm.get('dosageForm')?.value || 'TABLET';
    const config = this.dosageFormDefaults[form];
    if (config) {
      this.medicineForm.patchValue({
        baseUnit: config.baseUnit,
        purchaseUnit: config.purchaseUnit,
        unitOfMeasure: config.purchaseUnit,
      }, { emitEvent: false });
    }
    this.updateConversionPreview();
  }

  updateConversionPreview() {
    const val = this.medicineForm.value;
    const dosageForm = val.dosageForm || 'TABLET';
    const conversionFactor = Number(val.conversionFactor) || 1;
    const baseUnit = (val.baseUnit || 'UNIT').toUpperCase().trim();
    const purchaseUnit = (val.purchaseUnit || 'PACK').toUpperCase().trim();
    const stripsPerBox = Number(val.stripsPerBox) || null;
    const boxPackaging = !!(stripsPerBox && stripsPerBox > 1);
    const allowPartialDispensing = !!val.allowPartialDispensing;
    const sellingPrice = Number(val.sellingPrice) || 0;
    const unitSellingPrice = Number(val.unitSellingPrice) || (conversionFactor > 0 ? Number((sellingPrice / conversionFactor).toFixed(2)) : 0);

    const unitConversions: Array<{ unit: string; factor: number; isBase?: boolean }> = [
      { unit: baseUnit, factor: 1, isBase: true },
    ];

    if (purchaseUnit !== baseUnit) {
      unitConversions.push({ unit: purchaseUnit, factor: conversionFactor });
    }

    if (boxPackaging && stripsPerBox && stripsPerBox > 1) {
      unitConversions.push({
        unit: 'BOX',
        factor: stripsPerBox * conversionFactor,
      });
    }

    const availableSaleUnits: string[] = [purchaseUnit];
    if (baseUnit !== purchaseUnit) {
      if (dosageForm === 'SYRUP' || dosageForm === 'DROPS') {
        if (allowPartialDispensing) {
          availableSaleUnits.push(baseUnit);
        }
      } else {
        availableSaleUnits.push(baseUnit);
      }
    }
    if (boxPackaging) {
      availableSaleUnits.push('BOX');
    }

    let boxSellingPrice: number | null = null;
    if (boxPackaging && stripsPerBox) {
      boxSellingPrice = Number((sellingPrice * stripsPerBox).toFixed(2));
    }

    this.conversionPreview.set({
      dosageForm,
      baseUnit,
      purchaseUnit,
      conversionFactor,
      unitConversions,
      availableSaleUnits,
      unitSellingPrice,
      boxSellingPrice,
    });
  }

  onPackOrPriceChange() {
    const factor = Number(this.medicineForm.get('conversionFactor')?.value) || 1;
    const packSellingPrice = Number(this.medicineForm.get('sellingPrice')?.value) || 0;
    if (factor > 0 && packSellingPrice > 0) {
      const perUnit = Number((packSellingPrice / factor).toFixed(2));
      const currentUnitRate = this.medicineForm.get('unitSellingPrice')?.value;
      if (!currentUnitRate || currentUnitRate === 0) {
        this.medicineForm.patchValue({ unitSellingPrice: perUnit }, { emitEvent: false });
      }
    }
    this.updateConversionPreview();
  }

  ngOnInit() {
    this.loadMedicines();
    this.updateConversionPreview();
  }

  currentPage = signal(1);
  pageSize = signal(10);
  totalItems = signal(0);

  loadMedicines() {
    this.isLoading.set(true);
    this.apiService
      .getMedicines({
        search: this.searchQuery || undefined,
        category: this.selectedCategory || undefined,
        page: this.currentPage(),
        limit: this.pageSize(),
      })
      .subscribe({
        next: (res) => {
          this.medicines.set(res.items || []);
          this.totalItems.set(res.total || 0);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  onSearch(event: any) {
    this.searchQuery = event.target.value?.trim() || '';
    this.currentPage.set(1);
    this.loadMedicines();
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
    this.loadMedicines();
  }

  onPageSizeChange(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadMedicines();
  }

  onCategoryFilterChange(category: string) {
    this.selectedCategory = category;
    this.currentPage.set(1);
    this.loadMedicines();
  }

  editingMedicineId = signal<string | null>(null);
  isBatchModalOpen = signal(false);
  viewingMedicine = signal<any | null>(null);

  openAddModal() {
    this.editingMedicineId.set(null);
    this.medicineForm.reset({
      name: '',
      genericName: '',
      brandName: '',
      manufacturer: '',
      dosageForm: 'TABLET',
      packSize: 10,
      unitOfMeasure: 'STRIP',
      baseUnit: 'TABLET',
      purchaseUnit: 'STRIP',
      conversionFactor: 10,
      boxPackaging: false,
      stripsPerBox: null,
      packageVolume: null,
      allowPartialDispensing: false,
      unitSellingPrice: null,
      prescriptionCategory: 'OTC',
      hsnCode: '3004',
      gstRate: 12.0,
      purchaseCost: 0,
      sellingPrice: 0,
      mrp: 0,
      barcode: '',
      reorderLevel: 20,
    });
    this.duplicateWarning.set(null);
    this.isModalOpen.set(true);
    this.updateConversionPreview();
  }

  openEditModal(med: Medicine) {
    this.editingMedicineId.set(med.id);
    this.medicineForm.patchValue({
      name: med.name,
      genericName: med.genericName,
      brandName: med.brandName || '',
      manufacturer: med.manufacturer || '',
      dosageForm: med.dosageForm || 'TABLET',
      packSize: med.packSize || 10,
      unitOfMeasure: med.unitOfMeasure || 'STRIP',
      baseUnit: med.baseUnit || 'TABLET',
      purchaseUnit: med.purchaseUnit || 'STRIP',
      conversionFactor: med.conversionFactor || med.packSize || 10,
      boxPackaging: !!med.boxPackaging,
      stripsPerBox: med.stripsPerBox || null,
      packageVolume: med.packageVolume ? Number(med.packageVolume) : null,
      allowPartialDispensing: !!med.allowPartialDispensing,
      unitSellingPrice: med.unitSellingPrice ? Number(med.unitSellingPrice) : null,
      prescriptionCategory: med.prescriptionCategory || 'OTC',
      hsnCode: med.hsnCode || '3004',
      gstRate: Number(med.gstRate) || 12.0,
      purchaseCost: Number(med.purchaseCost) || 0,
      sellingPrice: Number(med.sellingPrice) || 0,
      mrp: Number(med.mrp) || 0,
      barcode: med.barcode || '',
      reorderLevel: med.reorderLevel || 20,
    });
    this.duplicateWarning.set(null);
    this.isModalOpen.set(true);
    this.updateConversionPreview();
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.editingMedicineId.set(null);
  }

  toggleStatus(med: Medicine) {
    this.apiService.toggleMedicineStatus(med.id).subscribe({
      next: (res) => {
        this.toastMessage.set(`Medicine "${med.name}" is now ${res.isActive ? 'Active' : 'Inactive'}.`);
        this.loadMedicines();
      },
      error: (err) => {
        this.toastMessage.set(err.error?.message || 'Failed to update medicine status.');
      },
    });
  }

  async deleteMedicine(med: Medicine) {
    const alert = await this.alertController.create({
      header: 'Delete Medicine',
      message: `Are you sure you want to delete "${med.name}" from the catalogue? This will remove the medicine or archive it if it has transaction records.`,
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'alert-btn-cancel',
        },
        {
          text: 'Delete',
          role: 'destructive',
          cssClass: 'alert-btn-danger',
          handler: () => {
            this.performDeleteMedicine(med);
          },
        },
      ],
    });
    await alert.present();
  }

  private performDeleteMedicine(med: Medicine) {
    this.apiService.deleteMedicine(med.id).subscribe({
      next: (res) => {
        this.toastMessage.set(res.message || `Medicine "${med.name}" removed successfully.`);
        this.loadMedicines();
      },
      error: (err) => {
        this.toastMessage.set(err.error?.message || 'Failed to delete medicine.');
      },
    });
  }

  viewBatches(med: Medicine) {
    this.apiService.getMedicine(med.id).subscribe({
      next: (fullMed) => {
        this.viewingMedicine.set(fullMed);
        this.isBatchModalOpen.set(true);
      },
      error: (err) => {
        this.toastMessage.set(err.error?.message || 'Failed to load medicine batches.');
      },
    });
  }

  closeBatchModal() {
    this.isBatchModalOpen.set(false);
    this.viewingMedicine.set(null);
  }

  checkDuplicate() {
    const name = this.medicineForm.get('name')?.value?.trim();
    const barcode = this.medicineForm.get('barcode')?.value?.trim();
    const excludeId = this.editingMedicineId() || undefined;

    if (!name) return;

    this.apiService.checkDuplicateMedicine({ name, barcode, excludeId }).subscribe({
      next: (res) => {
        if (res.isDuplicateName) {
          this.duplicateWarning.set(`A medicine with the name "${name}" already exists in your catalogue.`);
        } else if (res.isDuplicateBarcode) {
          this.duplicateWarning.set(`Barcode "${barcode}" is already assigned to "${res.matchedMedicine?.name}".`);
        } else {
          this.duplicateWarning.set(null);
        }
      },
    });
  }

  saveMedicine() {
    if (this.medicineForm.invalid) return;

    this.isSubmitting.set(true);
    const id = this.editingMedicineId();

    if (id) {
      // PUT /api/v1/medicines/:id
      this.apiService.updateMedicine(id, this.medicineForm.value).subscribe({
        next: (med) => {
          this.isSubmitting.set(false);
          this.toastMessage.set(`Medicine "${med.name}" updated successfully.`);
          this.closeModal();
          this.loadMedicines();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.toastMessage.set(err.error?.message || 'Failed to update medicine.');
        },
      });
    } else {
      // POST /api/v1/medicines
      this.apiService.createMedicine(this.medicineForm.value).subscribe({
        next: (med) => {
          this.isSubmitting.set(false);
          this.toastMessage.set(`Medicine "${med.name}" added successfully.`);
          this.closeModal();
          this.loadMedicines();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.toastMessage.set(err.error?.message || 'Failed to create medicine.');
        },
      });
    }
  }
}
