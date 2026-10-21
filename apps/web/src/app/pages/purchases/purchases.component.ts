import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonModal,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
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
  bagAddOutline,
  checkmarkDoneOutline,
  closeOutline,
  addOutline,
  trashOutline,
} from 'ionicons/icons';
import { ApiService } from '../../core/services/api.service';
import { Medicine } from '../../core/models';

@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonModal,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
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
        <ion-title>Purchases & GRN</ion-title>
        <ion-button slot="end" fill="solid" color="light" (click)="openCreateModal()">
          <ion-icon name="bag-add-outline" slot="start"></ion-icon>
          New Purchase Invoice
        </ion-button>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-content">
      <ion-card class="table-card">
        <ion-card-content class="ion-no-padding">
          <div class="table-responsive">
            <table class="pharmacy-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Supplier Invoice #</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of purchases()">
                  <td class="font-mono font-bold">{{ p.purchaseNumber }}</td>
                  <td>{{ p.supplier?.name }}</td>
                  <td class="font-mono">{{ p.supplierInvoiceNumber }}</td>
                  <td>{{ p.supplierInvoiceDate | date:'mediumDate' }}</td>
                  <td>{{ p._count?.items }} items</td>
                  <td class="font-bold">₹{{ p.totalAmount }}</td>
                  <td>
                    <ion-badge [color]="p.status === 'POSTED' ? 'success' : 'warning'">
                      {{ p.status }}
                    </ion-badge>
                  </td>
                  <td>
                    <ion-button
                      size="small"
                      color="success"
                      *ngIf="p.status === 'DRAFT'"
                      (click)="postPurchase(p.id)"
                    >
                      <ion-icon name="checkmark-done-outline" slot="start"></ion-icon>
                      Post to Stock
                    </ion-button>
                    <span *ngIf="p.status === 'POSTED'" class="posted-badge">
                      Credited
                    </span>
                  </td>
                </tr>
                <tr *ngIf="!purchases().length">
                  <td colspan="8" class="ion-text-center ion-padding">
                    No purchase invoices found. Click "New Purchase Invoice" to record incoming stock.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- New Purchase Modal -->
      <ion-modal [isOpen]="isModalOpen()" class="large-form-modal">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>Receive Goods & Create Draft Purchase</ion-title>
              <ion-button slot="end" fill="clear" (click)="closeModal()">
                <ion-icon name="close-outline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-toolbar>
          </ion-header>

          <ion-content class="ion-padding modal-content">
            <form [formGroup]="purchaseForm" (ngSubmit)="saveDraft()">
              <ion-grid>
                <ion-row>
                  <ion-col size="12" sizeMd="4">
                    <ion-item fill="outline" class="form-item">
                      <ion-select
                        label="Supplier *"
                        labelPlacement="floating"
                        formControlName="supplierId"
                      >
                        <ion-select-option *ngFor="let s of suppliers()" [value]="s.id">
                          {{ s.name }} ({{ s.gstin || 'Unregistered' }})
                        </ion-select-option>
                      </ion-select>
                    </ion-item>
                  </ion-col>
                  <ion-col size="12" sizeMd="4">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        label="Supplier Invoice # *"
                        labelPlacement="floating"
                        formControlName="supplierInvoiceNumber"
                        placeholder="e.g. INV-2026-99"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="12" sizeMd="4">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        label="Invoice Date *"
                        labelPlacement="floating"
                        type="date"
                        formControlName="supplierInvoiceDate"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                </ion-row>

                <!-- Line Items Form Array -->
                <div class="line-items-section ion-margin-top">
                  <div class="section-header">
                    <h4>Medicine Batches to Receive</h4>
                    <ion-button size="small" fill="solid" color="primary" (click)="addItemLine()">
                      <ion-icon name="add-outline" slot="start"></ion-icon>
                      Add Line Item
                    </ion-button>
                  </div>

                  <div formArrayName="items">
                    <div
                      *ngFor="let item of itemsFormArray.controls; let i = index"
                      [formGroupName]="i"
                      class="item-line-card ion-padding"
                    >
                      <div class="item-header-row">
                        <span class="item-badge">Batch Item #{{ i + 1 }}</span>
                        <ion-button fill="clear" color="danger" size="small" (click)="removeItemLine(i)">
                          <ion-icon name="trash-outline" slot="start"></ion-icon>
                          Delete Item
                        </ion-button>
                      </div>

                      <ion-row>
                        <ion-col size="12" sizeMd="6">
                          <ion-item fill="outline" class="form-item">
                            <ion-select label="Medicine *" labelPlacement="floating" formControlName="medicineId">
                              <ion-select-option *ngFor="let med of medicines()" [value]="med.id">
                                {{ med.name }}
                              </ion-select-option>
                            </ion-select>
                          </ion-item>
                        </ion-col>
                        <ion-col size="6" sizeMd="3">
                          <ion-item fill="outline" class="form-item">
                            <ion-input
                              label="Batch #"
                              labelPlacement="floating"
                              formControlName="batchNumber"
                              placeholder="e.g. B2401"
                            ></ion-input>
                          </ion-item>
                        </ion-col>
                        <ion-col size="6" sizeMd="3">
                          <ion-item fill="outline" class="form-item">
                            <ion-input
                              label="Expiry Date *"
                              labelPlacement="floating"
                              type="date"
                              formControlName="expiryDate"
                            ></ion-input>
                          </ion-item>
                        </ion-col>
                      </ion-row>

                      <ion-row class="ion-margin-top">
                        <ion-col size="6" sizeMd="3">
                          <ion-item fill="outline" class="form-item">
                            <ion-input
                              label="Paid Quantity *"
                              labelPlacement="floating"
                              type="number"
                              formControlName="quantity"
                              placeholder="10"
                            ></ion-input>
                          </ion-item>
                        </ion-col>
                        <ion-col size="6" sizeMd="3">
                          <ion-item fill="outline" class="form-item">
                            <ion-input
                              label="Free Quantity"
                              labelPlacement="floating"
                              type="number"
                              formControlName="freeQuantity"
                              placeholder="0"
                            ></ion-input>
                          </ion-item>
                        </ion-col>
                        <ion-col size="6" sizeMd="3">
                          <ion-item fill="outline" class="form-item">
                            <ion-input
                              label="Purchase Rate (₹) *"
                              labelPlacement="floating"
                              type="number"
                              formControlName="purchaseRate"
                              placeholder="0.00"
                            ></ion-input>
                          </ion-item>
                        </ion-col>
                        <ion-col size="6" sizeMd="3">
                          <ion-item fill="outline" class="form-item">
                            <ion-input
                              label="MRP (₹) *"
                              labelPlacement="floating"
                              type="number"
                              formControlName="mrp"
                              placeholder="0.00"
                            ></ion-input>
                          </ion-item>
                        </ion-col>
                      </ion-row>
                    </div>
                  </div>
                </div>
              </ion-grid>

              <ion-button
                expand="block"
                size="large"
                type="submit"
                color="primary"
                class="ion-margin-top"
                [disabled]="purchaseForm.invalid || isSubmitting()"
              >
                <ion-spinner *ngIf="isSubmitting()" name="crescent" slot="start"></ion-spinner>
                <span *ngIf="!isSubmitting()">Save Draft Purchase</span>
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
      .table-card {
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        background: #ffffff;
        margin: 0;
      }
      .pharmacy-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.88rem;
      }
      .pharmacy-table th {
        background: #f8fafc;
        padding: 12px 14px;
        color: #475569;
        font-weight: 600;
        border-bottom: 1px solid #e2e8f0;
        text-align: left;
      }
      .pharmacy-table td {
        padding: 12px 14px;
        border-bottom: 1px solid #f1f5f9;
        color: #1e293b;
      }
      .posted-badge {
        font-size: 0.82rem;
        color: #16a34a;
        font-weight: 600;
      }
      .form-item {
        --background: #f8fafc;
        border-radius: 8px;
      }
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 8px;
      }
      .section-header h4 {
        margin: 0;
        font-size: 1rem;
        font-weight: 700;
        color: #0f172a;
      }
      .item-line-card {
        background: #f8fafc;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
        margin-top: 14px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }
      .item-header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px dashed #cbd5e1;
      }
      .item-badge {
        font-weight: 700;
        font-size: 0.85rem;
        color: #0369a1;
        background: #e0f2fe;
        padding: 4px 10px;
        border-radius: 6px;
      }
      ion-modal {
        --width: 920px;
        --max-width: 95vw;
        --height: 85vh;
        --border-radius: 14px;
      }
      ion-item.form-item {
        --background: #ffffff;
      }
      ion-input::part(label),
      ion-select::part(label) {
        text-overflow: unset !important;
        white-space: nowrap !important;
        overflow: visible !important;
        font-size: 0.85rem;
      }
    `,
  ],
})
export class PurchasesComponent implements OnInit {
  purchases = signal<any[]>([]);
  suppliers = signal<any[]>([]);
  medicines = signal<Medicine[]>([]);

  isModalOpen = signal(false);
  isSubmitting = signal(false);
  toastMessage = signal<string | null>(null);

  purchaseForm: FormGroup;

  get itemsFormArray() {
    return this.purchaseForm.get('items') as FormArray;
  }

  constructor(
    private apiService: ApiService,
    private fb: FormBuilder,
  ) {
    addIcons({
      bagAddOutline,
      checkmarkDoneOutline,
      closeOutline,
      addOutline,
      trashOutline,
    });

    this.purchaseForm = this.fb.group({
      supplierId: ['', Validators.required],
      supplierInvoiceNumber: ['', Validators.required],
      supplierInvoiceDate: [new Date().toISOString().slice(0, 10), Validators.required],
      items: this.fb.array([]),
    });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.apiService.getPurchases().subscribe((res) => this.purchases.set(res));
    this.apiService.getSuppliers().subscribe((res) => this.suppliers.set(res));
    this.apiService.getMedicines().subscribe((res) => this.medicines.set(res.items || []));
  }

  openCreateModal() {
    this.purchaseForm.reset({
      supplierInvoiceDate: new Date().toISOString().slice(0, 10),
    });
    this.itemsFormArray.clear();
    this.addItemLine();
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  addItemLine() {
    const line = this.fb.group({
      medicineId: ['', Validators.required],
      batchNumber: ['', Validators.required],
      expiryDate: ['', Validators.required],
      quantity: [10, [Validators.required, Validators.min(1)]],
      freeQuantity: [0, [Validators.required, Validators.min(0)]],
      purchaseRate: [10, [Validators.required, Validators.min(0)]],
      discountPercent: [0],
      gstRate: [12],
      mrp: [15, [Validators.required, Validators.min(0)]],
      sellingPrice: [14, [Validators.required, Validators.min(0)]],
    });
    this.itemsFormArray.push(line);
  }

  removeItemLine(index: number) {
    if (this.itemsFormArray.length > 1) {
      this.itemsFormArray.removeAt(index);
    }
  }

  saveDraft() {
    if (this.purchaseForm.invalid) return;

    this.isSubmitting.set(true);
    this.apiService.createDraftPurchase(this.purchaseForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastMessage.set('Draft purchase invoice saved.');
        this.closeModal();
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toastMessage.set(err.error?.message || 'Failed to save purchase.');
      },
    });
  }

  postPurchase(id: string) {
    this.apiService.postPurchase(id).subscribe({
      next: () => {
        this.toastMessage.set('Purchase posted! Batches created and stock ledger updated.');
        this.loadData();
      },
      error: (err) => {
        this.toastMessage.set(err.error?.message || 'Failed to post purchase.');
      },
    });
  }
}
