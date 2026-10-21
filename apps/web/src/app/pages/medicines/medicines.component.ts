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
} from 'ionicons/icons';
import { ApiService } from '../../core/services/api.service';
import { Medicine } from '../../core/models';

@Component({
  selector: 'app-medicines',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
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
                      {{ med.totalAvailableStock || 0 }} {{ med.unitOfMeasure }}
                    </span>
                  </td>
                </tr>
                <tr *ngIf="!medicines().length && !isLoading()">
                  <td colspan="8" class="ion-text-center ion-padding">
                    No medicines found. Use "Add Medicine" to create entries.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Add Medicine Modal -->
      <ion-modal [isOpen]="isModalOpen()">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>Add New Medicine to Catalogue</ion-title>
              <ion-button slot="end" fill="clear" (click)="closeModal()">
                <ion-icon name="close-outline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-toolbar>
          </ion-header>

          <ion-content class="ion-padding modal-content">
            <form [formGroup]="medicineForm" (ngSubmit)="saveMedicine()">
              <ion-grid>
                <ion-row>
                  <ion-col size="12" size-md="6">
                    <ion-item lines="inset" class="form-item">
                      <ion-input
                        label="Medicine Name *"
                        labelPlacement="stacked"
                        placeholder="e.g. Paracetamol 650mg"
                        formControlName="name"
                        (ionBlur)="checkDuplicate()"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="12" size-md="6">
                    <ion-item lines="inset" class="form-item">
                      <ion-input
                        label="Generic Name *"
                        labelPlacement="stacked"
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

                <ion-row>
                  <ion-col size="12" size-md="6">
                    <ion-item lines="inset" class="form-item">
                      <ion-input
                        label="Brand / Trade Name"
                        labelPlacement="stacked"
                        placeholder="e.g. Dolo 650"
                        formControlName="brandName"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="12" size-md="6">
                    <ion-item lines="inset" class="form-item">
                      <ion-input
                        label="Manufacturer"
                        labelPlacement="stacked"
                        placeholder="e.g. Micro Labs Ltd"
                        formControlName="manufacturer"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                </ion-row>

                <ion-row>
                  <ion-col size="12" size-md="4">
                    <ion-item lines="inset" class="form-item">
                      <ion-select
                        label="Prescription Category"
                        labelPlacement="stacked"
                        formControlName="prescriptionCategory"
                      >
                        <ion-select-option value="OTC">OTC</ion-select-option>
                        <ion-select-option value="SCHEDULE_H">Schedule H</ion-select-option>
                        <ion-select-option value="SCHEDULE_H1">Schedule H1</ion-select-option>
                        <ion-select-option value="SCHEDULE_X">Schedule X</ion-select-option>
                      </ion-select>
                    </ion-item>
                  </ion-col>
                  <ion-col size="12" size-md="4">
                    <ion-item lines="inset" class="form-item">
                      <ion-input
                        label="HSN Code"
                        labelPlacement="stacked"
                        formControlName="hsnCode"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="12" size-md="4">
                    <ion-item lines="inset" class="form-item">
                      <ion-select
                        label="Applicable GST Rate"
                        labelPlacement="stacked"
                        formControlName="gstRate"
                      >
                        <ion-select-option [value]="0">0% (Nil)</ion-select-option>
                        <ion-select-option [value]="5">5% GST</ion-select-option>
                        <ion-select-option [value]="12">12% GST (Standard)</ion-select-option>
                        <ion-select-option [value]="18">18% GST</ion-select-option>
                      </ion-select>
                    </ion-item>
                  </ion-col>
                </ion-row>

                <ion-row>
                  <ion-col size="12" size-md="4">
                    <ion-item lines="inset" class="form-item">
                      <ion-input
                        label="Purchase Cost (₹)"
                        labelPlacement="stacked"
                        type="number"
                        formControlName="purchaseCost"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="12" size-md="4">
                    <ion-item lines="inset" class="form-item">
                      <ion-input
                        label="Selling Price (₹)"
                        labelPlacement="stacked"
                        type="number"
                        formControlName="sellingPrice"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="12" size-md="4">
                    <ion-item lines="inset" class="form-item">
                      <ion-input
                        label="MRP (₹)"
                        labelPlacement="stacked"
                        type="number"
                        formControlName="mrp"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                </ion-row>

                <ion-row>
                  <ion-col size="12" size-md="6">
                    <ion-item lines="inset" class="form-item">
                      <ion-input
                        label="Barcode / EAN"
                        labelPlacement="stacked"
                        placeholder="Scan or enter barcode"
                        formControlName="barcode"
                        (ionBlur)="checkDuplicate()"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="12" size-md="6">
                    <ion-item lines="inset" class="form-item">
                      <ion-input
                        label="Reorder Alert Level"
                        labelPlacement="stacked"
                        type="number"
                        formControlName="reorderLevel"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                </ion-row>
              </ion-grid>

              <ion-button
                expand="block"
                size="large"
                type="submit"
                color="primary"
                class="ion-margin-top"
                [disabled]="medicineForm.invalid || isSubmitting()"
              >
                <ion-spinner *ngIf="isSubmitting()" name="crescent" slot="start"></ion-spinner>
                <span *ngIf="!isSubmitting()">Save Medicine to Catalogue</span>
              </ion-button>
            </form>
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
        --background: #f8fafc;
        border-radius: 8px;
      }
      .duplicate-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #fffbeb;
        border: 1px solid #fef3c7;
        padding: 10px 14px;
        border-radius: 8px;
        color: #92400e;
        font-size: 0.85rem;
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

  medicineForm: FormGroup;

  constructor(
    private apiService: ApiService,
    private fb: FormBuilder,
  ) {
    addIcons({
      addOutline,
      searchOutline,
      medkitOutline,
      warningOutline,
      closeOutline,
      checkmarkOutline,
      shieldCheckmarkOutline,
    });

    this.medicineForm = this.fb.group({
      name: ['', Validators.required],
      genericName: ['', Validators.required],
      brandName: [''],
      manufacturer: [''],
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

  ngOnInit() {
    this.loadMedicines();
  }

  loadMedicines() {
    this.isLoading.set(true);
    this.apiService
      .getMedicines({
        search: this.searchQuery || undefined,
        category: this.selectedCategory || undefined,
        limit: 50,
      })
      .subscribe({
        next: (res) => {
          this.medicines.set(res.items || []);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  onSearch(event: any) {
    this.searchQuery = event.target.value?.trim() || '';
    this.loadMedicines();
  }

  openAddModal() {
    this.medicineForm.reset({
      prescriptionCategory: 'OTC',
      hsnCode: '3004',
      gstRate: 12.0,
      purchaseCost: 0,
      sellingPrice: 0,
      mrp: 0,
      reorderLevel: 20,
    });
    this.duplicateWarning.set(null);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  checkDuplicate() {
    const name = this.medicineForm.get('name')?.value?.trim();
    const barcode = this.medicineForm.get('barcode')?.value?.trim();

    if (!name) return;

    this.apiService.checkDuplicateMedicine({ name, barcode }).subscribe({
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
