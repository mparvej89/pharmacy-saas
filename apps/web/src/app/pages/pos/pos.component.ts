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
  IonLabel,
  IonButton,
  IonIcon,
  IonBadge,
  IonInput,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonToast,
  IonSpinner,
  IonMenuButton,
  IonButtons,
  AlertController,
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
  walletOutline,
  qrCodeOutline,
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
    IonLabel,
    IonButton,
    IonIcon,
    IonBadge,
    IonInput,
    IonModal,
    IonSelect,
    IonSelectOption,
    IonToast,
    IonSpinner,
    IonMenuButton,
    IonButtons,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button color="light"></ion-menu-button>
        </ion-buttons>
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
      <ion-grid class="pos-grid">
        <ion-row>
          <!-- Left Column: Search & Cart Lines -->
          <ion-col size="12" size-lg="8.5" size-xl="9">
              <!-- Search & Barcode Scan Bar -->
              <div class="search-box">
                <ion-searchbar
                  id="pos-search-input"
                  placeholder="Scan Barcode (Enter) or Search Medicine by Name, Generic, Brand..."
                  [debounce]="150"
                  (ionInput)="onSearchChange($event)"
                  (ionClear)="onSearchClear()"
                  (keydown.enter)="onSearchEnter()"
                  showClearButton="always"
                ></ion-searchbar>

                <!-- Live Autocomplete Dropdown -->
                <div class="search-dropdown" *ngIf="searchResults().length > 0">
                  <div
                    *ngFor="let med of searchResults()"
                    class="search-item"
                    (mousedown)="addToCart(med)"
                  >
                    <div class="item-info">
                      <span class="item-name">{{ med.name }}</span>
                      <span class="item-generic" *ngIf="med.genericName">({{ med.genericName }})</span>
                      <ion-badge
                        [class]="'badge-' + (med.prescriptionCategory || 'otc').toLowerCase().replace('_', '-')"
                      >
                        {{ med.prescriptionCategory }}
                      </ion-badge>
                    </div>
                    <div class="item-stock">
                      <span class="stock-pill" [class.low]="(med.totalAvailableStock || 0) <= med.reorderLevel">
                        Stock: {{ med.totalAvailableStock || 0 }} {{ med.baseUnit || med.unitOfMeasure }}
                        <ng-container *ngIf="(med.conversionFactor || 1) > 1">
                          ({{ Math.floor((med.totalAvailableStock || 0) / (med.conversionFactor || 10)) }} {{ med.purchaseUnit || 'STRIP' }}<span *ngIf="(med.totalAvailableStock || 0) % (med.conversionFactor || 10) > 0"> + {{ (med.totalAvailableStock || 0) % (med.conversionFactor || 10) }} {{ med.baseUnit || 'tab' }}</span>)
                        </ng-container>
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
                        <th class="col-item">Item Details</th>
                        <th class="ion-text-center col-expiry">Expiry</th>
                        <th class="ion-text-center col-unit">Sale Unit</th>
                        <th class="ion-text-center col-qty">Quantity</th>
                        <th class="ion-text-right col-rate">Rate</th>
                        <th class="ion-text-center col-disc">Disc %</th>
                        <th class="ion-text-center col-gst">GST</th>
                        <th class="ion-text-right col-total">Net Total</th>
                        <th class="ion-text-center col-action"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let item of cart(); let i = index">
                        <td class="col-item">
                          <div class="line-name">{{ item.medicine.name }}</div>
                          <div class="line-meta">
                            <span class="meta-tag" *ngIf="item.medicine.hsnCode">HSN: {{ item.medicine.hsnCode }}</span>
                            <span class="meta-sep" *ngIf="item.medicine.hsnCode">|</span>
                            <span class="meta-tag">MRP: ₹{{ item.mrp }}</span>
                          </div>
                          <div
                            class="line-stock"
                            [style.color]="(item.medicine.totalAvailableStock || 0) <= 0 ? '#dc2626' : (item.quantity * (item.conversionFactor || 1) >= (item.medicine.totalAvailableStock || 0) ? '#d97706' : '#059669')"
                          >
                            <span *ngIf="(item.medicine.totalAvailableStock || 0) <= 0">Out of Stock (0 {{ item.medicine.baseUnit || 'units' }})</span>
                            <span *ngIf="(item.medicine.totalAvailableStock || 0) > 0">
                              Stock: {{ item.medicine.totalAvailableStock }} {{ item.medicine.baseUnit || 'units' }}
                              <span *ngIf="item.conversionFactor && item.conversionFactor > 1" class="stock-factor">
                                (max {{ getMaxAllowedQty(item) }} {{ item.saleUnit }})
                              </span>
                            </span>
                          </div>
                        </td>
                        <td class="ion-text-center col-expiry">
                          <div class="cell-top-align">
                            <span class="font-mono expiry-pill">{{ item.selectedBatch?.expiryDate ? (item.selectedBatch?.expiryDate | date:'MM/yy') : 'Auto' }}</span>
                          </div>
                        </td>
                        <td class="ion-text-center col-unit">
                          <div class="cell-top-align">
                            <div class="unit-pill-group">
                              <button
                                type="button"
                                class="unit-pill"
                                [class.active]="item.saleUnit === (item.medicine.purchaseUnit || 'STRIP')"
                                (click)="selectUnit(i, item.medicine.purchaseUnit || 'STRIP')"
                                [title]="'Sell as ' + (item.medicine.purchaseUnit || 'STRIP') + ' (' + (item.medicine.conversionFactor || 10) + 's)'"
                              >
                                {{ item.medicine.purchaseUnit || 'STRIP' }}
                              </button>
                              <button
                                type="button"
                                class="unit-pill"
                                [class.active]="item.saleUnit === (item.medicine.baseUnit || 'TABLET')"
                                (click)="selectUnit(i, item.medicine.baseUnit || 'TABLET')"
                                [title]="'Sell as loose ' + (item.medicine.baseUnit || 'TABLET')"
                              >
                                {{ item.medicine.baseUnit || 'TABLET' }}
                              </button>
                            </div>
                            <div class="unit-factor-hint">
                              1 {{ item.medicine.purchaseUnit || 'STRIP' }} = {{ item.medicine.conversionFactor || 10 }} {{ item.medicine.baseUnit || 'tab' }}
                            </div>
                          </div>
                        </td>
                        <td class="ion-text-center col-qty">
                          <div class="cell-top-align">
                            <div class="qty-control" [class.qty-limit-reached]="item.quantity >= getMaxAllowedQty(item)">
                              <button class="qty-btn" (click)="decreaseQty(i)">-</button>
                              <input
                                type="number"
                                class="qty-input"
                                [value]="item.quantity"
                                (change)="setQty(i, $event)"
                                (keydown)="preventInvalidKey($event)"
                                min="1"
                                [max]="getMaxAllowedQty(item)"
                              />
                              <button
                                class="qty-btn"
                                (click)="increaseQty(i)"
                                [disabled]="item.quantity >= getMaxAllowedQty(item)"
                                [title]="item.quantity >= getMaxAllowedQty(item) ? 'Cannot exceed available stock' : 'Increase quantity'"
                              >+</button>
                            </div>
                            <div class="qty-subtext">
                              = {{ item.quantity * (item.conversionFactor || 1) }} {{ item.medicine.baseUnit || 'units' }}
                            </div>
                            <div
                              *ngIf="item.quantity >= getMaxAllowedQty(item) && (item.medicine.totalAvailableStock || 0) > 0"
                              class="qty-max-warn"
                            >
                              Max stock reached
                            </div>
                          </div>
                        </td>
                        <td class="ion-text-right col-rate">
                          <div class="cell-top-align" style="align-items: flex-end;">
                            <span class="rate-val">₹{{ item.unitPrice.toFixed(2) }}</span>
                            <span class="rate-unit-label">/{{ item.saleUnit?.toLowerCase() || 'unit' }}</span>
                          </div>
                        </td>
                        <td class="ion-text-center col-disc">
                          <div class="cell-top-align">
                            <div class="disc-control" [class.has-disc]="item.discountPercent > 0">
                              <input
                                type="number"
                                class="disc-input"
                                [value]="item.discountPercent > 0 ? item.discountPercent : ''"
                                (change)="setDiscount(i, $event)"
                                (keydown)="preventInvalidKey($event)"
                                min="0"
                                max="100"
                                placeholder="0"
                                title="Item Discount %"
                              />
                              <span class="disc-symbol">%</span>
                              <div class="disc-spin-btns">
                                <button type="button" class="disc-spin-btn up" (click)="increaseDiscount(i)" title="Increase discount">▲</button>
                                <button type="button" class="disc-spin-btn down" (click)="decreaseDiscount(i)" title="Decrease discount">▼</button>
                              </div>
                            </div>
                            <div *ngIf="item.discountPercent > 0" class="disc-savings-tag">
                              -₹{{ ((item.unitPrice * item.quantity * item.discountPercent) / 100).toFixed(2) }}
                            </div>
                          </div>
                        </td>
                        <td class="ion-text-center col-gst">
                          <div class="cell-top-align">
                            <span class="gst-badge">{{ item.gstRate }}%</span>
                          </div>
                        </td>
                        <td class="ion-text-right col-total">
                          <div class="cell-top-align" style="align-items: flex-end;">
                            <div class="font-bold text-total">₹{{ item.totalAmount.toFixed(2) }}</div>
                            <div *ngIf="item.discountPercent > 0" class="orig-gross-strike">
                              ₹{{ (item.unitPrice * item.quantity).toFixed(2) }}
                            </div>
                          </div>
                        </td>
                        <td class="ion-text-center col-action">
                          <div class="cell-top-align">
                            <button type="button" class="action-delete-btn" (click)="removeFromCart(i)" title="Remove item">
                              <ion-icon name="trash-outline"></ion-icon>
                            </button>
                          </div>
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
          <ion-col size="12" size-lg="3.5" size-xl="3">
            <!-- Patient / Prescription Info Card -->
            <ion-card class="checkout-card ion-margin-bottom">
              <ion-card-header>
                <div class="customer-card-header">
                  <ion-card-title>Prescription & Customer</ion-card-title>
                  <ion-badge *ngIf="isExistingCustomer()" color="success" class="customer-found-badge">
                    Registered Patient
                  </ion-badge>
                </div>
              </ion-card-header>
              <ion-card-content>
                <!-- 1. Mobile Number First with Suggestions Dropdown -->
                <div class="phone-input-wrapper">
                  <ion-item lines="inset" class="pos-input-item">
                    <ion-input
                      id="pos-customer-phone"
                      name="customerPhone"
                      label="Mobile Number *"
                      labelPlacement="stacked"
                      placeholder="Type mobile or name..."
                      [(ngModel)]="customerPhone"
                      (ionInput)="onCustomerPhoneInput($event)"
                      (ionFocus)="onCustomerPhoneFocus()"
                    ></ion-input>
                  </ion-item>

                  <!-- Live Customer Suggestions Dropdown -->
                  <div class="customer-suggestions-dropdown" *ngIf="customerSuggestions().length > 0">
                    <div
                      *ngFor="let c of customerSuggestions()"
                      class="customer-suggestion-item"
                      (mousedown)="selectCustomer(c)"
                    >
                      <div class="cust-info">
                        <span class="cust-name">{{ c.name }}</span>
                        <span class="cust-phone font-mono">{{ c.phone }}</span>
                      </div>
                      <div class="cust-extra" *ngIf="c.doctorName">
                        <span class="cust-doc">Dr. {{ c.doctorName }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 2. Patient Name -->
                <ion-item lines="inset" class="pos-input-item ion-margin-top" [class.field-required]="requiresPrescription()">
                  <ion-input
                    id="pos-patient-name"
                    name="patientName"
                    [label]="requiresPrescription() ? 'Patient Name *' : 'Patient Name'"
                    labelPlacement="stacked"
                    placeholder="Walk-in Customer"
                    [(ngModel)]="patientName"
                  ></ion-input>
                </ion-item>

                <!-- 3. Doctor Name -->
                <ion-item lines="inset" class="pos-input-item ion-margin-top" [class.field-required]="requiresPrescription()">
                  <ion-input
                    id="pos-doctor-name"
                    name="doctorName"
                    [label]="requiresPrescription() ? 'Doctor Name *' : 'Doctor Name'"
                    labelPlacement="stacked"
                    placeholder="Prescribing Physician"
                    [(ngModel)]="doctorName"
                  ></ion-input>
                </ion-item>

                <!-- 4. Doctor Reg No (Mandatory for Schedule H1 & X) -->
                <ion-item lines="inset" class="pos-input-item ion-margin-top" [class.field-required]="requiresDoctorRegNo()">
                  <ion-input
                    id="pos-doctor-reg-no"
                    name="doctorRegNo"
                    [label]="requiresDoctorRegNo() ? 'Doctor Reg # (Mandatory for H1/X) *' : 'Doctor Reg #'"
                    labelPlacement="stacked"
                    placeholder="e.g. MCI-18492"
                    [(ngModel)]="doctorRegNo"
                  ></ion-input>
                </ion-item>

                <div *ngIf="requiresDoctorRegNo() && !doctorRegNo" class="statutory-alert ion-margin-top">
                  <ion-icon name="alert-circle-outline"></ion-icon>
                  <span>Doctor Reg # is statutory requirement for Schedule H1/X drugs in cart.</span>
                </div>
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
                <div class="summary-line text-success" *ngIf="itemDiscountTotal() > 0">
                  <span>Item Discounts:</span>
                  <span style="color: #16a34a; font-weight: 600;">-₹{{ itemDiscountTotal().toFixed(2) }}</span>
                </div>
                <div class="summary-line discount-input-row" style="align-items: center;">
                  <span style="font-weight: 500;">Bill Discount (%):</span>
                  <div class="bill-disc-wrapper">
                    <input
                      type="number"
                      class="bill-disc-input"
                      [value]="billDiscountPercent()"
                      (input)="setBillDiscount($event)"
                      min="0"
                      max="100"
                      placeholder="0"
                    />
                    <span class="disc-pct-symbol">%</span>
                    <div class="disc-spin-btns">
                      <button type="button" class="disc-spin-btn up" (click)="adjustBillDiscount(1)" title="Increase bill discount">▲</button>
                      <button type="button" class="disc-spin-btn down" (click)="adjustBillDiscount(-1)" title="Decrease bill discount">▼</button>
                    </div>
                  </div>
                </div>
                <div class="summary-line text-success" *ngIf="billDiscountAmount() > 0">
                  <span>Bill Discount Savings:</span>
                  <span style="color: #16a34a; font-weight: 600;">-₹{{ billDiscountAmount().toFixed(2) }}</span>
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

            <!-- Payment Mode Selector & Split Toggle -->
            <div class="split-toggle-strip ion-margin-top" style="display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 10px 14px; border-radius: 8px;">
              <span style="font-weight: 600; font-size: 0.9rem; color: #334155;">
                {{ isSplitPayment() ? 'Multi-Mode Split / Credit Payment' : 'Single Payment Mode' }}
              </span>
              <ion-button size="small" fill="outline" (click)="toggleSplitPayment()">
                {{ isSplitPayment() ? 'Switch to Single Mode' : 'Split / Credit Payment' }}
              </ion-button>
            </div>

            <!-- Single Payment Mode UI -->
            <div class="payment-selection ion-margin-top" *ngIf="!isSplitPayment()">
              <ion-item fill="outline" class="pos-input-item">
                <ion-select
                  label="Payment Method"
                  labelPlacement="floating"
                  interface="popover"
                  [interfaceOptions]="{ cssClass: 'custom-popover' }"
                  [(ngModel)]="primaryPaymentMethod"
                >
                  <ion-select-option value="CASH">Cash</ion-select-option>
                  <ion-select-option value="UPI">UPI / QR Code</ion-select-option>
                  <ion-select-option value="CARD">Debit / Credit Card</ion-select-option>
                  <ion-select-option value="CREDIT">Customer Credit (Pay Later / Due)</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item lines="inset" class="pos-input-item ion-margin-top" *ngIf="primaryPaymentMethod !== 'CREDIT'">
                <ion-input
                  id="pos-tendered-amount"
                  name="tenderedAmount"
                  label="Amount Tendered (₹)"
                  labelPlacement="stacked"
                  type="number"
                  [(ngModel)]="tenderedAmount"
                ></ion-input>
              </ion-item>

              <div class="change-calc ion-margin-top" *ngIf="primaryPaymentMethod !== 'CREDIT' && tenderedAmount > grandTotal()">
                <span>Change Due to Customer:</span>
                <span class="change-val">₹{{ (tenderedAmount - grandTotal()).toFixed(2) }}</span>
              </div>

              <div class="credit-banner ion-margin-top" *ngIf="primaryPaymentMethod === 'CREDIT'" style="background: #fef3c7; color: #92400e; padding: 10px 14px; border-radius: 8px; font-size: 0.85rem;">
                ⚠️ 100% Bill will be recorded as Outstanding Customer Receivable. Ensure Customer Phone or Patient Name is entered.
              </div>
            </div>

            <!-- Multi-Mode Split Payment UI -->
            <div class="split-payment-box ion-margin-top" *ngIf="isSplitPayment()" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
              <p style="font-size: 0.85rem; color: #64748b; margin-top: 0; margin-bottom: 12px;">
                Allocate amounts across modes. Unpaid portions can be allocated to Customer Credit (Due).
              </p>

              <ion-item lines="none" class="pos-input-item" style="border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 8px;">
                <ion-label position="stacked" style="font-weight: 600; color: #0f172a;">💵 Cash Received (₹)</ion-label>
                <ion-input type="number" placeholder="0" [(ngModel)]="splitCashAmount"></ion-input>
              </ion-item>

              <ion-item lines="none" class="pos-input-item" style="border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 8px;">
                <ion-label position="stacked" style="font-weight: 600; color: #0f172a;">📱 UPI / QR Code (₹)</ion-label>
                <ion-input type="number" placeholder="0" [(ngModel)]="splitUpiAmount"></ion-input>
              </ion-item>

              <ion-item lines="none" class="pos-input-item" style="border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 8px;">
                <ion-label position="stacked" style="font-weight: 600; color: #0f172a;">💳 Card / POS Machine (₹)</ion-label>
                <ion-input type="number" placeholder="0" [(ngModel)]="splitCardAmount"></ion-input>
              </ion-item>

              <ion-item lines="none" class="pos-input-item" style="border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 8px;">
                <ion-label position="stacked" style="font-weight: 600; color: #b45309;">📝 Customer Credit / Due (₹)</ion-label>
                <ion-input type="number" placeholder="0" [(ngModel)]="splitCreditAmount"></ion-input>
              </ion-item>

              <ion-item lines="none" class="pos-input-item" style="border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px;" *ngIf="splitUpiAmount > 0 || splitCardAmount > 0">
                <ion-label position="stacked" style="font-size: 0.8rem; color: #64748b;">UPI Ref / Card Auth Code (Optional)</ion-label>
                <ion-input placeholder="e.g. 4234091823" [(ngModel)]="splitReferenceNumber"></ion-input>
              </ion-item>

              <!-- Split Allocation Summary -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding: 10px; background: #f8fafc; border-radius: 6px;">
                <div>
                  <div style="font-size: 0.8rem; color: #64748b;">Total Allocated:</div>
                  <strong style="font-size: 1.1rem; color: #0f172a;">₹{{ totalSplitPaid().toFixed(2) }}</strong>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 0.8rem; color: #64748b;">Grand Total:</div>
                  <strong style="font-size: 1.1rem; color: #0f172a;">₹{{ grandTotal().toLocaleString('en-IN') }}</strong>
                </div>
              </div>

              <div *ngIf="totalSplitPaid() !== grandTotal()" style="margin-top: 6px; font-size: 0.8rem; font-weight: 600;" [style.color]="totalSplitPaid() < grandTotal() ? '#d97706' : '#2563eb'">
                <span *ngIf="totalSplitPaid() < grandTotal()">
                  Remaining to allocate: ₹{{ (grandTotal() - totalSplitPaid()).toFixed(2) }}
                  <a style="cursor: pointer; text-decoration: underline; margin-left: 6px;" (click)="splitCreditAmount = splitCreditAmount + (grandTotal() - totalSplitPaid())">
                    Put on Credit
                  </a>
                </span>
                <span *ngIf="totalSplitPaid() > grandTotal()">
                  Overpaid by ₹{{ (totalSplitPaid() - grandTotal()).toFixed(2) }} (Check inputs)
                </span>
              </div>
            </div>

            <ion-button
              expand="block"
              size="large"
              color="success"
              class="ion-margin-top"
              [disabled]="isProcessing() || (!isSplitPayment() && primaryPaymentMethod !== 'CREDIT' && tenderedAmount < grandTotal()) || (isSplitPayment() && totalSplitPaid() < grandTotal())"
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
              <td>{{ line.quantity }} {{ line.saleUnit || line.medicine?.purchaseUnit || '' }}</td>
              <td>₹{{ line.unitPrice }}</td>
              <td>₹{{ line.totalAmount }}</td>
            </tr>
          </tbody>
        </table>
        <hr />

        <div class="receipt-totals">
          <p>Gross Subtotal: ₹{{ completedSale().subtotal }}</p>
          <p *ngIf="completedSale().itemDiscountTotal > 0">Item Discount: -₹{{ completedSale().itemDiscountTotal }}</p>
          <p *ngIf="completedSale().billDiscountAmount > 0">Bill Discount ({{ completedSale().billDiscountPercent }}%): -₹{{ completedSale().billDiscountAmount }}</p>
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
        position="top"
        cssClass="toast-top-right"
        (didDismiss)="toastMessage.set(null)"
      ></ion-toast>
    </ion-content>
  `,
  styles: [
    `
      .pos-content {
        --background: #f1f5f9;
      }
      .pos-grid {
        width: 100%;
        max-width: 100%;
        padding: 0;
      }
      .table-responsive {
        width: 100%;
        overflow-x: auto;
      }
      .cart-content {
        padding: 0;
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
        padding: 12px 16px;
      }
      .pos-table {
        width: 100%;
        table-layout: fixed;
        border-collapse: collapse;
        font-size: 0.88rem;
      }
      .pos-table th {
        background: #f8fafc;
        padding: 12px 10px;
        color: #475569;
        font-size: 0.78rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 2px solid #e2e8f0;
        white-space: nowrap;
      }
      .pos-table td {
        padding: 12px 8px;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: top;
      }
      .cell-top-align {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
      }
      .line-name {
        font-weight: 700;
        color: #0f172a;
        font-size: 0.95rem;
        line-height: 1.3;
      }
      .line-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.76rem;
        color: #64748b;
        margin-top: 3px;
      }
      .meta-tag {
        font-weight: 500;
      }
      .meta-sep {
        color: #cbd5e1;
      }
      .line-stock {
        font-size: 0.75rem;
        font-weight: 600;
        margin-top: 4px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .stock-factor {
        color: #64748b;
        font-weight: normal;
      }
      .expiry-pill {
        display: inline-block;
        padding: 4px 8px;
        background: #f8fafc;
        color: #334155;
        border-radius: 6px;
        font-size: 0.82rem;
        font-weight: 600;
        border: 1px solid #e2e8f0;
      }
      .qty-control {
        display: inline-flex;
        align-items: center;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        overflow: hidden;
        background: #ffffff;
        box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      }
      .qty-btn {
        background: #f8fafc;
        border: none;
        width: 28px;
        height: 32px;
        font-weight: 700;
        cursor: pointer;
        color: #334155;
        transition: background 0.15s ease;
      }
      .qty-btn:hover:not(:disabled) {
        background: #e2e8f0;
      }
      .qty-btn:disabled {
        opacity: 0.35;
        cursor: not-allowed;
        background: #f1f5f9;
      }
      .qty-control.qty-limit-reached {
        border-color: #f59e0b;
      }
      .qty-input {
        width: 38px;
        height: 32px;
        text-align: center;
        border: none;
        font-weight: 700;
        font-size: 0.95rem;
        color: #0f172a;
        background: #ffffff;
      }
      .qty-input:focus {
        outline: none;
      }
      .qty-subtext {
        font-size: 0.72rem;
        color: #64748b;
        margin-top: 4px;
        font-weight: 500;
      }
      .qty-max-warn {
        font-size: 0.7rem;
        color: #d97706;
        font-weight: 700;
        margin-top: 2px;
      }
      /* Clean item discount input control */
      .disc-control {
        display: inline-flex;
        align-items: center;
        position: relative;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #ffffff;
        padding: 0 5px 0 0;
        box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        transition: all 0.15s ease;
      }
      .disc-control:focus-within {
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
      }
      .disc-control.has-disc {
        border-color: #0284c7;
        background: #f0f9ff;
      }
      .disc-input {
        width: 34px;
        height: 32px;
        text-align: center;
        border: none;
        font-weight: 700;
        font-size: 0.92rem;
        color: #0f172a;
        background: transparent;
        -moz-appearance: textfield;
      }
      .disc-input::-webkit-outer-spin-button,
      .disc-input::-webkit-inner-spin-button,
      .qty-input::-webkit-outer-spin-button,
      .qty-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      .disc-input:focus {
        outline: none;
      }
      .disc-symbol {
        font-size: 0.76rem;
        font-weight: 700;
        color: #64748b;
        user-select: none;
        margin-right: 4px;
      }
      .disc-spin-btns {
        display: flex;
        flex-direction: column;
        height: 30px;
        width: 14px;
        border-left: 1px solid #e2e8f0;
      }
      .disc-spin-btn {
        flex: 1;
        background: #f8fafc;
        border: none;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.5rem;
        color: #64748b;
        cursor: pointer;
        line-height: 1;
        transition: all 0.15s ease;
      }
      .disc-spin-btn.up {
        border-top-right-radius: 7px;
        border-bottom: 1px solid #f1f5f9;
      }
      .disc-spin-btn.down {
        border-bottom-right-radius: 7px;
      }
      .disc-spin-btn:hover {
        background: #e2e8f0;
        color: #0284c7;
      }
      .col-item {
        width: 24%;
      }
      .col-expiry {
        width: 9%;
      }
      .col-unit {
        width: 18%;
      }
      .col-qty {
        width: 15%;
      }
      .col-rate {
        width: 10%;
      }
      .col-disc {
        width: 9%;
      }
      .col-gst {
        width: 6%;
      }
      .col-total {
        width: 11%;
      }
      .col-action {
        width: 5%;
      }
      .rate-val {
        font-weight: 700;
        color: #1e293b;
        font-size: 0.95rem;
        line-height: 32px;
      }
      .rate-unit-label {
        font-size: 0.7rem;
        color: #94a3b8;
        margin-top: 1px;
      }
      .gst-badge {
        display: inline-block;
        padding: 4px 6px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        color: #475569;
        font-weight: 600;
        font-size: 0.8rem;
      }
      .disc-savings-tag {
        font-size: 0.72rem;
        font-weight: 700;
        color: #16a34a;
        margin-top: 4px;
      }
      .orig-gross-strike {
        font-size: 0.74rem;
        color: #94a3b8;
        text-decoration: line-through;
        margin-top: 2px;
      }
      .text-total {
        color: #0f172a;
        font-size: 1.02rem;
        line-height: 32px;
      }
      .action-delete-btn {
        background: transparent;
        border: 1px solid transparent;
        color: #94a3b8;
        cursor: pointer;
        font-size: 1.2rem;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      }
      .action-delete-btn:hover {
        background: #fee2e2;
        border-color: #fca5a5;
        color: #dc2626;
      }
      .orig-gross-strike {
        font-size: 0.72rem;
        color: #94a3b8;
        text-decoration: line-through;
        margin-top: 1px;
      }
      .text-muted-rate {
        color: #64748b;
        font-weight: 600;
        font-size: 0.88rem;
      }
      .text-total {
        color: #0f172a;
        font-size: 0.95rem;
      }
      .action-delete-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 1.15rem;
        padding: 6px;
        border-radius: 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      }
      .action-delete-btn:hover {
        background: #fee2e2;
        color: #dc2626;
      }
      .unit-pill-group {
        display: inline-flex;
        background: #f1f5f9;
        padding: 3px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        gap: 2px;
      }
      .unit-pill {
        border: none;
        background: transparent;
        padding: 5px 10px;
        border-radius: 6px;
        font-size: 0.76rem;
        font-weight: 700;
        color: #64748b;
        cursor: pointer;
        letter-spacing: 0.3px;
        text-transform: uppercase;
        transition: all 0.15s ease-in-out;
      }
      .unit-pill:hover {
        color: #0f172a;
      }
      .unit-pill.active {
        background: #0284c7;
        color: #ffffff;
        box-shadow: 0 1px 3px rgba(2, 132, 199, 0.3);
      }
      .unit-factor-hint {
        font-size: 0.7rem;
        color: #94a3b8;
        margin-top: 3px;
        white-space: nowrap;
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
      .summary-line.text-success {
        color: #16a34a;
      }
      .bill-disc-wrapper {
        position: relative;
        display: inline-flex;
        align-items: center;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        overflow: hidden;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .bill-disc-wrapper:focus-within {
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
      }
      .bill-disc-input {
        width: 44px;
        height: 32px;
        padding-right: 4px;
        text-align: center;
        border: none;
        font-weight: 700;
        font-size: 0.92rem;
        color: #0f172a;
        background: transparent;
        -moz-appearance: textfield;
      }
      .bill-disc-input::-webkit-outer-spin-button,
      .bill-disc-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      .bill-disc-input:focus {
        outline: none;
      }
      .disc-pct-symbol {
        font-size: 0.78rem;
        font-weight: 700;
        color: #64748b;
        pointer-events: none;
        margin-right: 4px;
      }
      .grand-total-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 16px 0;
        padding-top: 12px;
        border-top: 2px dashed #e2e8f0;
      }
      .customer-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
      }
      .phone-input-wrapper {
        position: relative;
      }
      .customer-suggestions-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        max-height: 240px;
        overflow-y: auto;
      }
      .customer-suggestion-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        border-bottom: 1px solid #f1f5f9;
        cursor: pointer;
        transition: background 0.15s ease-in-out;
      }
      .customer-suggestion-item:hover {
        background: #f0fdfa;
      }
      .cust-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .cust-name {
        font-weight: 600;
        font-size: 0.88rem;
        color: #0f172a;
      }
      .cust-phone {
        font-size: 0.8rem;
        color: #0d9488;
        font-weight: 500;
      }
      .cust-extra {
        font-size: 0.78rem;
        color: #64748b;
      }
      .customer-found-badge {
        font-size: 0.75rem;
        padding: 4px 8px;
        border-radius: 6px;
      }
      .field-required {
        --border-color: #f59e0b;
      }
      .statutory-alert {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 0.78rem;
        color: #b91c1c;
        font-weight: 600;
      }
      .statutory-alert ion-icon {
        font-size: 1.1rem;
        flex-shrink: 0;
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
  Math = Math;
  searchResults = signal<Medicine[]>([]);
  cart = signal<CartItem[]>([]);

  patientName = '';
  customerPhone = '';
  doctorName = '';
  doctorRegNo = '';

  isExistingCustomer = signal(false);
  isSearchingCustomer = signal(false);
  customerSuggestions = signal<any[]>([]);

  isPaymentModalOpen = signal(false);
  isProcessing = signal(false);
  primaryPaymentMethod = 'CASH';
  tenderedAmount = 0;
  toastMessage = signal<string | null>(null);

  // Split & Credit payment tracking
  isSplitPayment = signal(false);
  splitCashAmount = 0;
  splitUpiAmount = 0;
  splitCardAmount = 0;
  splitCreditAmount = 0;
  splitReferenceNumber = '';

  totalSplitPaid = computed(() => {
    return (
      (Number(this.splitCashAmount) || 0) +
      (Number(this.splitUpiAmount) || 0) +
      (Number(this.splitCardAmount) || 0) +
      (Number(this.splitCreditAmount) || 0)
    );
  });

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

  billDiscountPercent = signal<number>(0);

  // Live Cart Calculations
  subtotal = computed(() => {
    return this.cart().reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  });

  itemDiscountTotal = computed(() => {
    return this.cart().reduce((sum, item) => {
      const lineGross = item.unitPrice * item.quantity;
      return sum + (lineGross * (item.discountPercent || 0)) / 100;
    }, 0);
  });

  taxableBeforeBillDiscount = computed(() => {
    return Math.max(0, this.subtotal() - this.itemDiscountTotal());
  });

  billDiscountAmount = computed(() => {
    return (this.taxableBeforeBillDiscount() * (this.billDiscountPercent() || 0)) / 100;
  });

  taxableAmount = computed(() => {
    return Math.max(0, this.taxableBeforeBillDiscount() - this.billDiscountAmount());
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

  requiresPrescription = computed(() => {
    return this.cart().some((i) => i.medicine.prescriptionCategory !== 'OTC');
  });

  requiresDoctorRegNo = computed(() => {
    return this.cart().some((i) =>
      ['SCHEDULE_H1', 'SCHEDULE_X'].includes(i.medicine.prescriptionCategory),
    );
  });

  constructor(
    private apiService: ApiService,
    public authService: AuthService,
    private alertController: AlertController,
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
      walletOutline,
      qrCodeOutline,
    });
  }

  ngOnInit() {}

  onSearchChange(event: any) {
    const raw = event?.detail?.value ?? event?.target?.value ?? '';
    const val = raw ? String(raw).trim() : '';

    if (!val || val.length < 1) {
      this.searchResults.set([]);
      return;
    }

    this.apiService.getMedicines({ search: val, limit: 12 }).subscribe({
      next: (res) => {
        this.searchResults.set(res?.items || []);
      },
      error: () => {
        this.searchResults.set([]);
      },
    });
  }

  onSearchClear() {
    this.searchResults.set([]);
  }

  onSearchEnter() {
    const results = this.searchResults();
    if (results.length > 0) {
      this.addToCart(results[0]);
      this.searchResults.set([]);
    }
  }

  getMaxAllowedQty(item: CartItem): number {
    const totalAvail = Number(item.medicine.totalAvailableStock) || 0;
    const factor = item.conversionFactor || 1;
    if (totalAvail <= 0) return 0;
    // Maximum sale units that can be dispensed without exceeding available base stock
    const maxUnits = Math.floor(totalAvail / factor);
    return maxUnits > 0 ? maxUnits : 0;
  }

  preventInvalidKey(event: KeyboardEvent) {
    // Prevent typing '-', '+', 'e', 'E', '.' to block negative, decimal, or exponent inputs
    if (['-', '+', 'e', 'E', '.'].includes(event.key)) {
      event.preventDefault();
    }
  }

  addToCart(med: Medicine) {
    const totalAvail = Number(med.totalAvailableStock) || 0;
    if (totalAvail <= 0) {
      this.toastMessage.set(`"${med.name}" is OUT OF STOCK. Cannot add to bill.`);
      this.searchResults.set([]);
      return;
    }

    const current = this.cart();
    const existingIndex = current.findIndex((c) => c.medicine.id === med.id);

    if (existingIndex > -1) {
      this.increaseQty(existingIndex);
    } else {
      const factor = med.conversionFactor || med.packSize || 10;
      let defaultUnit = med.purchaseUnit || 'STRIP';
      let chosenFactor = factor;

      // If available stock is less than 1 pack/strip, default to loose base unit so it can still be sold
      if (totalAvail < factor) {
        defaultUnit = med.baseUnit || 'TABLET';
        chosenFactor = 1;
      }

      const isBaseUnit = chosenFactor === 1;
      const unitPrice = isBaseUnit
        ? (med.unitSellingPrice ? Number(med.unitSellingPrice) : Number((Number(med.sellingPrice) / factor).toFixed(2)))
        : Number(med.sellingPrice);

      const gstRate = Number(med.gstRate);
      const halfRate = gstRate / 2;
      const cgst = (unitPrice * halfRate) / 100;
      const sgst = (unitPrice * halfRate) / 100;
      const total = unitPrice + cgst + sgst;

      const newItem: CartItem = {
        medicine: med,
        selectedBatch: med.batches?.[0], // FEFO earliest batch
        quantity: 1,
        saleUnit: defaultUnit,
        conversionFactor: chosenFactor,
        unitPrice,
        mrp: Number(med.mrp),
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

  selectUnit(index: number, newUnit: string) {
    const items = [...this.cart()];
    const item = { ...items[index] };
    const med = item.medicine;
    const factor = med.conversionFactor || med.packSize || 10;
    const isBaseUnit = newUnit === (med.baseUnit || 'TABLET') || newUnit === 'PIECE' || newUnit === 'UNIT';

    item.saleUnit = newUnit;
    item.conversionFactor = isBaseUnit ? 1 : factor;

    // Recalculate price per unit
    if (isBaseUnit) {
      item.unitPrice = med.unitSellingPrice ? Number(med.unitSellingPrice) : Number((Number(med.sellingPrice) / factor).toFixed(2));
    } else {
      item.unitPrice = Number(med.sellingPrice);
    }

    // Check if current quantity in the new unit exceeds available stock
    const maxAllowed = this.getMaxAllowedQty(item);
    if (maxAllowed <= 0) {
      this.toastMessage.set(`Insufficient stock to sell as ${newUnit}. Available: ${med.totalAvailableStock || 0} ${med.baseUnit || 'units'}.`);
      return;
    }

    if (item.quantity > maxAllowed) {
      item.quantity = maxAllowed;
      this.toastMessage.set(`Adjusted quantity to max available: ${maxAllowed} ${item.saleUnit}.`);
    }

    this.recalculateItem(item);
    items[index] = item;
    this.cart.set(items);
  }

  onUnitChange(index: number, event: any) {
    const newUnit = event?.target?.value || event;
    this.selectUnit(index, newUnit);
  }

  increaseQty(index: number) {
    const items = [...this.cart()];
    const item = { ...items[index] };
    const maxAllowed = this.getMaxAllowedQty(item);

    if (item.quantity >= maxAllowed) {
      this.toastMessage.set(`Cannot add more than available stock (${item.medicine.totalAvailableStock || 0} ${item.medicine.baseUnit || 'units'}).`);
      return;
    }

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
    const inputVal = event?.target?.value;
    const val = parseInt(inputVal, 10);
    const items = [...this.cart()];
    const item = { ...items[index] };
    const maxAllowed = this.getMaxAllowedQty(item);

    // Validate against negative, zero, or NaN
    if (isNaN(val) || val <= 0) {
      this.toastMessage.set('Quantity must be at least 1. Resetting to 1.');
      item.quantity = 1;
      event.target.value = 1;
    } else if (val > maxAllowed) {
      this.toastMessage.set(`Cannot exceed available stock (${item.medicine.totalAvailableStock || 0} ${item.medicine.baseUnit || 'units'}). Max allowed: ${maxAllowed} ${item.saleUnit}.`);
      item.quantity = Math.max(1, maxAllowed);
      event.target.value = item.quantity;
    } else {
      item.quantity = val;
    }

    this.recalculateItem(item);
    items[index] = item;
    this.cart.set(items);
  }

  async removeFromCart(index: number) {
    const item = this.cart()[index];
    if (!item) return;

    const alert = await this.alertController.create({
      header: 'Remove Item',
      message: `Remove "${item.medicine.name}" from current bill?`,
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'alert-btn-cancel',
        },
        {
          text: 'Remove',
          role: 'destructive',
          cssClass: 'alert-btn-danger',
          handler: () => {
            const items = [...this.cart()];
            items.splice(index, 1);
            this.cart.set(items);
          },
        },
      ],
    });

    await alert.present();
  }

  setDiscount(index: number, event: any) {
    const inputVal = event?.target?.value;
    let val = parseFloat(inputVal);
    const items = [...this.cart()];
    const item = { ...items[index] };

    if (isNaN(val) || val < 0) {
      val = 0;
      event.target.value = 0;
    } else if (val > 100) {
      this.toastMessage.set('Discount cannot exceed 100%. Set to 100%.');
      val = 100;
      event.target.value = 100;
    }

    item.discountPercent = val;
    this.recalculateItem(item);
    items[index] = item;
    this.cart.set(items);
  }

  increaseDiscount(index: number) {
    const items = [...this.cart()];
    const item = { ...items[index] };
    const current = Number(item.discountPercent) || 0;
    if (current < 100) {
      item.discountPercent = Math.min(100, current + 1);
      this.recalculateItem(item);
      items[index] = item;
      this.cart.set(items);
    }
  }

  decreaseDiscount(index: number) {
    const items = [...this.cart()];
    const item = { ...items[index] };
    const current = Number(item.discountPercent) || 0;
    if (current > 0) {
      item.discountPercent = Math.max(0, current - 1);
      this.recalculateItem(item);
      items[index] = item;
      this.cart.set(items);
    }
  }

  adjustBillDiscount(delta: number) {
    const current = Number(this.billDiscountPercent()) || 0;
    const nextVal = Math.min(100, Math.max(0, current + delta));
    this.billDiscountPercent.set(nextVal);
  }

  setBillDiscount(event: any) {
    const inputVal = event?.target?.value;
    let val = parseFloat(inputVal);

    if (isNaN(val) || val < 0) {
      val = 0;
      event.target.value = 0;
    } else if (val > 100) {
      this.toastMessage.set('Bill discount cannot exceed 100%. Set to 100%.');
      val = 100;
      event.target.value = 100;
    }

    this.billDiscountPercent.set(val);
  }

  async clearCart() {
    if (this.cart().length === 0) return;

    const alert = await this.alertController.create({
      header: 'Clear Entire Bill',
      message: 'Are you sure you want to remove all items from this bill?',
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'alert-btn-cancel',
        },
        {
          text: 'Clear All',
          role: 'destructive',
          cssClass: 'alert-btn-danger',
          handler: () => {
            this.cart.set([]);
            this.billDiscountPercent.set(0);
          },
        },
      ],
    });

    await alert.present();
  }

  private recalculateItem(item: CartItem) {
    // Ensure all fields are numbers (guard against stale string values)
    const unitPrice = Number(item.unitPrice);
    const discountPercent = Number(item.discountPercent);
    const gstRate = Number(item.gstRate);
    const lineGross = unitPrice * item.quantity;
    const discount = (lineGross * discountPercent) / 100;
    const taxable = lineGross - discount;
    const halfGst = gstRate / 2;
    item.unitPrice = unitPrice;
    item.discountPercent = discountPercent;
    item.gstRate = gstRate;
    item.taxableAmount = taxable;
    item.cgstAmount = (taxable * halfGst) / 100;
    item.sgstAmount = (taxable * halfGst) / 100;
    item.totalAmount = taxable + item.cgstAmount + item.sgstAmount;
  }

  openPaymentModal() {
    // 1. Verify all items have positive quantity and do not exceed available stock
    for (const item of this.cart()) {
      if (!item.quantity || item.quantity <= 0) {
        this.toastMessage.set(`Invalid quantity for "${item.medicine.name}". Quantity must be at least 1.`);
        return;
      }

      const totalAvail = Number(item.medicine.totalAvailableStock) || 0;
      if (totalAvail <= 0) {
        this.toastMessage.set(`"${item.medicine.name}" is OUT OF STOCK. Remove it from the bill before proceeding.`);
        return;
      }

      const baseNeeded = item.quantity * (item.conversionFactor || 1);
      if (baseNeeded > totalAvail) {
        this.toastMessage.set(
          `Stock limit exceeded for "${item.medicine.name}". Requested: ${item.quantity} ${item.saleUnit} (${baseNeeded} units), Available: ${totalAvail} units.`
        );
        return;
      }
    }

    if (this.requiresPrescription() && (!this.patientName.trim() || !this.doctorName.trim())) {
      this.toastMessage.set('Prescription items detected: Patient Name and Doctor Name are required.');
      return;
    }

    if (this.requiresDoctorRegNo() && !this.doctorRegNo?.trim()) {
      this.toastMessage.set('Statutory Requirement: Doctor Reg # is mandatory for Schedule H1 / Schedule X drugs.');
      return;
    }

    this.tenderedAmount = this.grandTotal();
    this.isSplitPayment.set(false);
    this.splitCashAmount = this.grandTotal();
    this.splitUpiAmount = 0;
    this.splitCardAmount = 0;
    this.splitCreditAmount = 0;
    this.splitReferenceNumber = '';
    this.isPaymentModalOpen.set(true);
  }

  toggleSplitPayment() {
    this.isSplitPayment.set(!this.isSplitPayment());
    if (this.isSplitPayment()) {
      this.splitCashAmount = this.grandTotal();
      this.splitUpiAmount = 0;
      this.splitCardAmount = 0;
      this.splitCreditAmount = 0;
    } else {
      this.tenderedAmount = this.grandTotal();
    }
  }

  closePaymentModal() {
    this.isPaymentModalOpen.set(false);
  }

  executeCheckout() {
    // Final verification before checkout
    for (const item of this.cart()) {
      if (!item.quantity || item.quantity <= 0) {
        this.toastMessage.set(`Invalid quantity for "${item.medicine.name}". Quantity must be at least 1.`);
        return;
      }

      const totalAvail = Number(item.medicine.totalAvailableStock) || 0;
      const baseNeeded = item.quantity * (item.conversionFactor || 1);
      if (baseNeeded > totalAvail) {
        this.toastMessage.set(
          `Stock limit exceeded for "${item.medicine.name}". Requested: ${item.quantity} ${item.saleUnit} (${baseNeeded} units), Available: ${totalAvail} units.`
        );
        return;
      }
    }

    if (this.requiresDoctorRegNo() && !this.doctorRegNo?.trim()) {
      this.toastMessage.set('Statutory Requirement: Doctor Reg # is mandatory for Schedule H1 / Schedule X drugs.');
      return;
    }

    // Build payments array
    let payments: any[] = [];
    if (this.isSplitPayment()) {
      const splitTotal = this.totalSplitPaid();
      if (splitTotal !== this.grandTotal() && this.splitCreditAmount === 0 && splitTotal < this.grandTotal()) {
        this.toastMessage.set(
          `Split payment total (₹${splitTotal}) does not match Grand Total (₹${this.grandTotal()}). Add difference to Credit/Due or adjust payment.`,
        );
        return;
      }

      if (Number(this.splitCashAmount) > 0) {
        payments.push({ paymentMethod: 'CASH', amount: Number(this.splitCashAmount) });
      }
      if (Number(this.splitUpiAmount) > 0) {
        payments.push({
          paymentMethod: 'UPI',
          amount: Number(this.splitUpiAmount),
          referenceNumber: this.splitReferenceNumber || undefined,
        });
      }
      if (Number(this.splitCardAmount) > 0) {
        payments.push({
          paymentMethod: 'CARD',
          amount: Number(this.splitCardAmount),
          referenceNumber: this.splitReferenceNumber || undefined,
        });
      }
      if (Number(this.splitCreditAmount) > 0) {
        payments.push({
          paymentMethod: 'CREDIT',
          amount: Number(this.splitCreditAmount),
        });
      }

      // Check if partial/credit requires customer phone or name
      const actualMoney = (Number(this.splitCashAmount) || 0) + (Number(this.splitUpiAmount) || 0) + (Number(this.splitCardAmount) || 0);
      if (actualMoney < this.grandTotal() && !this.customerPhone?.trim() && !this.patientName?.trim()) {
        this.toastMessage.set('Customer Phone or Patient Name is required for Credit / Partial Due bills.');
        return;
      }
    } else {
      if (this.primaryPaymentMethod === 'CREDIT') {
        if (!this.customerPhone?.trim() && !this.patientName?.trim()) {
          this.toastMessage.set('Customer Phone or Patient Name is required for 100% Credit bills.');
          return;
        }
        payments.push({
          paymentMethod: 'CREDIT',
          amount: this.grandTotal(),
        });
      } else {
        payments.push({
          paymentMethod: this.primaryPaymentMethod,
          amount: Number(this.tenderedAmount),
        });
      }
    }

    this.isProcessing.set(true);

    const idempotencyKey = `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const payload = {
      idempotencyKey,
      patientName: this.patientName || undefined,
      customerPhone: this.customerPhone || undefined,
      doctorName: this.doctorName || undefined,
      doctorRegNo: this.doctorRegNo || undefined,
      billDiscountPercent: Number(this.billDiscountPercent()) || 0,
      items: this.cart().map((item) => ({
        medicineId: item.medicine.id,
        quantity: item.quantity,
        saleUnit: item.saleUnit || (item.conversionFactor === 1 ? item.medicine.baseUnit : item.medicine.purchaseUnit) || 'STRIP',
        conversionFactor: item.conversionFactor || 1,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
      })),
      payments,
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
          this.billDiscountPercent.set(0);
          this.patientName = '';
          this.customerPhone = '';
          this.doctorName = '';
          this.doctorRegNo = '';
          this.isExistingCustomer.set(false);
          this.customerSuggestions.set([]);
        }, 500);
      },
      error: (err) => {
        this.isProcessing.set(false);
        this.toastMessage.set(err.error?.message || 'Checkout failed. Please check stock availability.');
      },
    });
  }

  onCustomerPhoneFocus() {
    if (this.customerPhone && this.customerPhone.trim().length >= 2) {
      this.searchCustomers(this.customerPhone.trim());
    }
  }

  onCustomerPhoneInput(event: any) {
    const rawVal = event?.detail?.value ?? event?.target?.value ?? this.customerPhone ?? '';
    const q = rawVal.trim();

    if (q.length >= 2) {
      this.searchCustomers(q);
    } else {
      this.customerSuggestions.set([]);
      this.isExistingCustomer.set(false);
    }
  }

  private searchCustomers(query: string) {
    this.isSearchingCustomer.set(true);
    this.apiService.getCustomers(query).subscribe({
      next: (customers) => {
        this.isSearchingCustomer.set(false);
        const list = customers || [];
        this.customerSuggestions.set(list);

        // Check if there is an exact phone match
        const cleanedDigits = query.replace(/\D/g, '');
        if (cleanedDigits.length >= 10) {
          const exactMatch = list.find((c: any) => {
            const p = (c.phone || '').replace(/\D/g, '');
            return p === cleanedDigits || p.endsWith(cleanedDigits) || cleanedDigits.endsWith(p);
          });
          if (exactMatch) {
            this.selectCustomer(exactMatch);
          }
        }
      },
      error: () => {
        this.isSearchingCustomer.set(false);
        this.customerSuggestions.set([]);
      },
    });
  }

  selectCustomer(customer: any) {
    this.customerPhone = customer.phone || this.customerPhone;
    this.patientName = customer.name || this.patientName;
    this.doctorName = customer.doctorName || this.doctorName;
    this.doctorRegNo = customer.doctorRegNo || this.doctorRegNo;
    this.isExistingCustomer.set(true);
    this.customerSuggestions.set([]);
    this.toastMessage.set(`Selected registered patient: ${customer.name}`);
  }
}
