import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cubeOutline,
  warningOutline,
  timeOutline,
  receiptOutline,
  createOutline,
  closeOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
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
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Batch Inventory & FEFO Engine</ion-title>
        <ion-button slot="end" fill="solid" color="light" (click)="openAdjustmentModal()">
          <ion-icon name="create-outline" slot="start"></ion-icon>
          Adjust Stock
        </ion-button>
      </ion-toolbar>

      <ion-toolbar>
        <ion-segment [(ngModel)]="activeTab" (ionChange)="onTabChange()">
          <ion-segment-button value="batches">
            <ion-label>All Batches (FEFO)</ion-label>
          </ion-segment-button>
          <ion-segment-button value="low-stock">
            <ion-label>Low Stock</ion-label>
          </ion-segment-button>
          <ion-segment-button value="expiring">
            <ion-label>Expiring Batches</ion-label>
          </ion-segment-button>
          <ion-segment-button value="ledger">
            <ion-label>Stock Movement Ledger</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding inventory-content">
      <!-- 1. All Batches Table -->
      <ion-card class="table-card" *ngIf="activeTab === 'batches'">
        <ion-card-content class="ion-no-padding">
          <div class="table-responsive">
            <table class="pharmacy-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Batch Number</th>
                  <th>Expiry Date</th>
                  <th>Available Qty</th>
                  <th>Quarantined</th>
                  <th>Damaged</th>
                  <th>Rack Location</th>
                  <th>Selling Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let b of batches()">
                  <td>
                    <strong>{{ b.medicine?.name }}</strong>
                    <div class="sub-text">{{ b.medicine?.genericName }}</div>
                  </td>
                  <td class="font-mono">{{ b.batchNumber }}</td>
                  <td class="font-mono">{{ b.expiryDate | date:'mediumDate' }}</td>
                  <td>
                    <span class="stock-badge font-bold">{{ b.quantityAvailable }}</span>
                  </td>
                  <td>
                    <span *ngIf="b.quantityQuarantined > 0" class="badge-quarantine">
                      {{ b.quantityQuarantined }}
                    </span>
                    <span *ngIf="b.quantityQuarantined === 0">-</span>
                  </td>
                  <td>
                    <span *ngIf="b.quantityDamaged > 0" class="badge-damaged">
                      {{ b.quantityDamaged }}
                    </span>
                    <span *ngIf="b.quantityDamaged === 0">-</span>
                  </td>
                  <td>{{ b.rackLocation || 'Unassigned' }}</td>
                  <td>₹{{ b.sellingPrice }}</td>
                  <td>
                    <ion-badge color="success" *ngIf="b.status === 'ACTIVE'">ACTIVE</ion-badge>
                    <ion-badge color="warning" *ngIf="b.status === 'QUARANTINED'">QUARANTINED</ion-badge>
                    <ion-badge color="danger" *ngIf="b.status === 'EXPIRED'">EXPIRED</ion-badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- 2. Low Stock Alerts -->
      <ion-card class="table-card" *ngIf="activeTab === 'low-stock'">
        <ion-card-content class="ion-no-padding">
          <div class="table-responsive">
            <table class="pharmacy-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Generic Name</th>
                  <th>Current Stock</th>
                  <th>Reorder Level</th>
                  <th>Deficit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let l of lowStock()">
                  <td><strong>{{ l.name }}</strong></td>
                  <td>{{ l.genericName }}</td>
                  <td class="font-bold text-danger">{{ l.currentStock }}</td>
                  <td>{{ l.reorderLevel }}</td>
                  <td class="text-danger font-bold">-{{ l.deficit }}</td>
                  <td>
                    <ion-badge color="danger">REORDER NEEDED</ion-badge>
                  </td>
                </tr>
                <tr *ngIf="!lowStock().length">
                  <td colspan="6" class="ion-text-center ion-padding">
                    All medicines are currently above reorder levels.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- 3. Expiring Soon -->
      <ion-card class="table-card" *ngIf="activeTab === 'expiring'">
        <ion-card-content class="ion-no-padding">
          <div class="table-responsive">
            <table class="pharmacy-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Batch Number</th>
                  <th>Expiry Date</th>
                  <th>Days Remaining</th>
                  <th>Available Qty</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let e of expiringBatches()">
                  <td><strong>{{ e.medicine?.name }}</strong></td>
                  <td class="font-mono">{{ e.batchNumber }}</td>
                  <td class="font-mono">{{ e.expiryDate | date:'mediumDate' }}</td>
                  <td class="font-bold" [class.text-danger]="e.isExpired">
                    {{ e.isExpired ? 'EXPIRED' : (e.daysRemaining + ' days') }}
                  </td>
                  <td>{{ e.quantityAvailable }}</td>
                  <td>
                    <ion-badge color="danger" *ngIf="e.isExpired">EXPIRED</ion-badge>
                    <ion-badge color="warning" *ngIf="!e.isExpired">EXPIRING SOON</ion-badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- 4. Stock Movement Ledger -->
      <ion-card class="table-card" *ngIf="activeTab === 'ledger'">
        <ion-card-content class="ion-no-padding">
          <div class="table-responsive">
            <table class="pharmacy-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Medicine</th>
                  <th>Batch</th>
                  <th>Movement Type</th>
                  <th>Qty Change</th>
                  <th>Balance After</th>
                  <th>User</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let m of ledger()">
                  <td>{{ m.createdAt | date:'short' }}</td>
                  <td><strong>{{ m.medicine?.name }}</strong></td>
                  <td class="font-mono">{{ m.batch?.batchNumber }}</td>
                  <td>
                    <ion-badge [color]="m.quantityChange > 0 ? 'success' : 'medium'">
                      {{ m.movementType }}
                    </ion-badge>
                  </td>
                  <td class="font-bold" [class.text-success]="m.quantityChange > 0" [class.text-danger]="m.quantityChange < 0">
                    {{ m.quantityChange > 0 ? ('+' + m.quantityChange) : m.quantityChange }}
                  </td>
                  <td class="font-mono">{{ m.balanceAfter }}</td>
                  <td>{{ m.user?.fullName }}</td>
                  <td class="sub-text">{{ m.notes }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Stock Adjustment Modal -->
      <ion-modal [isOpen]="isModalOpen()">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>Stock Count Adjustment</ion-title>
              <ion-button slot="end" fill="clear" (click)="closeAdjustmentModal()">
                <ion-icon name="close-outline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-toolbar>
          </ion-header>

          <ion-content class="ion-padding modal-content">
            <form [formGroup]="adjustmentForm" (ngSubmit)="saveAdjustment()">
              <ion-item lines="inset" class="form-item ion-margin-bottom">
                <ion-select
                  label="Select Batch to Adjust"
                  labelPlacement="stacked"
                  formControlName="batchId"
                  (ionChange)="onBatchSelected($event)"
                >
                  <ion-select-option *ngFor="let b of batches()" [value]="b.id">
                    {{ b.medicine?.name }} - Batch {{ b.batchNumber }} (Cur: {{ b.quantityAvailable }})
                  </ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item lines="inset" class="form-item ion-margin-bottom">
                <ion-select
                  label="Adjustment Type"
                  labelPlacement="stacked"
                  formControlName="adjustmentType"
                >
                  <ion-select-option value="PHYSICAL_COUNT_VARIANCE">Physical Count Audit</ion-select-option>
                  <ion-select-option value="DAMAGE">Damaged / Broken Vial</ion-select-option>
                  <ion-select-option value="INCREASE">Found Unrecorded Stock</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item lines="inset" class="form-item ion-margin-bottom">
                <ion-input
                  label="New Physical Count Quantity *"
                  labelPlacement="stacked"
                  type="number"
                  formControlName="adjustedQuantity"
                ></ion-input>
              </ion-item>

              <ion-item lines="inset" class="form-item ion-margin-bottom">
                <ion-input
                  label="Mandatory Audit Reason *"
                  labelPlacement="stacked"
                  placeholder="e.g. Broken bottle during restocking audit"
                  formControlName="reason"
                ></ion-input>
              </ion-item>

              <ion-button
                expand="block"
                size="large"
                type="submit"
                color="primary"
                [disabled]="adjustmentForm.invalid || isSubmitting()"
              >
                <ion-spinner *ngIf="isSubmitting()" name="crescent" slot="start"></ion-spinner>
                <span *ngIf="!isSubmitting()">Post Stock Adjustment</span>
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
      .inventory-content {
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
      .sub-text {
        font-size: 0.78rem;
        color: #64748b;
      }
      .stock-badge {
        padding: 4px 8px;
        background: #e2e8f0;
        border-radius: 4px;
      }
      .badge-quarantine {
        background: #fef3c7;
        color: #92400e;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
      }
      .badge-damaged {
        background: #fee2e2;
        color: #991b1b;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
      }
      .text-danger {
        color: #dc2626;
      }
      .text-success {
        color: #16a34a;
      }
      .form-item {
        --background: #f8fafc;
        border-radius: 8px;
      }
    `,
  ],
})
export class InventoryComponent implements OnInit {
  activeTab = 'batches';
  batches = signal<any[]>([]);
  lowStock = signal<any[]>([]);
  expiringBatches = signal<any[]>([]);
  ledger = signal<any[]>([]);

  isModalOpen = signal(false);
  isSubmitting = signal(false);
  toastMessage = signal<string | null>(null);

  adjustmentForm: FormGroup;

  constructor(
    private apiService: ApiService,
    private fb: FormBuilder,
  ) {
    addIcons({
      cubeOutline,
      warningOutline,
      timeOutline,
      receiptOutline,
      createOutline,
      closeOutline,
      checkmarkCircleOutline,
    });

    this.adjustmentForm = this.fb.group({
      medicineId: ['', Validators.required],
      batchId: ['', Validators.required],
      adjustmentType: ['PHYSICAL_COUNT_VARIANCE', Validators.required],
      adjustedQuantity: [0, [Validators.required, Validators.min(0)]],
      reason: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.loadData();
  }

  onTabChange() {
    this.loadData();
  }

  loadData() {
    if (this.activeTab === 'batches') {
      this.apiService.getBatches().subscribe((res) => this.batches.set(res));
    } else if (this.activeTab === 'low-stock') {
      this.apiService.getLowStock().subscribe((res) => this.lowStock.set(res));
    } else if (this.activeTab === 'expiring') {
      this.apiService.getExpiringBatches(90).subscribe((res) => this.expiringBatches.set(res));
    } else if (this.activeTab === 'ledger') {
      this.apiService.getStockLedger({ limit: 100 }).subscribe((res) => this.ledger.set(res));
    }
  }

  openAdjustmentModal() {
    this.apiService.getBatches().subscribe((res) => this.batches.set(res));
    this.adjustmentForm.reset({
      adjustmentType: 'PHYSICAL_COUNT_VARIANCE',
      adjustedQuantity: 0,
      reason: '',
    });
    this.isModalOpen.set(true);
  }

  closeAdjustmentModal() {
    this.isModalOpen.set(false);
  }

  onBatchSelected(event: any) {
    const batchId = event.target.value;
    const selected = this.batches().find((b) => b.id === batchId);
    if (selected) {
      this.adjustmentForm.patchValue({
        medicineId: selected.medicineId,
        adjustedQuantity: selected.quantityAvailable,
      });
    }
  }

  saveAdjustment() {
    if (this.adjustmentForm.invalid) return;

    this.isSubmitting.set(true);
    this.apiService.createAdjustment(this.adjustmentForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastMessage.set('Stock adjustment posted and logged to ledger.');
        this.closeAdjustmentModal();
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toastMessage.set(err.error?.message || 'Failed to adjust stock.');
      },
    });
  }
}
