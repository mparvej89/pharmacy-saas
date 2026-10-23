import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
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
  IonGrid,
  IonRow,
  IonCol,
  IonMenuButton,
  IonButtons,
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
  gitBranchOutline,
  listOutline,
  searchOutline,
  chevronBackOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { ApiService } from '../../core/services/api.service';
import { SearchableSelectComponent, SearchableOption } from '../../shared/components/searchable-select.component';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SearchableSelectComponent,
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
        <ion-title>Inventory & FEFO</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="outline" color="light" (click)="openFefoModal()">
            <ion-icon name="git-branch-outline" slot="start"></ion-icon>
            FEFO Test
          </ion-button>
          <ion-button fill="solid" color="light" (click)="openAdjustmentModal()">
            <ion-icon name="create-outline" slot="start"></ion-icon>
            Adjust Stock
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <ion-toolbar>
        <ion-segment [value]="activeTab()" (ionChange)="onTabChange($event)">
          <ion-segment-button value="batches">
            <ion-label>All Batches</ion-label>
          </ion-segment-button>
          <ion-segment-button value="low-stock">
            <ion-label>Low Stock</ion-label>
          </ion-segment-button>
          <ion-segment-button value="expiring">
            <ion-label>Expiring</ion-label>
          </ion-segment-button>
          <ion-segment-button value="ledger">
            <ion-label>Ledger</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding inventory-content">
      <!-- Filter & Search Toolbar -->
      <div class="inventory-filter-bar ion-margin-bottom">
        <div class="search-box">
          <ion-icon name="search-outline"></ion-icon>
          <input
            type="text"
            placeholder="Search medicine, batch, rack or movement..."
            [value]="searchQuery()"
            (input)="onSearchChange($event)"
          />
        </div>
        <div class="page-size-selector">
          <span class="size-lbl">Show:</span>
          <select [value]="pageSize()" (change)="onPageSizeChange($event)">
            <option [value]="5">5</option>
            <option [value]="10">10</option>
            <option [value]="25">25</option>
            <option [value]="50">50</option>
          </select>
          <span class="size-lbl">per page</span>
        </div>
      </div>

      <!-- 1. All Batches Table -->
      <ion-card class="table-card" *ngIf="activeTab() === 'batches'">
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
                <tr *ngFor="let b of paginatedItems()">
                  <td>
                    <strong>{{ b.medicine?.name }}</strong>
                    <div class="sub-text">{{ b.medicine?.genericName }}</div>
                  </td>
                  <td class="font-mono">{{ b.batchNumber }}</td>
                  <td class="font-mono">{{ b.expiryDate | date:'mediumDate' }}</td>
                  <td>
                    <span class="stock-badge font-bold">
                      {{ b.quantityAvailable }} {{ b.medicine?.baseUnit || '' }}
                    </span>
                    <div *ngIf="formatPackBreakdown(b.quantityAvailable, b.medicine?.conversionFactor, b.medicine?.purchaseUnit, b.medicine?.baseUnit)" style="font-size: 0.72rem; color: #64748b; margin-top: 2px;">
                      {{ formatPackBreakdown(b.quantityAvailable, b.medicine?.conversionFactor, b.medicine?.purchaseUnit, b.medicine?.baseUnit) }}
                    </div>
                  </td>
                  <td>
                    <span *ngIf="b.quantityQuarantined > 0" class="badge-quarantine">
                      {{ b.quantityQuarantined }} {{ b.medicine?.baseUnit || '' }}
                    </span>
                    <span *ngIf="b.quantityQuarantined === 0">-</span>
                  </td>
                  <td>
                    <span *ngIf="b.quantityDamaged > 0" class="badge-damaged">
                      {{ b.quantityDamaged }} {{ b.medicine?.baseUnit || '' }}
                    </span>
                    <span *ngIf="b.quantityDamaged === 0">-</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      class="rack-btn"
                      [class.unassigned]="!b.rackLocation"
                      (click)="openRackModal(b)"
                      title="Click to assign or change rack location"
                    >
                      <ion-icon name="create-outline" class="rack-icon"></ion-icon>
                      <span>{{ b.rackLocation || 'Assign Rack' }}</span>
                    </button>
                  </td>
                  <td>₹{{ b.sellingPrice }}</td>
                  <td>
                    <ion-badge color="success" *ngIf="b.status === 'ACTIVE'">ACTIVE</ion-badge>
                    <ion-badge color="warning" *ngIf="b.status === 'QUARANTINED'">QUARANTINED</ion-badge>
                    <ion-badge color="danger" *ngIf="b.status === 'EXPIRED'">EXPIRED</ion-badge>
                  </td>
                </tr>
                <tr *ngIf="!filteredItems().length">
                  <td colspan="9" class="ion-text-center ion-padding">
                    No matching inventory batches found.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer -->
          <div class="pagination-footer" *ngIf="filteredItems().length > 0">
            <div class="pagination-info">
              Showing <strong>{{ paginationInfo().start }} - {{ paginationInfo().end }}</strong> of <strong>{{ paginationInfo().total }}</strong> batches
            </div>
            <div class="pagination-controls">
              <button
                type="button"
                class="page-nav-btn"
                [disabled]="currentPage() === 1"
                (click)="prevPage()"
                title="Previous Page"
              >
                <ion-icon name="chevron-back-outline"></ion-icon>
                <span>Prev</span>
              </button>
              <span class="page-current">Page {{ currentPage() }} of {{ totalPages() }}</span>
              <button
                type="button"
                class="page-nav-btn"
                [disabled]="currentPage() >= totalPages()"
                (click)="nextPage()"
                title="Next Page"
              >
                <span>Next</span>
                <ion-icon name="chevron-forward-outline"></ion-icon>
              </button>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- 2. Low Stock Alerts -->
      <ion-card class="table-card" *ngIf="activeTab() === 'low-stock'">
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
                <tr *ngFor="let l of paginatedItems()">
                  <td><strong>{{ l.name }}</strong></td>
                  <td>{{ l.genericName }}</td>
                  <td class="font-bold text-danger">
                    {{ l.currentStock }} {{ l.baseUnit || '' }}
                    <span *ngIf="formatPackBreakdown(l.currentStock, l.conversionFactor, l.purchaseUnit, l.baseUnit)" style="font-size: 0.74rem; font-weight: normal; color: #64748b;">
                      {{ formatPackBreakdown(l.currentStock, l.conversionFactor, l.purchaseUnit, l.baseUnit) }}
                    </span>
                  </td>
                  <td>{{ l.reorderLevel }} {{ l.baseUnit || '' }}</td>
                  <td class="text-danger font-bold">-{{ l.deficit }} {{ l.baseUnit || '' }}</td>
                  <td>
                    <ion-badge color="danger">REORDER NEEDED</ion-badge>
                  </td>
                </tr>
                <tr *ngIf="!filteredItems().length">
                  <td colspan="6" class="ion-text-center ion-padding">
                    All medicines are currently above reorder levels.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer -->
          <div class="pagination-footer" *ngIf="filteredItems().length > 0">
            <div class="pagination-info">
              Showing <strong>{{ paginationInfo().start }} - {{ paginationInfo().end }}</strong> of <strong>{{ paginationInfo().total }}</strong> items
            </div>
            <div class="pagination-controls">
              <button
                type="button"
                class="page-nav-btn"
                [disabled]="currentPage() === 1"
                (click)="prevPage()"
              >
                <ion-icon name="chevron-back-outline"></ion-icon>
                <span>Prev</span>
              </button>
              <span class="page-current">Page {{ currentPage() }} of {{ totalPages() }}</span>
              <button
                type="button"
                class="page-nav-btn"
                [disabled]="currentPage() >= totalPages()"
                (click)="nextPage()"
              >
                <span>Next</span>
                <ion-icon name="chevron-forward-outline"></ion-icon>
              </button>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- 3. Expiring Soon -->
      <ion-card class="table-card" *ngIf="activeTab() === 'expiring'">
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
                <tr *ngFor="let e of paginatedItems()">
                  <td><strong>{{ e.medicine?.name }}</strong></td>
                  <td class="font-mono">{{ e.batchNumber }}</td>
                  <td class="font-mono">{{ e.expiryDate | date:'mediumDate' }}</td>
                  <td class="font-bold" [class.text-danger]="e.isExpired">
                    {{ e.isExpired ? 'EXPIRED' : (e.daysRemaining + ' days') }}
                  </td>
                  <td>
                    <strong>{{ e.quantityAvailable }} {{ e.medicine?.baseUnit || '' }}</strong>
                    <div *ngIf="formatPackBreakdown(e.quantityAvailable, e.medicine?.conversionFactor, e.medicine?.purchaseUnit, e.medicine?.baseUnit)" style="font-size: 0.72rem; color: #64748b;">
                      {{ formatPackBreakdown(e.quantityAvailable, e.medicine?.conversionFactor, e.medicine?.purchaseUnit, e.medicine?.baseUnit) }}
                    </div>
                  </td>
                  <td>
                    <ion-badge color="danger" *ngIf="e.isExpired">EXPIRED</ion-badge>
                    <ion-badge color="warning" *ngIf="!e.isExpired">EXPIRING SOON</ion-badge>
                  </td>
                </tr>
                <tr *ngIf="!filteredItems().length">
                  <td colspan="6" class="ion-text-center ion-padding">
                    No batches expiring within the threshold.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer -->
          <div class="pagination-footer" *ngIf="filteredItems().length > 0">
            <div class="pagination-info">
              Showing <strong>{{ paginationInfo().start }} - {{ paginationInfo().end }}</strong> of <strong>{{ paginationInfo().total }}</strong> batches
            </div>
            <div class="pagination-controls">
              <button
                type="button"
                class="page-nav-btn"
                [disabled]="currentPage() === 1"
                (click)="prevPage()"
              >
                <ion-icon name="chevron-back-outline"></ion-icon>
                <span>Prev</span>
              </button>
              <span class="page-current">Page {{ currentPage() }} of {{ totalPages() }}</span>
              <button
                type="button"
                class="page-nav-btn"
                [disabled]="currentPage() >= totalPages()"
                (click)="nextPage()"
              >
                <span>Next</span>
                <ion-icon name="chevron-forward-outline"></ion-icon>
              </button>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- 4. Stock Movement Ledger -->
      <ion-card class="table-card" *ngIf="activeTab() === 'ledger'">
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
                <tr *ngFor="let m of paginatedItems()">
                  <td>{{ m.createdAt | date:'short' }}</td>
                  <td><strong>{{ m.medicine?.name }}</strong></td>
                  <td class="font-mono">{{ m.batch?.batchNumber }}</td>
                  <td>
                    <ion-badge [color]="m.quantityChange > 0 ? 'success' : 'medium'">
                      {{ m.movementType }}
                    </ion-badge>
                  </td>
                  <td class="font-bold" [class.text-success]="m.quantityChange > 0" [class.text-danger]="m.quantityChange < 0">
                    {{ m.quantityChange > 0 ? ('+' + m.quantityChange) : m.quantityChange }} {{ m.medicine?.baseUnit || '' }}
                  </td>
                  <td class="font-mono">{{ m.balanceAfter }} {{ m.medicine?.baseUnit || '' }}</td>
                  <td>{{ m.user?.fullName }}</td>
                  <td class="sub-text">{{ m.notes }}</td>
                </tr>
                <tr *ngIf="!filteredItems().length">
                  <td colspan="8" class="ion-text-center ion-padding">
                    No stock movements recorded yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer -->
          <div class="pagination-footer" *ngIf="filteredItems().length > 0">
            <div class="pagination-info">
              Showing <strong>{{ paginationInfo().start }} - {{ paginationInfo().end }}</strong> of <strong>{{ paginationInfo().total }}</strong> movements
            </div>
            <div class="pagination-controls">
              <button
                type="button"
                class="page-nav-btn"
                [disabled]="currentPage() === 1"
                (click)="prevPage()"
              >
                <ion-icon name="chevron-back-outline"></ion-icon>
                <span>Prev</span>
              </button>
              <span class="page-current">Page {{ currentPage() }} of {{ totalPages() }}</span>
              <button
                type="button"
                class="page-nav-btn"
                [disabled]="currentPage() >= totalPages()"
                (click)="nextPage()"
              >
                <span>Next</span>
                <ion-icon name="chevron-forward-outline"></ion-icon>
              </button>
            </div>
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
              <div class="ion-margin-bottom">
                <app-searchable-select
                  label="Select Batch to Adjust *"
                  placeholder="Type medicine name or batch number..."
                  [options]="batchOptions()"
                  formControlName="batchId"
                  (optionSelected)="onBatchOptionSelected($event)"
                ></app-searchable-select>
              </div>

              <ion-item fill="outline" class="form-item ion-margin-bottom">
                <ion-select
                  label="Adjustment Type"
                  labelPlacement="floating"
                  interface="popover"
                  [interfaceOptions]="{ cssClass: 'custom-popover' }"
                  formControlName="adjustmentType"
                >
                  <ion-select-option value="PHYSICAL_COUNT_VARIANCE">Physical Count Audit</ion-select-option>
                  <ion-select-option value="DAMAGE">Damaged / Broken Vial</ion-select-option>
                  <ion-select-option value="INCREASE">Found Unrecorded Stock</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item lines="inset" class="form-item ion-margin-bottom">
                <ion-input
                  id="adj-quantity"
                  name="adjustedQuantity"
                  label="New Physical Count Quantity *"
                  labelPlacement="stacked"
                  type="number"
                  formControlName="adjustedQuantity"
                ></ion-input>
              </ion-item>

              <ion-item lines="inset" class="form-item ion-margin-bottom">
                <ion-input
                  id="adj-reason"
                  name="reason"
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

      <!-- Quick Rack Assignment Modal -->
      <ion-modal [isOpen]="isRackModalOpen()" class="rack-modal">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>Assign Rack Location</ion-title>
              <ion-button slot="end" fill="clear" (click)="closeRackModal()">
                <ion-icon name="close-outline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-toolbar>
          </ion-header>

          <ion-content class="ion-padding modal-content">
            <div *ngIf="selectedBatchForRack() as batch" class="rack-details-box ion-margin-bottom">
              <div class="font-bold text-dark">{{ batch.medicine?.name }}</div>
              <div class="sub-text">Batch: {{ batch.batchNumber }} | Current Stock: {{ batch.quantityAvailable }}</div>
            </div>

            <form (ngSubmit)="saveRackLocation()">
              <ion-item lines="inset" class="form-item ion-margin-bottom">
                <ion-input
                  id="rack-location-input"
                  name="rackLocation"
                  label="Rack / Shelf Code *"
                  labelPlacement="stacked"
                  placeholder="e.g. Shelf A1-R2, Rack B3, Cold-Storage"
                  [(ngModel)]="newRackValue"
                  [ngModelOptions]="{standalone: true}"
                  autofocus="true"
                ></ion-input>
              </ion-item>

              <ion-button
                expand="block"
                size="large"
                type="submit"
                color="primary"
                [disabled]="!newRackValue.trim() || isSubmitting()"
              >
                <ion-spinner *ngIf="isSubmitting()" name="crescent" slot="start"></ion-spinner>
                <span *ngIf="!isSubmitting()">Save Rack Location</span>
              </ion-button>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>

      <!-- 3. FEFO Allocation Simulator Modal -->
      <ion-modal [isOpen]="isFefoModalOpen()" class="fefo-modal">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>FEFO Allocation Simulator</ion-title>
              <ion-button slot="end" fill="clear" color="light" (click)="closeFefoModal()">
                <ion-icon name="close-outline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-toolbar>
          </ion-header>

          <ion-content class="ion-padding">
            <p class="fefo-desc">
              Test how the backend First-Expiry First-Out (FEFO) engine allocates batches across available stock for a given medicine and sales quantity.
            </p>

            <div class="fefo-controls ion-margin-bottom">
              <ion-grid class="ion-no-padding">
                <ion-row>
                  <ion-col size="12" size-md="8">
                    <app-searchable-select
                      label="Select Medicine *"
                      placeholder="Search medicine to test FEFO..."
                      [options]="medicineOptions()"
                      [formControl]="fefoMedicineControl"
                    ></app-searchable-select>
                  </ion-col>
                  <ion-col size="8" size-md="3">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        id="fefo-qty"
                        name="fefoQty"
                        type="number"
                        [label]="'Requested Qty (' + (getSelectedFefoMedicine()?.baseUnit || 'units') + ')'"
                        labelPlacement="floating"
                        [formControl]="fefoQuantityControl"
                        min="1"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="4" size-md="1" class="ion-align-self-center ion-text-center">
                    <ion-button (click)="runFefoPreview()" [disabled]="!fefoMedicineControl.value || isFefoLoading()">
                      <ion-spinner *ngIf="isFefoLoading()" name="crescent"></ion-spinner>
                      <span *ngIf="!isFefoLoading()">Run</span>
                    </ion-button>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </div>

            <!-- FEFO Simulation Output Results -->
            <div *ngIf="fefoResults() !== null" class="fefo-results-card">
              <div class="fefo-results-header">
                <strong>Simulated Allocation Plan</strong>
                <ion-badge color="primary">Requested: {{ fefoQuantityControl.value }} {{ getSelectedFefoMedicine()?.baseUnit || 'units' }}</ion-badge>
              </div>

              <div class="table-responsive ion-margin-top" *ngIf="fefoResults()?.length">
                <table class="pharmacy-table">
                  <thead>
                    <tr>
                      <th>Batch Number</th>
                      <th>Expiry Date</th>
                      <th>Rack Location</th>
                      <th class="ion-text-right">Available in Batch</th>
                      <th class="ion-text-right">Allocated Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let alloc of fefoResults()">
                      <td class="font-mono font-bold">{{ alloc.batchNumber }}</td>
                      <td class="font-mono">{{ alloc.expiryDate | date:'mediumDate' }}</td>
                      <td>
                        <span class="rack-badge">{{ alloc.rackLocation || 'Unassigned' }}</span>
                      </td>
                      <td class="ion-text-right">
                        {{ alloc.availableInBatch }} {{ alloc.baseUnit || '' }}
                        <div *ngIf="formatPackBreakdown(alloc.availableInBatch, alloc.conversionFactor, alloc.purchaseUnit, alloc.baseUnit)" style="font-size: 0.72rem; color: #64748b;">
                          {{ formatPackBreakdown(alloc.availableInBatch, alloc.conversionFactor, alloc.purchaseUnit, alloc.baseUnit) }}
                        </div>
                      </td>
                      <td class="ion-text-right font-bold text-success">
                        +{{ alloc.quantityToDeduct || alloc.allocatedQuantity }} {{ alloc.baseUnit || '' }}
                        <div *ngIf="formatPackBreakdown(alloc.quantityToDeduct || alloc.allocatedQuantity, alloc.conversionFactor, alloc.purchaseUnit, alloc.baseUnit)" style="font-size: 0.72rem; font-weight: normal;">
                          {{ formatPackBreakdown(alloc.quantityToDeduct || alloc.allocatedQuantity, alloc.conversionFactor, alloc.purchaseUnit, alloc.baseUnit) }}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div *ngIf="!fefoResults()?.length" class="empty-fefo ion-padding ion-text-center">
                <p>No active unexpired batches available for this medicine.</p>
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
      .inventory-filter-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        background: #ffffff;
        padding: 10px 16px;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
      }
      .search-box {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        padding: 6px 12px;
        border-radius: 8px;
        flex: 1;
        max-width: 420px;
      }
      .search-box ion-icon {
        color: #64748b;
        font-size: 18px;
      }
      .search-box input {
        border: none;
        outline: none;
        background: transparent;
        font-size: 0.88rem;
        width: 100%;
        color: #0f172a;
      }
      .page-size-selector {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.84rem;
        color: #475569;
      }
      .page-size-selector select {
        padding: 4px 8px;
        border-radius: 6px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        font-size: 0.84rem;
        outline: none;
        cursor: pointer;
      }
      .pagination-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        flex-wrap: wrap;
        gap: 12px;
      }
      .pagination-info {
        font-size: 0.84rem;
        color: #64748b;
      }
      .pagination-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .page-nav-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        padding: 5px 10px;
        border-radius: 6px;
        font-size: 0.82rem;
        font-weight: 600;
        color: #334155;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .page-nav-btn:hover:not(:disabled) {
        background: #f1f5f9;
        border-color: #94a3b8;
        color: #0284c7;
      }
      .page-nav-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .page-current {
        font-size: 0.82rem;
        font-weight: 600;
        color: #475569;
        padding: 0 4px;
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
      .rack-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #f1f5f9;
        color: #0f172a;
        border: 1px solid #cbd5e1;
        padding: 5px 10px;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .rack-btn:hover {
        background: #e2e8f0;
        border-color: #94a3b8;
      }
      .rack-btn.unassigned {
        background: #fffbeb;
        border-color: #fde68a;
        color: #b45309;
      }
      .rack-btn.unassigned:hover {
        background: #fef3c7;
      }
      .rack-icon {
        font-size: 14px;
      }
      .rack-modal {
        --width: 480px;
        --max-width: 90vw;
        --height: 320px;
        --border-radius: 12px;
      }
      .rack-details-box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 10px 14px;
        border-radius: 8px;
      }
      .fefo-modal {
        --width: 780px;
        --max-width: 95vw;
        --height: 580px;
        --border-radius: 14px;
      }
      .fefo-desc {
        font-size: 0.88rem;
        color: #64748b;
        margin-top: 0;
        margin-bottom: 16px;
        line-height: 1.45;
      }
      .fefo-results-card {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        padding: 16px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }
      .fefo-results-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 10px;
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
    `,
  ],
})
export class InventoryComponent implements OnInit {
  Math = Math;
  activeTab = signal<string>('batches');
  batches = signal<any[]>([]);
  lowStock = signal<any[]>([]);
  expiringBatches = signal<any[]>([]);
  ledger = signal<any[]>([]);

  formatPackBreakdown(qty: number, conversionFactor?: number, purchaseUnit?: string, baseUnit?: string): string {
    const factor = conversionFactor || 1;
    if (factor <= 1 || qty <= 0) return '';
    const packs = Math.floor(qty / factor);
    const loose = qty % factor;
    const pUnit = purchaseUnit || 'Pack';
    const bUnit = baseUnit || 'units';
    if (packs > 0 && loose > 0) {
      return `(${packs} ${pUnit} + ${loose} ${bUnit})`;
    } else if (packs > 0) {
      return `(${packs} ${pUnit})`;
    }
    return '';
  }

  batchOptions = computed<SearchableOption[]>(() => {
    return this.batches().map((b) => ({
      id: b.id,
      label: `${b.medicine?.name} (Batch: ${b.batchNumber})`,
      subLabel: `Stock: ${b.quantityAvailable} ${b.medicine?.baseUnit || ''} ${this.formatPackBreakdown(b.quantityAvailable, b.medicine?.conversionFactor, b.medicine?.purchaseUnit, b.medicine?.baseUnit)} | Exp: ${new Date(b.expiryDate).toLocaleDateString('en-IN')} | MRP: ₹${b.mrp}`,
    }));
  });

  medicines = signal<any[]>([]);

  medicineOptions = computed<SearchableOption[]>(() => {
    return this.medicines().map((m) => ({
      id: m.id,
      label: m.name,
      subLabel: `HSN: ${m.hsnCode} | Pack: ${m.packSize} ${m.unitOfMeasure} | GST: ${m.gstRate}%`,
    }));
  });

  isModalOpen = signal(false);
  isSubmitting = signal(false);
  toastMessage = signal<string | null>(null);

  // Pagination & Filtering state
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Computed filtered list for active tab
  filteredItems = computed<any[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const tab = this.activeTab();
    let list: any[] = [];
    if (tab === 'batches') {
      list = this.batches();
      if (q) {
        list = list.filter((b) =>
          (b.medicine?.name || '').toLowerCase().includes(q) ||
          (b.medicine?.genericName || '').toLowerCase().includes(q) ||
          (b.batchNumber || '').toLowerCase().includes(q) ||
          (b.rackLocation || '').toLowerCase().includes(q)
        );
      }
    } else if (tab === 'low-stock') {
      list = this.lowStock();
      if (q) {
        list = list.filter((l) =>
          (l.name || '').toLowerCase().includes(q) ||
          (l.genericName || '').toLowerCase().includes(q)
        );
      }
    } else if (tab === 'expiring') {
      list = this.expiringBatches();
      if (q) {
        list = list.filter((e) =>
          (e.medicine?.name || '').toLowerCase().includes(q) ||
          (e.batchNumber || '').toLowerCase().includes(q)
        );
      }
    } else if (tab === 'ledger') {
      list = this.ledger();
      if (q) {
        list = list.filter((m) =>
          (m.medicine?.name || '').toLowerCase().includes(q) ||
          (m.batch?.batchNumber || '').toLowerCase().includes(q) ||
          (m.movementType || '').toLowerCase().includes(q) ||
          (m.notes || '').toLowerCase().includes(q) ||
          (m.user?.fullName || '').toLowerCase().includes(q)
        );
      }
    }
    return list;
  });

  // Total pages based on filtered items
  totalPages = computed<number>(() => {
    const total = this.filteredItems().length;
    return Math.max(1, Math.ceil(total / this.pageSize()));
  });

  // Paginated items slice
  paginatedItems = computed<any[]>(() => {
    const items = this.filteredItems();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return items.slice(start, start + size);
  });

  // Item count range for display (e.g. 1 - 10 of 42)
  paginationInfo = computed<{ start: number; end: number; total: number }>(() => {
    const total = this.filteredItems().length;
    if (total === 0) return { start: 0, end: 0, total: 0 };
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), total);
    return { start, end, total };
  });

  onSearchChange(event: any) {
    this.searchQuery.set(event.target.value || '');
    this.currentPage.set(1);
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
    }
  }

  onPageSizeChange(event: any) {
    const size = Number(event.target.value) || 10;
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

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
      gitBranchOutline,
      searchOutline,
      chevronBackOutline,
      chevronForwardOutline,
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

  onTabChange(event?: any) {
    if (event?.detail?.value) {
      this.activeTab.set(event.detail.value);
    }
    this.currentPage.set(1);
    this.searchQuery.set('');
    this.loadData();
  }

  loadData() {
    const tab = this.activeTab();
    if (tab === 'batches') {
      this.apiService.getBatches().subscribe((res) => this.batches.set(res));
    } else if (tab === 'low-stock') {
      this.apiService.getLowStock().subscribe((res) => this.lowStock.set(res));
    } else if (tab === 'expiring') {
      this.apiService.getExpiringBatches(90).subscribe((res) => this.expiringBatches.set(res));
    } else if (tab === 'ledger') {
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

  onBatchOptionSelected(opt: SearchableOption) {
    const selected = this.batches().find((b) => b.id === opt.id);
    if (selected) {
      this.adjustmentForm.patchValue({
        batchId: selected.id,
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

  // Quick Rack Assignment
  isRackModalOpen = signal(false);
  selectedBatchForRack = signal<any | null>(null);
  newRackValue = '';

  openRackModal(batch: any) {
    this.selectedBatchForRack.set(batch);
    this.newRackValue = batch.rackLocation || '';
    this.isRackModalOpen.set(true);
  }

  closeRackModal() {
    this.isRackModalOpen.set(false);
    this.selectedBatchForRack.set(null);
    this.newRackValue = '';
  }

  saveRackLocation() {
    const batch = this.selectedBatchForRack();
    const val = this.newRackValue.trim();
    if (!batch || !val) return;

    this.isSubmitting.set(true);
    this.apiService.updateBatchRack(batch.id, val).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastMessage.set(`Rack location updated to "${val.toUpperCase()}"`);
        this.closeRackModal();
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toastMessage.set(err.error?.message || 'Failed to update rack location.');
      },
    });
  }

  // FEFO Simulator
  isFefoModalOpen = signal(false);
  isFefoLoading = signal(false);
  fefoMedicineControl = new FormControl('');
  fefoQuantityControl = new FormControl(10);
  fefoResults = signal<any[] | null>(null);

  openFefoModal() {
    this.apiService.getMedicines().subscribe((res) => {
      this.medicines.set(res.items || []);
    });
    this.fefoResults.set(null);
    this.isFefoModalOpen.set(true);
  }

  closeFefoModal() {
    this.isFefoModalOpen.set(false);
    this.fefoResults.set(null);
  }

  getSelectedFefoMedicine(): any {
    const medId = this.fefoMedicineControl.value;
    if (!medId) return null;
    return this.medicines().find((m) => m.id === medId) || null;
  }

  runFefoPreview() {
    const medId = this.fefoMedicineControl.value;
    const qty = Number(this.fefoQuantityControl.value) || 1;
    if (!medId) return;

    this.isFefoLoading.set(true);
    this.apiService.getFefoPreview(medId, qty).subscribe({
      next: (results) => {
        this.isFefoLoading.set(false);
        this.fefoResults.set(results);
      },
      error: (err) => {
        this.isFefoLoading.set(false);
        this.toastMessage.set(err.error?.message || 'Failed to simulate FEFO allocation.');
      },
    });
  }
}
