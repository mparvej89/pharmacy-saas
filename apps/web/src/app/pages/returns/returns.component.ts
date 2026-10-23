import { Component, OnInit, signal, computed } from '@angular/core';
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
  returnDownBackOutline,
  checkmarkCircleOutline,
  closeOutline,
  shieldCheckmarkOutline,
  alertCircleOutline,
  eyeOutline,
  addOutline,
} from 'ionicons/icons';
import { ApiService } from '../../core/services/api.service';
import { SearchableSelectComponent, SearchableOption } from '../../shared/components/searchable-select.component';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-returns',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SearchableSelectComponent,
    PaginationComponent,
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
        <ion-title>Returns & Quarantine</ion-title>
        <ion-button slot="end" fill="solid" color="light" (click)="openCreateReturnModal()">
          <ion-icon name="add-outline" slot="start"></ion-icon>
          Process Return
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
                <tr *ngFor="let r of paginatedReturns()">
                  <td class="font-mono font-bold">{{ r.returnNumber }}</td>
                  <td>{{ r.returnDate | date:'short' }}</td>
                  <td class="font-mono">{{ r.sale?.invoiceNumber }}</td>
                  <td>
                    <div *ngFor="let item of r.items" class="return-item-badge">
                      {{ item.saleItem?.medicine?.name }} (Qty: {{ item.quantityReturned }} {{ item.saleItem?.saleUnit || item.saleItem?.medicine?.baseUnit || '' }})
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
                    <div class="action-buttons-group">
                      <button
                        type="button"
                        class="action-btn view"
                        (click)="viewReturnDetails(r.id)"
                        title="View Return Details & Item Statuses"
                      >
                        <ion-icon name="eye-outline"></ion-icon>
                      </button>
                      <ng-container *ngFor="let item of r.items">
                        <ion-button
                          size="small"
                          color="secondary"
                          *ngIf="!item.isInspected"
                          (click)="openInspectionModal(item)"
                          title="Inspect Quarantined Batch"
                        >
                          <ion-icon name="shield-checkmark-outline" slot="start"></ion-icon>
                          Inspect
                        </ion-button>
                      </ng-container>
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
          <app-pagination
            *ngIf="returns().length > 0"
            [totalItems]="returns().length"
            [currentPage]="currentPage()"
            [pageSize]="pageSize()"
            [pageSizeOptions]="[10, 25, 50, 100]"
            itemLabel="returns"
            (pageChange)="onPageChange($event)"
            (pageSizeChange)="onPageSizeChange($event)"
          ></app-pagination>
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
              <ion-item fill="outline" class="form-item ion-margin-bottom">
                <ion-select
                  label="Inspection Sign-off Decision *"
                  labelPlacement="floating"
                  interface="popover"
                  [interfaceOptions]="{ cssClass: 'custom-popover' }"
                  formControlName="approveToSellable"
                >
                  <ion-select-option [value]="true">Approve & Restock to Available Inventory</ion-select-option>
                  <ion-select-option [value]="false">Reject & Dispose as Damaged</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item lines="inset" class="form-item ion-margin-bottom">
                <ion-input
                  id="inspect-notes"
                  name="inspectionNotes"
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

      <!-- Process New Sale Return Modal -->
      <ion-modal [isOpen]="isCreateReturnModalOpen()" class="large-form-modal">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>Process Sale Return & Quarantine Intake</ion-title>
              <ion-button slot="end" fill="clear" color="light" (click)="closeCreateReturnModal()">
                <ion-icon name="close-outline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-toolbar>
          </ion-header>

          <ion-content class="ion-padding modal-content">
            <form [formGroup]="createReturnForm" (ngSubmit)="submitCreateReturn()">
              <ion-grid class="ion-no-padding">
                <ion-row>
                  <ion-col size="12" size-md="6">
                    <app-searchable-select
                      label="Select Original Sale Invoice *"
                      placeholder="Search invoice number or customer..."
                      [options]="saleInvoiceOptions()"
                      formControlName="saleId"
                      (optionSelected)="onSaleSelected($event)"
                    ></app-searchable-select>
                  </ion-col>
                  <ion-col size="12" size-md="6">
                    <ion-item fill="outline" class="form-item">
                      <ion-select
                        label="Refund Payment Method *"
                        labelPlacement="floating"
                        interface="popover"
                        [interfaceOptions]="{ cssClass: 'custom-popover' }"
                        formControlName="refundMethod"
                      >
                        <ion-select-option value="CASH">Cash</ion-select-option>
                        <ion-select-option value="UPI">UPI / Bank Transfer</ion-select-option>
                        <ion-select-option value="CARD">Card Reversal</ion-select-option>
                      </ion-select>
                    </ion-item>
                  </ion-col>
                </ion-row>

                <ion-row class="ion-margin-top">
                  <ion-col size="12">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        id="return-reason"
                        name="reason"
                        label="Customer Reason for Return *"
                        labelPlacement="floating"
                        placeholder="e.g. Doctor adjusted dosage, unopened pack, sealed vial"
                        formControlName="reason"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                </ion-row>
              </ion-grid>

              <!-- Select Items from Invoice to Return -->
              <div *ngIf="selectedSaleItems().length > 0" class="ion-margin-top">
                <h4 class="return-section-title">Select Items to Return from Invoice</h4>
                <div class="table-responsive">
                  <table class="batch-items-table">
                    <thead>
                      <tr>
                        <th>Select</th>
                        <th>Medicine</th>
                        <th>Batch #</th>
                        <th class="ion-text-right">Billed Qty</th>
                        <th class="ion-text-right">Prev. Returned</th>
                        <th class="ion-text-right">Return Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let it of selectedSaleItems(); let idx = index">
                        <td>
                          <input
                            type="checkbox"
                            [checked]="isItemReturnSelected(it.id)"
                            [disabled]="(it.quantity - (it.returnedQuantity || 0)) <= 0"
                            (change)="toggleReturnItemSelection(it, $event)"
                          />
                        </td>
                        <td>
                          <strong>{{ it.medicine?.name }}</strong>
                          <div *ngIf="(it.quantity - (it.returnedQuantity || 0)) <= 0" class="sub-text text-danger" style="color: #ef4444; font-size: 0.75rem;">Fully returned</div>
                        </td>
                        <td class="font-mono">{{ it.batch?.batchNumber }}</td>
                        <td class="ion-text-right font-bold">{{ it.quantity }} <small style="color: #64748b;">{{ it.saleUnit || it.medicine?.baseUnit || '' }}</small></td>
                        <td class="ion-text-right text-muted">{{ it.returnedQuantity || 0 }} <small style="color: #94a3b8;">{{ it.saleUnit || it.medicine?.baseUnit || '' }}</small></td>
                        <td class="ion-text-right">
                          <input
                            type="number"
                            min="1"
                            [max]="it.quantity - (it.returnedQuantity || 0)"
                            [value]="getReturnItemQty(it.id)"
                            [disabled]="!isItemReturnSelected(it.id) || (it.quantity - (it.returnedQuantity || 0)) <= 0"
                            (change)="setReturnItemQty(it.id, $event)"
                            style="width: 70px; text-align: right; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px;"
                          />
                          <small style="color: #64748b; margin-left: 4px;">{{ it.saleUnit || it.medicine?.baseUnit || '' }}</small>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div *ngIf="!selectedSaleItems().length && createReturnForm.get('saleId')?.value" class="ion-padding ion-text-center">
                <ion-spinner name="crescent"></ion-spinner>
                <p>Loading invoice line items...</p>
              </div>

              <ion-button
                expand="block"
                size="large"
                type="submit"
                color="primary"
                class="ion-margin-top"
                [disabled]="createReturnForm.invalid || isSubmitting() || returnItemsPayload().length === 0"
              >
                <ion-spinner *ngIf="isSubmitting()" name="crescent" slot="start"></ion-spinner>
                <span *ngIf="!isSubmitting()">Process Return & Quarantine Items</span>
              </ion-button>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>

      <!-- View Return Details Modal -->
      <ion-modal [isOpen]="isViewModalOpen()" class="sale-details-modal">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>Return Receipt: {{ viewingReturn()?.returnNumber }}</ion-title>
              <ion-button slot="end" fill="clear" color="light" (click)="closeViewModal()">
                <ion-icon name="close-outline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-toolbar>
          </ion-header>

          <ion-content class="ion-padding">
            <div *ngIf="viewingReturn()" class="return-summary-card">
              <div class="summary-grid">
                <div>
                  <span class="lbl">Return #:</span>
                  <strong class="font-mono">{{ viewingReturn()?.returnNumber }}</strong>
                </div>
                <div>
                  <span class="lbl">Return Date:</span>
                  <strong>{{ viewingReturn()?.returnDate | date:'medium' }}</strong>
                </div>
                <div>
                  <span class="lbl">Original Invoice:</span>
                  <strong class="font-mono">{{ viewingReturn()?.sale?.invoiceNumber }}</strong>
                </div>
                <div>
                  <span class="lbl">Refund Amount:</span>
                  <strong class="text-danger font-bold">₹{{ viewingReturn()?.totalRefundAmount }}</strong>
                </div>
                <div>
                  <span class="lbl">Refund Method:</span>
                  <ion-badge color="success">{{ viewingReturn()?.refundMethod }}</ion-badge>
                </div>
                <div>
                  <span class="lbl">Processed By:</span>
                  <strong>{{ viewingReturn()?.processedBy?.fullName }}</strong>
                </div>
              </div>

              <div class="reason-banner ion-margin-top">
                <strong>Reason: </strong> {{ viewingReturn()?.reason }}
              </div>

              <h4 class="return-section-title ion-margin-top">Quarantine & Inspection Status of Returned Items</h4>
              <div class="table-responsive">
                <table class="batch-items-table">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Batch Number</th>
                      <th class="ion-text-right">Qty</th>
                      <th>Disposition Status</th>
                      <th>Inspected By</th>
                      <th>Inspection Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let it of viewingReturn()?.items">
                      <td><strong>{{ it.saleItem?.medicine?.name }}</strong></td>
                      <td class="font-mono">{{ it.batch?.batchNumber }}</td>
                      <td class="ion-text-right font-bold">{{ it.quantityReturned }}</td>
                      <td>
                        <ion-badge
                          [color]="it.isInspected ? (it.initialStockDisposition === 'RESTOCKED_AFTER_INSPECTION' ? 'success' : 'danger') : 'warning'"
                        >
                          {{ it.initialStockDisposition }}
                        </ion-badge>
                      </td>
                      <td>{{ it.inspectedBy?.fullName || 'Pending' }}</td>
                      <td class="sub-text">{{ it.inspectionNotes || 'Awaiting sign-off' }}</td>
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
        position="top"
        cssClass="toast-top-right"
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
      .action-btn.view:hover {
        background: #eff6ff;
        border-color: #bfdbfe;
        color: #2563eb;
      }
      .sale-details-modal {
        --width: 880px;
        --max-width: 95vw;
        --height: 580px;
        --border-radius: 14px;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        background: #f8fafc;
        padding: 14px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
      }
      .summary-grid .lbl {
        display: block;
        font-size: 0.75rem;
        color: #64748b;
        text-transform: uppercase;
        font-weight: 600;
      }
      .reason-banner {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
        padding: 10px 14px;
        border-radius: 8px;
        font-size: 0.88rem;
      }
      .return-section-title {
        font-size: 0.95rem;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 8px;
      }
      .batch-items-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.84rem;
      }
      .batch-items-table th {
        background: #f1f5f9;
        padding: 8px 10px;
        text-align: left;
        color: #475569;
        font-weight: 600;
        border-bottom: 1px solid #cbd5e1;
      }
      .batch-items-table td {
        padding: 8px 10px;
        border-bottom: 1px solid #f1f5f9;
      }
      .sub-text {
        font-size: 0.8rem;
        color: #64748b;
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
  sales = signal<any[]>([]);
  isModalOpen = signal(false);
  isCreateReturnModalOpen = signal(false);
  isViewModalOpen = signal(false);
  isSubmitting = signal(false);
  activeInspectionItem = signal<any | null>(null);
  viewingReturn = signal<any | null>(null);
  toastMessage = signal<string | null>(null);

  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);

  paginatedReturns = computed<any[]>(() => {
    const list = this.returns();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  onPageSizeChange(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  selectedSaleItems = signal<any[]>([]);
  returnSelections = signal<{ [saleItemId: string]: number }>({});

  inspectionForm: FormGroup;
  createReturnForm: FormGroup;

  saleInvoiceOptions = computed<SearchableOption[]>(() => {
    return this.sales().map((s) => {
      const cust = s.customer?.name || s.patientName || 'Walk-in Customer';
      const saleDate = s.saleDate || s.createdAt;
      const dateFormatted = saleDate ? new Date(saleDate).toLocaleDateString() : 'Recent';
      const primaryMethod = s.payments?.[0]?.paymentMethod || s.paymentMethod || 'CASH';
      return {
        id: s.id,
        label: `${s.invoiceNumber} - ${cust} (₹${s.grandTotal})`,
        subLabel: `Date: ${dateFormatted} | Paid via ${primaryMethod}`,
      };
    });
  });

  returnItemsPayload = computed(() => {
    const selections = this.returnSelections();
    return Object.entries(selections)
      .filter(([_, qty]) => qty > 0)
      .map(([saleItemId, quantity]) => ({
        saleItemId,
        quantity,
      }));
  });

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
      eyeOutline,
      addOutline,
    });

    this.inspectionForm = this.fb.group({
      approveToSellable: [true, Validators.required],
      inspectionNotes: ['', Validators.required],
    });

    this.createReturnForm = this.fb.group({
      saleId: ['', Validators.required],
      refundMethod: ['CASH', Validators.required],
      reason: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.loadReturns();
    this.loadSales();
  }

  loadReturns() {
    this.apiService.getReturns().subscribe({
      next: (res) => this.returns.set(res || []),
      error: (err) => this.toastMessage.set(err.error?.message || 'Failed to load returns'),
    });
  }

  loadSales() {
    this.apiService.getSales({ limit: 100 }).subscribe({
      next: (res: any) => {
        const list = res?.items || res?.data || (Array.isArray(res) ? res : []);
        this.sales.set(list);
      },
      error: () => {},
    });
  }

  openCreateReturnModal() {
    this.createReturnForm.reset({
      saleId: '',
      refundMethod: 'CASH',
      reason: '',
    });
    this.selectedSaleItems.set([]);
    this.returnSelections.set({});
    this.isCreateReturnModalOpen.set(true);
    this.loadSales();
  }

  closeCreateReturnModal() {
    this.isCreateReturnModalOpen.set(false);
  }

  onSaleSelected(option: SearchableOption) {
    const saleId = option.id;
    this.createReturnForm.patchValue({ saleId });
    this.selectedSaleItems.set([]);
    this.returnSelections.set({});

    this.apiService.getSale(saleId).subscribe({
      next: (sale) => {
        const items = sale.items || [];
        this.selectedSaleItems.set(items);
        // Default select all eligible items with remaining returnable quantity
        const initialSelections: { [id: string]: number } = {};
        items.forEach((it: any) => {
          const eligibleQty = Math.max(0, it.quantity - (it.returnedQuantity || 0));
          if (eligibleQty > 0) {
            initialSelections[it.id] = eligibleQty;
          }
        });
        this.returnSelections.set(initialSelections);
      },
      error: (err) => {
        this.toastMessage.set(err.error?.message || 'Failed to load sale invoice line items.');
      },
    });
  }

  isItemReturnSelected(saleItemId: string): boolean {
    return (this.returnSelections()[saleItemId] || 0) > 0;
  }

  getReturnItemQty(saleItemId: string): number {
    return this.returnSelections()[saleItemId] || 1;
  }

  toggleReturnItemSelection(item: any, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const current = { ...this.returnSelections() };
    const maxQty = Math.max(1, item.quantity - (item.returnedQuantity || 0));
    if (checked) {
      current[item.id] = maxQty;
    } else {
      delete current[item.id];
    }
    this.returnSelections.set(current);
  }

  setReturnItemQty(saleItemId: string, event: Event) {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    const current = { ...this.returnSelections() };
    if (!isNaN(val) && val > 0) {
      current[saleItemId] = val;
    } else {
      delete current[saleItemId];
    }
    this.returnSelections.set(current);
  }

  submitCreateReturn() {
    if (this.createReturnForm.invalid || this.returnItemsPayload().length === 0) return;

    this.isSubmitting.set(true);
    const payload = {
      saleId: this.createReturnForm.value.saleId,
      refundMethod: this.createReturnForm.value.refundMethod,
      reason: this.createReturnForm.value.reason,
      items: this.returnItemsPayload(),
    };

    this.apiService.processReturn(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastMessage.set('Return processed successfully. Items placed in quarantine.');
        this.closeCreateReturnModal();
        this.loadReturns();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toastMessage.set(err.error?.message || 'Failed to process return.');
      },
    });
  }

  viewReturnDetails(returnId: string) {
    this.apiService.getReturn(returnId).subscribe({
      next: (ret) => {
        this.viewingReturn.set(ret);
        this.isViewModalOpen.set(true);
      },
      error: (err) => {
        this.toastMessage.set(err.error?.message || 'Failed to load return details.');
      },
    });
  }

  closeViewModal() {
    this.isViewModalOpen.set(false);
    this.viewingReturn.set(null);
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
