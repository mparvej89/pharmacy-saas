import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  returnDownBackOutline,
  checkmarkCircleOutline,
  closeOutline,
  shieldCheckmarkOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-returns',
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
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Sale Returns & Quarantine Inspection</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-content">
      <ion-card class="table-card">
        <ion-card-content class="ion-no-padding">
          <div class="table-responsive">
            <table class="pharmacy-table">
              <thead>
                <tr>
                  <th>Return #</th>
                  <th>Date</th>
                  <th>Original Invoice</th>
                  <th>Items Returned</th>
                  <th>Refund Amount</th>
                  <th>Method</th>
                  <th>Reason</th>
                  <th>Processed By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of returns()">
                  <td class="font-mono font-bold">{{ r.returnNumber }}</td>
                  <td>{{ r.returnDate | date:'short' }}</td>
                  <td class="font-mono">{{ r.sale?.invoiceNumber }}</td>
                  <td>
                    <div *ngFor="let item of r.items" class="return-item-badge">
                      {{ item.saleItem?.medicine?.name }} (Qty: {{ item.quantityReturned }})
                      <ion-badge
                        [color]="item.isInspected ? (item.initialStockDisposition === 'RESTOCKED_AFTER_INSPECTION' ? 'success' : 'danger') : 'warning'"
                      >
                        {{ item.initialStockDisposition }}
                      </ion-badge>
                    </div>
                  </td>
                  <td class="font-bold">₹{{ r.totalRefundAmount }}</td>
                  <td>{{ r.refundMethod }}</td>
                  <td>{{ r.reason }}</td>
                  <td>{{ r.processedBy?.fullName }}</td>
                  <td>
                    <div *ngFor="let item of r.items">
                      <ion-button
                        size="small"
                        color="secondary"
                        *ngIf="!item.isInspected"
                        (click)="openInspectionModal(item)"
                      >
                        <ion-icon name="shield-checkmark-outline" slot="start"></ion-icon>
                        Inspect Quarantined
                      </ion-button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="!returns().length">
                  <td colspan="9" class="ion-text-center ion-padding">
                    No customer returns recorded.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Quarantine Inspection Modal -->
      <ion-modal [isOpen]="isModalOpen()">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>Quarantine Stock Inspection</ion-title>
              <ion-button slot="end" fill="clear" (click)="closeModal()">
                <ion-icon name="close-outline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-toolbar>
          </ion-header>

          <ion-content class="ion-padding modal-content">
            <div class="inspection-alert ion-margin-bottom">
              <ion-icon name="alert-circle-outline"></ion-icon>
              <p>
                Under pharmacy regulations, returned medicine cannot be restocked without physical verification of intact seals, storage conditions, and expiry date.
              </p>
            </div>

            <form [formGroup]="inspectionForm" (ngSubmit)="submitInspection()">
              <ion-item lines="inset" class="form-item ion-margin-bottom">
                <ion-select
                  label="Inspection Sign-off Decision *"
                  labelPlacement="stacked"
                  formControlName="approveToSellable"
                >
                  <ion-select-option [value]="true">Approve & Restock to Available Inventory</ion-select-option>
                  <ion-select-option [value]="false">Reject & Dispose as Damaged</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item lines="inset" class="form-item ion-margin-bottom">
                <ion-input
                  label="Mandatory Pharmacist Inspection Notes *"
                  labelPlacement="stacked"
                  placeholder="e.g. Unopened blister pack, sealed foil intact, stored at <25C"
                  formControlName="inspectionNotes"
                ></ion-input>
              </ion-item>

              <ion-button
                expand="block"
                size="large"
                type="submit"
                color="primary"
                [disabled]="inspectionForm.invalid || isSubmitting()"
              >
                <ion-spinner *ngIf="isSubmitting()" name="crescent" slot="start"></ion-spinner>
                <span *ngIf="!isSubmitting()">Sign-off Inspection</span>
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
      .return-item-badge {
        margin-bottom: 4px;
      }
      .inspection-alert {
        display: flex;
        gap: 12px;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        padding: 12px;
        border-radius: 8px;
        color: #1e40af;
      }
      .inspection-alert p {
        margin: 0;
        font-size: 0.85rem;
      }
      .form-item {
        --background: #f8fafc;
        border-radius: 8px;
      }
    `,
  ],
})
export class ReturnsComponent implements OnInit {
  returns = signal<any[]>([]);
  isModalOpen = signal(false);
  isSubmitting = signal(false);
  activeInspectionItem = signal<any | null>(null);
  toastMessage = signal<string | null>(null);

  inspectionForm: FormGroup;

  constructor(
    private apiService: ApiService,
    private fb: FormBuilder,
  ) {
    addIcons({
      returnDownBackOutline,
      checkmarkCircleOutline,
      closeOutline,
      shieldCheckmarkOutline,
      alertCircleOutline,
    });

    this.inspectionForm = this.fb.group({
      approveToSellable: [true, Validators.required],
      inspectionNotes: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.loadReturns();
  }

  loadReturns() {
    this.apiService.getReturns().subscribe((res) => this.returns.set(res));
  }

  openInspectionModal(item: any) {
    this.activeInspectionItem.set(item);
    this.inspectionForm.reset({
      approveToSellable: true,
      inspectionNotes: '',
    });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  submitInspection() {
    if (this.inspectionForm.invalid) return;

    const item = this.activeInspectionItem();
    if (!item) return;

    this.isSubmitting.set(true);
    this.apiService.inspectReturnItem(item.id, this.inspectionForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastMessage.set('Return item inspected and inventory updated.');
        this.closeModal();
        this.loadReturns();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toastMessage.set(err.error?.message || 'Inspection sign-off failed.');
      },
    });
  }
}
