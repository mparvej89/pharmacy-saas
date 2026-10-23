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
  bagAddOutline,
  checkmarkDoneOutline,
  closeOutline,
  addOutline,
  trashOutline,
  searchOutline,
  eyeOutline,
  closeCircleOutline,
  cubeOutline,
  cashOutline,
  medkitOutline,
} from 'ionicons/icons';
import { ApiService } from '../../core/services/api.service';
import { Medicine } from '../../core/models';
import { SearchableSelectComponent, SearchableOption } from '../../shared/components/searchable-select.component';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-purchases',
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
                <tr *ngFor="let p of paginatedPurchases()">
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
                    <div class="action-buttons-group">
                      <ion-button
                        size="small"
                        color="success"
                        *ngIf="p.status === 'DRAFT'"
                        (click)="postPurchase(p.id)"
                        title="Post to Stock Ledger"
                      >
                        <ion-icon name="checkmark-done-outline" slot="start"></ion-icon>
                        Post
                      </ion-button>
                      <button
                        type="button"
                        class="action-btn view"
                        (click)="viewPurchaseDetails(p.id)"
                        title="View Purchase Invoice & Batches"
                      >
                        <ion-icon name="eye-outline"></ion-icon>
                      </button>
                      <button
                        type="button"
                        class="action-btn cancel"
                        *ngIf="p.status !== 'CANCELLED'"
                        (click)="confirmCancelPurchase(p)"
                        title="Cancel Purchase Invoice"
                      >
                        <ion-icon name="close-circle-outline"></ion-icon>
                      </button>
                      <span *ngIf="p.status === 'POSTED'" class="posted-badge">
                        Credited
                      </span>
                      <span *ngIf="p.status === 'CANCELLED'" class="cancelled-badge">
                        Voided
                      </span>
                    </div>
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

          <app-pagination
            [totalItems]="purchases().length"
            [currentPage]="currentPage()"
            [pageSize]="pageSize()"
            [pageSizeOptions]="[10, 25, 50, 100]"
            itemLabel="invoices"
            (pageChange)="onPageChange($event)"
            (pageSizeChange)="onPageSizeChange($event)"
          ></app-pagination>
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
                    <app-searchable-select
                      label="Supplier *"
                      placeholder="Search supplier by name, phone or GSTIN..."
                      [options]="supplierOptions()"
                      formControlName="supplierId"
                    ></app-searchable-select>
                  </ion-col>
                  <ion-col size="12" sizeMd="4">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        id="purchase-invoice-number"
                        name="supplierInvoiceNumber"
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
                        id="purchase-invoice-date"
                        name="supplierInvoiceDate"
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
                      <!-- Clean 3-Tier Layout for each item -->
                      <!-- Header with Medicine Name and Remove -->
                      <div class="line-item-header">
                        <div class="med-identity">
                          <span class="item-number-tag">#{{ i + 1 }}</span>
                          <span class="med-name-label">
                            {{ getMedicineDisplayName(item.get('medicineId')?.value) || 'Select Medicine' }}
                          </span>
                        </div>
                        <button type="button" class="remove-line-btn" (click)="removeItemLine(i)" title="Remove this item">
                          <ion-icon name="trash-outline"></ion-icon>
                          <span>Remove</span>
                        </button>
                      </div>

                      <!-- Tier 1: Medicine Selection, Batch & Expiry -->
                      <div class="field-subgroup">
                        <div class="subgroup-title">
                          <ion-icon name="medkit-outline"></ion-icon>
                          <span>Product & Batch Details</span>
                        </div>
                        <ion-row>
                          <ion-col size="12" sizeMd="6">
                            <app-searchable-select
                              label="Medicine *"
                              placeholder="Search medicine by name or barcode..."
                              [options]="medicineOptions()"
                              formControlName="medicineId"
                              (optionSelected)="onMedicineSelected(i, $event)"
                            ></app-searchable-select>
                          </ion-col>
                          <ion-col size="6" sizeMd="3">
                            <ion-item fill="outline" class="form-item">
                              <ion-input
                                [id]="'purchase-batch-' + i"
                                name="batchNumber"
                                label="Batch Number *"
                                labelPlacement="floating"
                                formControlName="batchNumber"
                                placeholder="e.g. B2401"
                              ></ion-input>
                            </ion-item>
                          </ion-col>
                          <ion-col size="6" sizeMd="3">
                            <ion-item fill="outline" class="form-item">
                              <ion-input
                                [id]="'purchase-expiry-' + i"
                                name="expiryDate"
                                label="Expiry Date *"
                                labelPlacement="floating"
                                type="date"
                                formControlName="expiryDate"
                              ></ion-input>
                            </ion-item>
                          </ion-col>
                        </ion-row>
                      </div>

                      <!-- Tier 2: Quantity & Scheme/Bonus (The user-friendly section) -->
                      <div class="field-subgroup">
                        <div class="subgroup-title">
                          <ion-icon name="cube-outline"></ion-icon>
                          <span>Quantity & Scheme / Bonus</span>
                        </div>
                        <ion-row>
                          <ion-col size="6" sizeMd="3">
                            <ion-item fill="outline" class="form-item highlight-box">
                              <ion-input
                                [id]="'purchase-qty-' + i"
                                name="quantity"
                                [label]="'Purchased (' + (item.get('purchaseUnit')?.value || 'Packs') + ') *'"
                                labelPlacement="floating"
                                type="number"
                                formControlName="quantity"
                                placeholder="e.g. 1"
                              ></ion-input>
                            </ion-item>
                            <small class="field-hint">Quantity on supplier bill</small>
                          </ion-col>

                          <ion-col size="6" sizeMd="3">
                            <ion-item fill="outline" class="form-item">
                              <ion-input
                                [id]="'purchase-free-qty-' + i"
                                name="freeQuantity"
                                [label]="'Free (' + (item.get('purchaseUnit')?.value || 'Packs') + ')'"
                                labelPlacement="floating"
                                type="number"
                                formControlName="freeQuantity"
                                placeholder="0"
                              ></ion-input>
                            </ion-item>
                            <small class="field-hint">Full free boxes/packs</small>
                          </ion-col>

                          <ion-col size="6" sizeMd="3">
                            <ion-item fill="outline" class="form-item highlight-green">
                              <ion-input
                                [id]="'purchase-free-loose-' + i"
                                name="freeLooseQuantity"
                                [label]="'Free Loose (' + getMedicineBaseUnit(item.get('medicineId')?.value) + ')'"
                                labelPlacement="floating"
                                type="number"
                                formControlName="freeLooseQuantity"
                                placeholder="0"
                              ></ion-input>
                            </ion-item>
                            <small class="field-hint">Single bonus bottles/strips</small>
                          </ion-col>

                          <ion-col size="6" sizeMd="3">
                            <ion-item fill="outline" class="form-item">
                              <ion-input
                                [id]="'purchase-factor-' + i"
                                name="conversionFactor"
                                [label]="getMedicineBaseUnit(item.get('medicineId')?.value) + ' per ' + (item.get('purchaseUnit')?.value || 'Pack')"
                                labelPlacement="floating"
                                type="number"
                                formControlName="conversionFactor"
                                placeholder="12"
                              ></ion-input>
                            </ion-item>
                            <small class="field-hint">Pack size / conversion</small>
                          </ion-col>
                        </ion-row>

                        <!-- Clear Real-Time Total Stock Banner -->
                        <div class="stock-calc-banner ion-margin-top">
                          <div class="calc-left">
                            <span class="calc-tag">Stock Result</span>
                            <span class="calc-math">
                              {{ item.get('quantity')?.value || 0 }} {{ item.get('purchaseUnit')?.value || 'Packs' }} × {{ item.get('conversionFactor')?.value || 1 }}
                              <span *ngIf="item.get('freeQuantity')?.value"> + {{ item.get('freeQuantity')?.value }} Free Pack(s)</span>
                              <span *ngIf="item.get('freeLooseQuantity')?.value"> + {{ item.get('freeLooseQuantity')?.value }} Free {{ getMedicineBaseUnit(item.get('medicineId')?.value) }}</span>
                            </span>
                          </div>
                          <div class="calc-total">
                            <span class="total-lbl">Total Stock Credited:</span>
                            <span class="total-val">
                              {{ ((item.get('quantity')?.value || 0) + (item.get('freeQuantity')?.value || 0)) * (item.get('conversionFactor')?.value || 1) + (item.get('freeLooseQuantity')?.value || 0) }}
                              {{ getMedicineBaseUnit(item.get('medicineId')?.value) }}
                            </span>
                          </div>
                        </div>
                      </div>

                      <!-- Tier 3: Pricing, GST & Shelf -->
                      <div class="field-subgroup">
                        <div class="subgroup-title">
                          <ion-icon name="cash-outline"></ion-icon>
                          <span>Pricing & Location</span>
                        </div>
                        <ion-row>
                          <ion-col size="6" sizeMd="3">
                            <ion-item fill="outline" class="form-item">
                              <ion-input
                                [id]="'purchase-rate-' + i"
                                name="purchaseRate"
                                [label]="'Cost per ' + (item.get('purchaseUnit')?.value || 'Pack') + ' (₹) *'"
                                labelPlacement="floating"
                                type="number"
                                formControlName="purchaseRate"
                                placeholder="0.00"
                              ></ion-input>
                            </ion-item>
                          </ion-col>
                          <ion-col size="6" sizeMd="2">
                            <ion-item fill="outline" class="form-item">
                              <ion-input
                                [id]="'purchase-gst-' + i"
                                name="gstRate"
                                label="GST Rate (%) *"
                                labelPlacement="floating"
                                type="number"
                                formControlName="gstRate"
                                placeholder="5"
                              ></ion-input>
                            </ion-item>
                          </ion-col>
                          <ion-col size="6" sizeMd="2">
                            <ion-item fill="outline" class="form-item">
                              <ion-input
                                [id]="'purchase-mrp-' + i"
                                name="mrp"
                                [label]="'MRP/' + (item.get('purchaseUnit')?.value || 'Pack') + ' (₹) *'"
                                labelPlacement="floating"
                                type="number"
                                formControlName="mrp"
                                placeholder="0.00"
                              ></ion-input>
                            </ion-item>
                          </ion-col>
                          <ion-col size="6" sizeMd="3">
                            <ion-item fill="outline" class="form-item">
                              <ion-input
                                [id]="'purchase-selling-' + i"
                                name="sellingPrice"
                                [label]="'Selling Rate/' + (item.get('purchaseUnit')?.value || 'Pack') + ' (₹) *'"
                                labelPlacement="floating"
                                type="number"
                                formControlName="sellingPrice"
                                placeholder="0.00"
                              ></ion-input>
                            </ion-item>
                          </ion-col>
                          <ion-col size="6" sizeMd="2">
                            <ion-item fill="outline" class="form-item">
                              <ion-input
                                [id]="'purchase-rack-' + i"
                                name="rackLocation"
                                label="Rack / Shelf"
                                labelPlacement="floating"
                                formControlName="rackLocation"
                                placeholder="e.g. A1"
                              ></ion-input>
                            </ion-item>
                          </ion-col>
                        </ion-row>
                      </div>
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

      <!-- View Purchase Details Modal -->
      <ion-modal [isOpen]="isViewModalOpen()" class="details-modal">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>Purchase Invoice: {{ viewingPurchase()?.purchaseNumber }}</ion-title>
              <ion-button slot="end" fill="clear" color="light" (click)="closeViewModal()">
                <ion-icon name="close-outline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <div *ngIf="viewingPurchase()" class="invoice-summary-box">
              <div class="summary-grid">
                <div>
                  <span class="lbl">Supplier:</span>
                  <strong>{{ viewingPurchase()?.supplier?.name }}</strong>
                </div>
                <div>
                  <span class="lbl">Invoice #:</span>
                  <strong class="font-mono">{{ viewingPurchase()?.supplierInvoiceNumber }}</strong>
                </div>
                <div>
                  <span class="lbl">Invoice Date:</span>
                  <strong>{{ viewingPurchase()?.supplierInvoiceDate | date:'mediumDate' }}</strong>
                </div>
                <div>
                  <span class="lbl">Status:</span>
                  <ion-badge [color]="viewingPurchase()?.status === 'POSTED' ? 'success' : (viewingPurchase()?.status === 'CANCELLED' ? 'danger' : 'warning')">
                    {{ viewingPurchase()?.status }}
                  </ion-badge>
                </div>
                <div>
                  <span class="lbl">Total Amount:</span>
                  <strong class="text-primary font-bold">₹{{ viewingPurchase()?.totalAmount }}</strong>
                </div>
                <div>
                  <span class="lbl">Total Tax:</span>
                  <strong>₹{{ viewingPurchase()?.taxAmount }}</strong>
                </div>
              </div>

              <h4 class="items-heading ion-margin-top">Received Batch Line Items</h4>
              <div class="table-responsive">
                <table class="batch-items-table">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Batch #</th>
                      <th>Expiry</th>
                      <th>Rack / Shelf</th>
                      <th class="ion-text-right">Qty</th>
                      <th class="ion-text-right">Free</th>
                      <th class="ion-text-right">Rate</th>
                      <th class="ion-text-right">GST %</th>
                      <th class="ion-text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let it of viewingPurchase()?.items">
                      <td><strong>{{ it.medicine?.name }}</strong></td>
                      <td class="font-mono">{{ it.batchNumber }}</td>
                      <td>{{ it.expiryDate | date:'shortDate' }}</td>
                      <td>
                        <span class="rack-badge">{{ it.rackLocation || 'Unassigned' }}</span>
                      </td>
                      <td class="ion-text-right font-bold">{{ it.quantity }} <small style="color: #64748b; font-weight: normal;">{{ it.purchaseUnit || it.medicine?.purchaseUnit || 'Packs' }}</small></td>
                      <td class="ion-text-right">{{ it.freeQuantity || 0 }} <small *ngIf="it.freeQuantity > 0" style="color: #64748b;">{{ it.purchaseUnit || it.medicine?.purchaseUnit || 'Packs' }}</small></td>
                      <td class="ion-text-right">₹{{ it.purchaseRate }}</td>
                      <td class="ion-text-right">{{ it.gstRate }}%</td>
                      <td class="ion-text-right font-bold">₹{{ it.netAmount || it.totalAmount || (it.quantity * it.purchaseRate * (1 + (it.gstRate || 0)/100)) }}</td>
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
      .action-btn.cancel:hover {
        background: #fef2f2;
        border-color: #fecaca;
        color: #dc2626;
      }
      .posted-badge {
        font-size: 0.82rem;
        color: #16a34a;
        font-weight: 600;
      }
      .cancelled-badge {
        font-size: 0.82rem;
        color: #dc2626;
        font-weight: 600;
      }
      .details-modal {
        --width: 880px;
        --max-width: 95vw;
        --height: 580px;
        --border-radius: 14px;
      }
      .invoice-summary-box {
        background: #ffffff;
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
      .items-heading {
        font-size: 0.95rem;
        font-weight: 700;
        color: #0f172a;
        margin: 16px 0 8px 0;
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
      .rack-badge {
        display: inline-block;
        padding: 2px 6px;
        font-size: 0.75rem;
        font-weight: 600;
        border-radius: 4px;
        background: #f1f5f9;
        color: #475569;
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
        background: #ffffff;
        border-radius: 12px;
        border: 1px solid #cbd5e1;
        margin-top: 16px;
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
      }
      .line-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8fafc;
        padding: 10px 14px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        margin-bottom: 12px;
      }
      .med-identity {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .item-number-tag {
        background: #0284c7;
        color: #ffffff;
        font-weight: 700;
        font-size: 0.8rem;
        padding: 2px 8px;
        border-radius: 6px;
      }
      .med-name-label {
        font-weight: 700;
        font-size: 0.95rem;
        color: #0f172a;
      }
      .remove-line-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #fff1f2;
        border: 1px solid #fecdd3;
        color: #e11d48;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .remove-line-btn:hover {
        background: #ffe4e6;
        border-color: #fda4af;
      }
      .field-subgroup {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 10px;
      }
      .subgroup-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.76rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #475569;
        margin-bottom: 8px;
        padding-bottom: 4px;
        border-bottom: 1px solid #e2e8f0;
      }
      .subgroup-title ion-icon {
        font-size: 14px;
        color: #0284c7;
      }
      .field-hint {
        display: block;
        font-size: 0.72rem;
        color: #64748b;
        margin-top: 2px;
        padding-left: 4px;
      }
      .highlight-box {
        --background: #f0fdf4 !important;
        border: 1px solid #bbf7d0;
      }
      .highlight-green {
        --background: #eff6ff !important;
        border: 1px solid #bfdbfe;
      }
      .stock-calc-banner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        background: #f0fdf4;
        border: 1px solid #86efac;
        border-radius: 8px;
        padding: 10px 14px;
      }
      .calc-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .calc-tag {
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        background: #22c55e;
        color: #ffffff;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .calc-math {
        font-size: 0.84rem;
        color: #166534;
        font-weight: 500;
      }
      .calc-total {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .total-lbl {
        font-size: 0.82rem;
        font-weight: 600;
        color: #15803d;
      }
      .total-val {
        font-size: 1.05rem;
        font-weight: 800;
        color: #166534;
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
      .searchable-select-container {
        position: relative;
      }
      .supplier-search-input {
        --background: #ffffff;
        cursor: pointer;
      }
      .dropdown-popup {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        z-index: 9999;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        max-height: 260px;
        overflow-y: auto;
        margin-top: 4px;
      }
      .dropdown-searchbar {
        padding: 4px 6px;
        border-bottom: 1px solid #f1f5f9;
        --background: #f8fafc;
      }
      .dropdown-list {
        padding: 4px 0;
      }
      .dropdown-item {
        padding: 10px 14px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 2px;
        border-bottom: 1px solid #f8fafc;
        transition: background 0.15s ease;
      }
      .dropdown-item:hover, .dropdown-item.selected {
        background: #f0fdf4;
      }
      .dropdown-title {
        font-weight: 600;
        color: #0f172a;
        font-size: 0.9rem;
      }
      .dropdown-sub {
        font-size: 0.78rem;
        color: #64748b;
      }
      .dropdown-empty {
        padding: 16px;
        text-align: center;
        color: #94a3b8;
        font-size: 0.85rem;
      }
    `,
  ],
})
export class PurchasesComponent implements OnInit {
  purchases = signal<any[]>([]);
  suppliers = signal<any[]>([]);
  medicines = signal<Medicine[]>([]);

  medicineOptions = computed<SearchableOption[]>(() => {
    return this.medicines().map((m) => ({
      id: m.id,
      label: m.name,
      subLabel: `HSN: ${m.hsnCode} | Pack: ${m.packSize} ${m.unitOfMeasure} | GST: ${m.gstRate}%`,
    }));
  });

  supplierOptions = computed<SearchableOption[]>(() => {
    return this.suppliers().map((s) => ({
      id: s.id,
      label: s.name,
      subLabel: `GST: ${s.gstin || 'Unregistered'} | Tel: ${s.phone || 'N/A'}`,
    }));
  });

  isModalOpen = signal(false);
  isViewModalOpen = signal(false);
  viewingPurchase = signal<any | null>(null);
  isSubmitting = signal(false);
  toastMessage = signal<string | null>(null);

  currentPage = signal(1);
  pageSize = signal(10);

  paginatedPurchases = computed<any[]>(() => {
    const list = this.purchases();
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


  purchaseForm: FormGroup;

  get itemsFormArray() {
    return this.purchaseForm.get('items') as FormArray;
  }

  constructor(
    private apiService: ApiService,
    private fb: FormBuilder,
    private alertController: AlertController,
  ) {
    addIcons({
      bagAddOutline,
      checkmarkDoneOutline,
      closeOutline,
      addOutline,
      trashOutline,
      searchOutline,
      eyeOutline,
      closeCircleOutline,
      cubeOutline,
      cashOutline,
      medkitOutline,
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
    this.apiService.getSuppliers().subscribe((res) => {
      this.suppliers.set(res);
    });
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
      purchaseUnit: ['STRIP', Validators.required],
      conversionFactor: [10, [Validators.required, Validators.min(1)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      freeQuantity: [0, [Validators.required, Validators.min(0)]],
      freeLooseQuantity: [0, [Validators.required, Validators.min(0)]],
      purchaseRate: [0, [Validators.required, Validators.min(0)]],
      discountPercent: [0],
      gstRate: [5, [Validators.required, Validators.min(0)]],
      mrp: [0, [Validators.required, Validators.min(0)]],
      sellingPrice: [0, [Validators.required, Validators.min(0)]],
      rackLocation: [''],
    });
    this.itemsFormArray.push(line);
  }

  onMedicineSelected(index: number, option: SearchableOption) {
    const medId = option.id;
    const med = this.medicines().find((m) => m.id === medId);
    if (!med) return;

    const line = this.itemsFormArray.at(index);
    if (line) {
      line.patchValue({
        purchaseUnit: med.purchaseUnit || med.unitOfMeasure || 'STRIP',
        conversionFactor: med.conversionFactor || med.packSize || 10,
        gstRate: med.gstRate != null ? Number(med.gstRate) : 5,
        purchaseRate: med.purchaseCost != null ? Number(med.purchaseCost) : 0,
        mrp: med.mrp != null ? Number(med.mrp) : 0,
        sellingPrice: med.sellingPrice != null ? Number(med.sellingPrice) : 0,
      });
    }
  }

  getMedicineBaseUnit(medId: string): string {
    if (!medId) return 'units';
    const med = this.medicines().find((m) => m.id === medId);
    return med?.baseUnit || med?.unitOfMeasure || 'units';
  }

  getMedicineDisplayName(medId: string): string {
    if (!medId) return '';
    const med = this.medicines().find((m) => m.id === medId);
    return med ? med.name : '';
  }

  async removeItemLine(index: number) {
    if (this.itemsFormArray.length <= 1) {
      return;
    }

    const item = this.itemsFormArray.at(index);
    const medicineId = item.get('medicineId')?.value;
    const batchNumber = item.get('batchNumber')?.value;
    const med = this.medicines().find((m) => m.id === medicineId);
    const itemName = med ? med.name : (batchNumber ? `Batch #${batchNumber}` : `Item #${index + 1}`);

    const alert = await this.alertController.create({
      header: 'Delete Item',
      message: `Are you sure you want to delete "${itemName}" from this invoice?`,
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
            this.itemsFormArray.removeAt(index);
          },
        },
      ],
    });

    await alert.present();
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

  viewPurchaseDetails(id: string) {
    this.apiService.getPurchase(id).subscribe({
      next: (fullPurchase) => {
        this.viewingPurchase.set(fullPurchase);
        this.isViewModalOpen.set(true);
      },
      error: (err) => {
        this.toastMessage.set(err.error?.message || 'Failed to load purchase invoice.');
      },
    });
  }

  closeViewModal() {
    this.isViewModalOpen.set(false);
    this.viewingPurchase.set(null);
  }

  async confirmCancelPurchase(purchase: any) {
    const isPosted = purchase.status === 'POSTED';
    const alert = await this.alertController.create({
      header: isPosted ? 'Reverse & Cancel Purchase' : 'Cancel Purchase Draft',
      message: isPosted
        ? `Are you sure you want to cancel posted invoice ${purchase.supplierInvoiceNumber}? This will reverse the stock batches and update the inventory ledger.`
        : `Are you sure you want to cancel draft invoice ${purchase.supplierInvoiceNumber}?`,
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'Back',
          role: 'cancel',
          cssClass: 'alert-btn-cancel',
        },
        {
          text: isPosted ? 'Reverse & Cancel' : 'Cancel Purchase',
          role: 'destructive',
          cssClass: 'alert-btn-danger',
          handler: () => {
            this.cancelPurchase(purchase.id);
          },
        },
      ],
    });

    await alert.present();
  }

  cancelPurchase(id: string) {
    this.apiService.cancelPurchase(id, 'Cancelled by user').subscribe({
      next: () => {
        this.toastMessage.set('Purchase invoice cancelled.');
        this.loadData();
      },
      error: (err) => {
        this.toastMessage.set(err.error?.message || 'Failed to cancel purchase.');
      },
    });
  }
}
