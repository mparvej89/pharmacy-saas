import { Component, OnInit, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSearchbar,
  IonItem,
  IonButton,
  IonIcon,
  IonBadge,
  IonInput,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonToast,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  barcodeOutline,
  searchOutline,
  trashOutline,
  addOutline,
  removeOutline,
  cashOutline,
  cardOutline,
  printOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  closeOutline,
  personOutline,
  medkitOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Medicine, CartItem } from '../../core/models';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSearchbar,
    IonItem,
    IonButton,
    IonIcon,
    IonBadge,
    IonInput,
    IonModal,
    IonSelect,
    IonSelectOption,
    IonToast,
    IonSpinner,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>
          POS Terminal - {{ authService.activeStore()?.name || 'Pharmacy POS' }}
        </ion-title>
        <div slot="end" class="header-shortcuts ion-hide-sm-down">
          <span class="kbd-hint">F2 Search</span>
          <span class="kbd-hint">F8 Checkout</span>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="pos-content ion-padding">
      <ion-grid [fixed]="true" class="pos-grid">
        <ion-row>
          <!-- Left Column: Search & Cart Lines -->
          <ion-col size="12" size-lg="8">
            <!-- Search & Barcode Scan Bar -->
            <div class="search-box">
              <ion-searchbar
                id="pos-search-input"
                placeholder="Scan Barcode (Enter) or Search Medicine by Name, Generic, Brand..."
                [debounce]="250"
                (ionInput)="onSearchChange($event)"
                (keydown.enter)="onSearchEnter()"
                showClearButton="always"
              ></ion-searchbar>

              <!-- Live Autocomplete Dropdown -->
              <div class="search-dropdown" *ngIf="searchResults().length > 0">
                <div
                  *ngFor="let med of searchResults()"
                  class="search-item"
                  (click)="addToCart(med)"
                >
                  <div class="item-info">
                    <span class="item-name">{{ med.name }}</span>
                    <span class="item-generic">({{ med.genericName }})</span>
                    <ion-badge
                      [class]="'badge-' + med.prescriptionCategory.toLowerCase().replace('_', '-')"
                    >
                      {{ med.prescriptionCategory }}
                    </ion-badge>
                  </div>
                  <div class="item-stock">
                    <span class="stock-pill" [class.low]="(med.totalAvailableStock || 0) <= med.reorderLevel">
                      Stock: {{ med.totalAvailableStock || 0 }} {{ med.unitOfMeasure }}
                    </span>
                    <span class="item-price">₹{{ med.sellingPrice }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Cart Table Card -->
            <ion-card class="cart-card">
              <ion-card-header class="cart-header">
                <ion-card-title>
                  Bill Items ({{ cart().length }})
                </ion-card-title>
                <ion-button
                  fill="clear"
                  color="danger"
                  size="small"
                  *ngIf="cart().length > 0"
                  (click)="clearCart()"
                >
                  Clear All
                </ion-button>
              </ion-card-header>

              <ion-card-content class="cart-content">
                <div class="table-responsive" *ngIf="cart().length > 0">
                  <table class="pos-table">
                    <thead>
                      <tr>
                        <th>Item Details</th>
                        <th>FEFO Expiry</th>
                        <th class="ion-text-center">Qty</th>
                        <th class="ion-text-right">Unit Rate</th>
                        <th class="ion-text-right">GST%</th>
                        <th class="ion-text-right">Total</th>
                        <th class="ion-text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let item of cart(); let i = index">
                        <td>
                          <div class="line-name">{{ item.medicine.name }}</div>
                          <div class="line-sub">
                            HSN: {{ item.medicine.hsnCode }} | MRP: ₹{{ item.mrp }}
                          </div>
                        </td>
                        <td>
                          <span class="font-mono">{{ item.selectedBatch?.expiryDate ? (item.selectedBatch?.expiryDate | date:'MM/yy') : 'Auto FEFO' }}</span>
                        </td>
                        <td class="ion-text-center">
                          <div class="qty-control">
                            <button class="qty-btn" (click)="decreaseQty(i)">-</button>
                            <input
                              type="number"
                              class="qty-input"
                              [value]="item.quantity"
                              (change)="setQty(i, $event)"
                              min="1"
                            />
                            <button class="qty-btn" (click)="increaseQty(i)">+</button>
                          </div>
                        </td>
                        <td class="ion-text-right">₹{{ item.unitPrice.toFixed(2) }}</td>
                        <td class="ion-text-right">{{ item.gstRate }}%</td>
                        <td class="ion-text-right font-bold">₹{{ item.totalAmount.toFixed(2) }}</td>
                        <td class="ion-text-center">
                          <ion-button fill="clear" color="danger" size="small" (click)="removeFromCart(i)">
                            <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
                          </ion-button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="empty-cart" *ngIf="cart().length === 0">
                  <ion-icon name="barcode-outline" class="empty-icon"></ion-icon>
                  <p class="empty-title">Cart is empty</p>
                  <p class="empty-sub">
                    Scan a medicine barcode or use the search box above to begin billing.
                  </p>
                </div>
              </ion-card-content>
            </ion-card>
          </ion-col>

          <!-- Right Column: Customer Info & Bill Totals -->
          <ion-col size="12" size-lg="4">
            <!-- Patient / Prescription Info Card -->
            <ion-card class="checkout-card ion-margin-bottom">
              <ion-card-header>
                <ion-card-title>Prescription & Customer</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-item lines="inset" class="pos-input-item">
                  <ion-input
                    label="Patient Name"
                    labelPlacement="stacked"
                    placeholder="Walk-in Customer"
                    [(ngModel)]="patientName"
                  ></ion-input>
                </ion-item>
                <ion-item lines="inset" class="pos-input-item ion-margin-top">
                  <ion-input
                    label="Mobile Number"
                    labelPlacement="stacked"
                    placeholder="10-digit Phone"
                    [(ngModel)]="customerPhone"
                  ></ion-input>
                </ion-item>
                <ion-item lines="inset" class="pos-input-item ion-margin-top">
                  <ion-input
                    label="Doctor Name"
                    labelPlacement="stacked"
                    placeholder="Prescribing Physician"
                    [(ngModel)]="doctorName"
                  ></ion-input>
                </ion-item>
              </ion-card-content>
            </ion-card>

            <!-- Bill Totals Card -->
            <ion-card class="checkout-card">
              <ion-card-header>
                <ion-card-title>Bill Summary</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div class="summary-line">
                  <span>Gross Subtotal:</span>
                  <span>₹{{ subtotal().toFixed(2) }}</span>
                </div>
                <div class="summary-line">
                  <span>Taxable Value:</span>
                  <span>₹{{ taxableAmount().toFixed(2) }}</span>
                </div>
                <div class="summary-line">
                  <span>CGST (Central Tax):</span>
                  <span>₹{{ totalCgst().toFixed(2) }}</span>
                </div>
                <div class="summary-line">
                  <span>SGST (State Tax):</span>
                  <span>₹{{ totalSgst().toFixed(2) }}</span>
                </div>
                <div class="summary-line" *ngIf="roundOff() !== 0">
                  <span>Round Off:</span>
                  <span>₹{{ roundOff().toFixed(2) }}</span>
                </div>

                <div class="grand-total-row">
                  <span class="grand-label">Grand Total:</span>
                  <span class="grand-amount">₹{{ grandTotal().toLocaleString('en-IN') }}</span>
                </div>

                <ion-button
                  expand="block"
                  size="large"
                  color="success"
                  class="checkout-btn"
                  [disabled]="cart().length === 0 || isProcessing()"
                  (click)="openPaymentModal()"
                >
                  <ion-icon name="cash-outline" slot="start"></ion-icon>
                  Pay ₹{{ grandTotal().toLocaleString('en-IN') }} (F8)
                </ion-button>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>

      <!-- Payment & Checkout Modal -->
      <ion-modal [isOpen]="isPaymentModalOpen()">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>Complete Payment</ion-title>
              <ion-button slot="end" fill="clear" (click)="closePaymentModal()">
                <ion-icon name="close-outline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding modal-content">
            <div class="modal-summary">
              <span class="modal-label">Amount Payable:</span>
              <span class="modal-amount">₹{{ grandTotal().toLocaleString('en-IN') }}</span>
            </div>

            <div class="payment-selection ion-margin-top">
              <ion-item lines="inset" class="pos-input-item">
                <ion-select
                  label="Primary Payment Method"
                  labelPlacement="stacked"
                  [(ngModel)]="primaryPaymentMethod"
                >
                  <ion-select-option value="CASH">Cash</ion-select-option>
                  <ion-select-option value="UPI">UPI / QR Code</ion-select-option>
                  <ion-select-option value="CARD">Debit / Credit Card</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item lines="inset" class="pos-input-item ion-margin-top">
                <ion-input
                  label="Amount Tendered (₹)"
                  labelPlacement="stacked"
                  type="number"
                  [(ngModel)]="tenderedAmount"
                ></ion-input>
              </ion-item>

              <div class="change-calc ion-margin-top" *ngIf="tenderedAmount > grandTotal()">
                <span>Change Due to Customer:</span>
                <span class="change-val">₹{{ (tenderedAmount - grandTotal()).toFixed(2) }}</span>
              </div>
            </div>

            <ion-button
              expand="block"
              size="large"
              color="success"
              class="ion-margin-top"
              [disabled]="tenderedAmount < grandTotal() || isProcessing()"
              (click)="executeCheckout()"
            >
              <ion-spinner *ngIf="isProcessing()" name="crescent" slot="start"></ion-spinner>
              <span *ngIf="!isProcessing()">Confirm & Print Invoice</span>
            </ion-button>
          </ion-content>
        </ng-template>
      </ion-modal>

      <!-- Printable Invoice (80mm Thermal Receipt Layout) -->
      <div id="printable-receipt" class="printable-invoice" *ngIf="completedSale()">
        <div class="receipt-header">
          <h2>{{ completedSale().store?.name }}</h2>
          <p>{{ completedSale().store?.address }}, {{ completedSale().store?.city }}</p>
          <p>GSTIN: {{ completedSale().store?.gstin }} | DL: {{ completedSale().store?.drugLicenseNumber }}</p>
          <hr />
          <p><strong>TAX INVOICE</strong></p>
          <p>Inv: {{ completedSale().invoiceNumber }} | Date: {{ completedSale().saleDate | date:'short' }}</p>
          <p *ngIf="completedSale().patientName">Patient: {{ completedSale().patientName }}</p>
          <p *ngIf="completedSale().doctorName">Doctor: {{ completedSale().doctorName }}</p>
          <hr />
        </div>

        <table class="receipt-items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Batch</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let line of completedSale().items">
              <td>{{ line.medicine?.name }}</td>
              <td>{{ line.batch?.batchNumber }}</td>
              <td>{{ line.quantity }}</td>
              <td>{{ line.unitPrice }}</td>
              <td>{{ line.totalAmount }}</td>
            </tr>
          </tbody>
        </table>
        <hr />

        <div class="receipt-totals">
          <p>Taxable Value: ₹{{ completedSale().taxableAmount }}</p>
          <p>CGST: ₹{{ completedSale().cgstAmount }}</p>
          <p>SGST: ₹{{ completedSale().sgstAmount }}</p>
          <p><strong>Net Payable: ₹{{ completedSale().grandTotal }}</strong></p>
          <p>Paid: ₹{{ completedSale().paidAmount }} ({{ completedSale().payments[0]?.paymentMethod }})</p>
          <p *ngIf="completedSale().changeAmount > 0">Change: ₹{{ completedSale().changeAmount }}</p>
        </div>
        <hr />
        <div class="receipt-footer">
          <p>Thank you for choosing {{ completedSale().store?.name }}!</p>
          <p>Wish you a speedy recovery.</p>
        </div>
      </div>

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
      .pos-content {
        --background: #f1f5f9;
      }
      .header-shortcuts {
        display: flex;
        gap: 8px;
        margin-right: 16px;
      }
      .search-box {
        position: relative;
        margin-bottom: 12px;
      }
      .search-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 999;
        max-height: 320px;
        overflow-y: auto;
      }
      .search-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 14px;
        border-bottom: 1px solid #f1f5f9;
        cursor: pointer;
        transition: background 0.15s;
      }
      .search-item:hover {
        background: #f8fafc;
      }
      .item-name {
        font-weight: 600;
        color: #0f172a;
        margin-right: 8px;
      }
      .item-generic {
        font-size: 0.82rem;
        color: #64748b;
        margin-right: 8px;
      }
      .item-stock {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .stock-pill {
        font-size: 0.78rem;
        padding: 2px 8px;
        background: #e2e8f0;
        border-radius: 4px;
        color: #334155;
      }
      .stock-pill.low {
        background: #fee2e2;
        color: #b91c1c;
      }
      .item-price {
        font-weight: 700;
        color: var(--ion-color-primary);
      }
      .cart-card, .checkout-card {
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        background: #ffffff;
        margin: 0;
      }
      .cart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .pos-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.88rem;
      }
      .pos-table th {
        background: #f8fafc;
        padding: 8px 10px;
        color: #475569;
        border-bottom: 1px solid #e2e8f0;
      }
      .pos-table td {
        padding: 10px;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: middle;
      }
      .line-name {
        font-weight: 600;
        color: #0f172a;
      }
      .line-sub {
        font-size: 0.75rem;
        color: #64748b;
      }
      .qty-control {
        display: inline-flex;
        align-items: center;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        overflow: hidden;
      }
      .qty-btn {
        background: #f8fafc;
        border: none;
        width: 28px;
        height: 28px;
        font-weight: 700;
        cursor: pointer;
      }
      .qty-input {
        width: 36px;
        text-align: center;
        border: none;
        font-weight: 600;
        font-size: 0.9rem;
      }
      .empty-cart {
        text-align: center;
        padding: 40px 20px;
        color: #94a3b8;
      }
      .empty-icon {
        font-size: 54px;
        margin-bottom: 12px;
      }
      .empty-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: #475569;
        margin: 0 0 4px;
      }
      .empty-sub {
        font-size: 0.85rem;
        margin: 0;
      }
      .pos-input-item {
        --background: #f8fafc;
        border-radius: 6px;
      }
      .summary-line {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 0.88rem;
        color: #475569;
      }
      .grand-total-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 16px 0;
        padding-top: 12px;
        border-top: 2px dashed #e2e8f0;
      }
      .grand-label {
        font-size: 1.1rem;
        font-weight: 700;
        color: #0f172a;
      }
      .grand-amount {
        font-size: 1.8rem;
        font-weight: 800;
        color: var(--ion-color-primary);
      }
      .checkout-btn {
        font-weight: 700;
        --border-radius: 8px;
      }
      .modal-content {
        --background: #f8fafc;
      }
      .modal-summary {
        text-align: center;
        padding: 16px;
        background: #ffffff;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
      }
      .modal-label {
        display: block;
        font-size: 0.9rem;
        color: #64748b;
      }
      .modal-amount {
        font-size: 2.2rem;
        font-weight: 800;
        color: #0d9488;
      }
      .change-calc {
        display: flex;
        justify-content: space-between;
        background: #ecfdf5;
        padding: 10px 14px;
        border-radius: 8px;
        border: 1px solid #a7f3d0;
        color: #065f46;
        font-weight: 600;
      }
      .printable-invoice {
        display: none;
      }
    `,
  ],
})
export class PosComponent implements OnInit {
  searchResults = signal<Medicine[]>([]);
  cart = signal<CartItem[]>([]);

  patientName = '';
  customerPhone = '';
  doctorName = '';
  doctorRegNo = '';

  isPaymentModalOpen = signal(false);
  isProcessing = signal(false);
  primaryPaymentMethod = 'CASH';
  tenderedAmount = 0;
  toastMessage = signal<string | null>(null);

  completedSale = signal<any | null>(null);

  // Keyboard shortcut listener
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'F2') {
      event.preventDefault();
      document.getElementById('pos-search-input')?.focus();
    } else if (event.key === 'F8') {
      event.preventDefault();
      if (this.cart().length > 0 && !this.isPaymentModalOpen()) {
        this.openPaymentModal();
      }
    } else if (event.key === 'Escape' && this.isPaymentModalOpen()) {
      this.closePaymentModal();
    }
  }

  // Live Cart Calculations
  subtotal = computed(() => {
    return this.cart().reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  });

  taxableAmount = computed(() => {
    return this.cart().reduce((sum, item) => sum + item.taxableAmount, 0);
  });

  totalCgst = computed(() => {
    return this.cart().reduce((sum, item) => sum + item.cgstAmount, 0);
  });

  totalSgst = computed(() => {
    return this.cart().reduce((sum, item) => sum + item.sgstAmount, 0);
  });

  grandTotal = computed(() => {
    const raw = this.taxableAmount() + this.totalCgst() + this.totalSgst();
    return Math.round(raw);
  });

  roundOff = computed(() => {
    const raw = this.taxableAmount() + this.totalCgst() + this.totalSgst();
    return Math.round(raw) - raw;
  });

  constructor(
    private apiService: ApiService,
    public authService: AuthService,
  ) {
    addIcons({
      barcodeOutline,
      searchOutline,
      trashOutline,
      addOutline,
      removeOutline,
      cashOutline,
      cardOutline,
      printOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      closeOutline,
      personOutline,
      medkitOutline,
      shieldCheckmarkOutline,
    });
  }

  ngOnInit() {}

  onSearchChange(event: any) {
    const val = event.target.value?.trim();
    if (!val || val.length < 2) {
      this.searchResults.set([]);
      return;
    }

    this.apiService.getMedicines({ search: val, limit: 10 }).subscribe({
      next: (res) => {
        this.searchResults.set(res.items || []);
      },
    });
  }

  onSearchEnter() {
    const results = this.searchResults();
    if (results.length > 0) {
      this.addToCart(results[0]);
      this.searchResults.set([]);
    }
  }

  addToCart(med: Medicine) {
    const current = this.cart();
    const existingIndex = current.findIndex((c) => c.medicine.id === med.id);

    if (existingIndex > -1) {
      this.increaseQty(existingIndex);
    } else {
      const unitPrice = med.sellingPrice;
      const gstRate = med.gstRate;
      const halfRate = gstRate / 2;
      const cgst = (unitPrice * halfRate) / 100;
      const sgst = (unitPrice * halfRate) / 100;
      const total = unitPrice + cgst + sgst;

      const newItem: CartItem = {
        medicine: med,
        selectedBatch: med.batches?.[0], // FEFO earliest batch
        quantity: 1,
        unitPrice,
        mrp: med.mrp,
        discountPercent: 0,
        gstRate,
        taxableAmount: unitPrice,
        cgstAmount: cgst,
        sgstAmount: sgst,
        totalAmount: total,
      };

      this.cart.set([...current, newItem]);
    }

    this.searchResults.set([]);
  }

  increaseQty(index: number) {
    const items = [...this.cart()];
    const item = { ...items[index] };
    item.quantity += 1;
    this.recalculateItem(item);
    items[index] = item;
    this.cart.set(items);
  }

  decreaseQty(index: number) {
    const items = [...this.cart()];
    if (items[index].quantity > 1) {
      const item = { ...items[index] };
      item.quantity -= 1;
      this.recalculateItem(item);
      items[index] = item;
      this.cart.set(items);
    } else {
      this.removeFromCart(index);
    }
  }

  setQty(index: number, event: any) {
    const val = parseInt(event.target.value, 10);
    if (val > 0) {
      const items = [...this.cart()];
      const item = { ...items[index] };
      item.quantity = val;
      this.recalculateItem(item);
      items[index] = item;
      this.cart.set(items);
    }
  }

  removeFromCart(index: number) {
    const items = [...this.cart()];
    items.splice(index, 1);
    this.cart.set(items);
  }

  clearCart() {
    this.cart.set([]);
  }

  private recalculateItem(item: CartItem) {
    const lineGross = item.unitPrice * item.quantity;
    const discount = (lineGross * item.discountPercent) / 100;
    const taxable = lineGross - discount;
    const halfGst = item.gstRate / 2;
    item.taxableAmount = taxable;
    item.cgstAmount = (taxable * halfGst) / 100;
    item.sgstAmount = (taxable * halfGst) / 100;
    item.totalAmount = taxable + item.cgstAmount + item.sgstAmount;
  }

  openPaymentModal() {
    this.tenderedAmount = this.grandTotal();
    this.isPaymentModalOpen.set(true);
  }

  closePaymentModal() {
    this.isPaymentModalOpen.set(false);
  }

  executeCheckout() {
    this.isProcessing.set(true);

    const idempotencyKey = `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const payload = {
      idempotencyKey,
      patientName: this.patientName || undefined,
      customerPhone: this.customerPhone || undefined,
      doctorName: this.doctorName || undefined,
      doctorRegNo: this.doctorRegNo || undefined,
      items: this.cart().map((item) => ({
        medicineId: item.medicine.id,
        quantity: item.quantity,
        discountPercent: item.discountPercent,
      })),
      payments: [
        {
          paymentMethod: this.primaryPaymentMethod,
          amount: this.tenderedAmount,
        },
      ],
    };

    this.apiService.checkoutSale(payload).subscribe({
      next: (sale) => {
        this.isProcessing.set(false);
        this.completedSale.set(sale);
        this.closePaymentModal();
        this.toastMessage.set(`Invoice ${sale.invoiceNumber} completed successfully!`);

        // Trigger thermal receipt print
        setTimeout(() => {
          window.print();
          this.cart.set([]);
          this.patientName = '';
          this.customerPhone = '';
          this.doctorName = '';
        }, 500);
      },
      error: (err) => {
        this.isProcessing.set(false);
        this.toastMessage.set(err.error?.message || 'Checkout failed. Please check stock availability.');
      },
    });
  }
}
