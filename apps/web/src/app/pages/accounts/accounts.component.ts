import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination.component';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSearchbar,
  IonButton,
  IonIcon,
  IonBadge,
  IonModal,
  IonItem,
  IonInput,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonToast,
  IonSpinner,
  IonMenuButton,
  IonButtons,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  businessOutline,
  addOutline,
  cashOutline,
  receiptOutline,
  callOutline,
  mailOutline,
  closeOutline,
  checkmarkCircleOutline,
  walletOutline,
  timeOutline,
} from 'ionicons/icons';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonButton,
    IonIcon,
    IonBadge,
    IonModal,
    IonItem,
    IonInput,
    IonLabel,
    IonSegment,
    IonSegmentButton,
    IonToast,
    IonSpinner,
    IonMenuButton,
    IonButtons,
    IonSelect,
    IonSelectOption,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Accounts & Ledgers (Suppliers & Customers)</ion-title>
        <ion-buttons slot="end">
          <ion-button *ngIf="activeTab() === 'suppliers'" fill="solid" color="light" (click)="openAddSupplierModal()">
            <ion-icon name="add-outline" slot="start"></ion-icon>
            Add Supplier
          </ion-button>
          <ion-button *ngIf="activeTab() === 'customers'" fill="solid" color="light" (click)="openAddCustomerModal()">
            <ion-icon name="add-outline" slot="start"></ion-icon>
            Add Customer
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar color="light">
        <ion-segment [value]="activeTab()" (ionChange)="onTabChange($event)">
          <ion-segment-button value="suppliers">
            <ion-label>
              <ion-icon name="business-outline"></ion-icon>
              Suppliers (Payables & Outstanding)
            </ion-label>
          </ion-segment-button>
          <ion-segment-button value="customers">
            <ion-label>
              <ion-icon name="people-outline"></ion-icon>
              Customers & Patients
            </ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding content-bg">
      <!-- Search Filter Bar -->
      <div class="search-box">
        <ion-searchbar
          [placeholder]="activeTab() === 'suppliers' ? 'Search supplier name, phone, or GSTIN...' : 'Search patient name or phone...'"
          (ionInput)="onSearch($event)"
          [debounce]="300"
        ></ion-searchbar>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading()">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p>Loading ledger accounts...</p>
      </div>

      <!-- ================= SUPPLIERS TAB ================= -->
      <div *ngIf="activeTab() === 'suppliers' && !isLoading()">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Supplier / Distributor</th>
                <th>Contact</th>
                <th>GSTIN & DL</th>
                <th style="text-align: right;">Total Purchases</th>
                <th style="text-align: right;">Outstanding Payable</th>
                <th style="text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of paginatedSuppliers()">
                <td>
                  <strong>{{ s.name }}</strong>
                  <div class="sub-text">{{ s.contactPerson || 'Direct' }}</div>
                </td>
                <td>
                  <div><ion-icon name="call-outline"></ion-icon> {{ s.phone }}</div>
                  <div class="sub-text" *ngIf="s.email"><ion-icon name="mail-outline"></ion-icon> {{ s.email }}</div>
                </td>
                <td>
                  <div><strong>GST:</strong> {{ s.gstin || 'Unregistered' }}</div>
                  <div class="sub-text" *ngIf="s.dlNumber"><strong>DL:</strong> {{ s.dlNumber }}</div>
                </td>
                <td style="text-align: right;">
                  <ion-badge color="medium">{{ s._count?.purchases || 0 }} bills</ion-badge>
                </td>
                <td style="text-align: right;">
                  <span class="outstanding-pill" [class.has-balance]="+s.outstandingBalance > 0">
                    ₹{{ (+s.outstandingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
                  </span>
                </td>
                <td style="text-align: center;">
                  <ion-button size="small" color="success" (click)="openPaymentModal(s)">
                    <ion-icon name="cash-outline" slot="start"></ion-icon>
                    Pay Voucher
                  </ion-button>
                </td>
              </tr>
              <tr *ngIf="suppliers().length === 0">
                <td colspan="6" class="empty-state">No suppliers registered. Click "Add Supplier" above.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <app-pagination
          *ngIf="suppliers().length > 0"
          [totalItems]="suppliers().length"
          [currentPage]="supplierCurrentPage()"
          [pageSize]="supplierPageSize()"
          [pageSizeOptions]="[10, 25, 50, 100]"
          itemLabel="suppliers"
          (pageChange)="supplierCurrentPage.set($event)"
          (pageSizeChange)="onSupplierPageSizeChange($event)"
        ></app-pagination>
      </div>

      <!-- ================= CUSTOMERS TAB ================= -->
      <div *ngIf="activeTab() === 'customers' && !isLoading()">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Patient / Customer</th>
                <th>Phone</th>
                <th>Prescribed Doctor</th>
                <th>Email</th>
                <th style="text-align: right;">Invoices Dispensed</th>
                <th style="text-align: center;">Created</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of paginatedCustomers()">
                <td>
                  <strong>{{ c.name }}</strong>
                </td>
                <td>
                  <ion-icon name="call-outline"></ion-icon> {{ c.phone }}
                </td>
                <td>
                  <div *ngIf="c.doctorName">
                    <strong>{{ c.doctorName }}</strong>
                    <div class="sub-text" *ngIf="c.doctorRegNo">Reg: {{ c.doctorRegNo }}</div>
                  </div>
                  <span *ngIf="!c.doctorName" class="sub-text">Self / OTC</span>
                </td>
                <td>{{ c.email || '—' }}</td>
                <td style="text-align: right;">
                  <ion-badge color="primary">{{ c._count?.sales || 0 }} sales</ion-badge>
                </td>
                <td style="text-align: center;" class="sub-text">
                  {{ c.createdAt | date:'mediumDate' }}
                </td>
              </tr>
              <tr *ngIf="customers().length === 0">
                <td colspan="6" class="empty-state">No customer records found.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <app-pagination
          *ngIf="customers().length > 0"
          [totalItems]="customers().length"
          [currentPage]="customerCurrentPage()"
          [pageSize]="customerPageSize()"
          [pageSizeOptions]="[10, 25, 50, 100]"
          itemLabel="customers"
          (pageChange)="customerCurrentPage.set($event)"
          (pageSizeChange)="onCustomerPageSizeChange($event)"
        ></app-pagination>
      </div>

      <!-- ================= RECORD SUPPLIER PAYMENT MODAL ================= -->
      <ion-modal [isOpen]="isPaymentModalOpen()">
        <ng-template>
          <ion-header>
            <ion-toolbar color="success">
              <ion-title>Record Supplier Payment Voucher</ion-title>
              <ion-buttons slot="end">
                <ion-button (click)="isPaymentModalOpen.set(false)">
                  <ion-icon name="close-outline"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding" *ngIf="selectedSupplier() as supp">
            <div class="payment-header-card">
              <h3>{{ supp.name }}</h3>
              <p>Current Outstanding Balance: <strong class="text-danger">₹{{ (+supp.outstandingBalance || 0).toFixed(2) }}</strong></p>
            </div>

            <form (ngSubmit)="submitSupplierPayment()">
              <ion-item class="form-item">
                <ion-label position="stacked">Payment Amount (₹)*</ion-label>
                <ion-input type="number" [(ngModel)]="paymentAmount" name="amount" required min="1"></ion-input>
              </ion-item>

              <ion-item class="form-item">
                <ion-label position="stacked">Payment Mode*</ion-label>
                <ion-select
                  [(ngModel)]="paymentMethod"
                  name="method"
                  interface="popover"
                  [interfaceOptions]="{ cssClass: 'custom-popover' }"
                >
                  <ion-select-option value="BANK_TRANSFER">Bank Transfer / NEFT / RTGS</ion-select-option>
                  <ion-select-option value="UPI">UPI / GPay / PhonePe</ion-select-option>
                  <ion-select-option value="CHEQUE">Cheque</ion-select-option>
                  <ion-select-option value="CASH">Cash</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item class="form-item">
                <ion-label position="stacked">Cheque No / UTR Reference</ion-label>
                <ion-input type="text" [(ngModel)]="paymentRef" name="ref" placeholder="e.g. UTR-984128941"></ion-input>
              </ion-item>

              <ion-item class="form-item">
                <ion-label position="stacked">Payment Notes</ion-label>
                <ion-input type="text" [(ngModel)]="paymentNotes" name="notes" placeholder="e.g. Cleared bill for batch 4920"></ion-input>
              </ion-item>

              <div class="modal-actions ion-margin-top">
                <ion-button expand="block" color="success" type="submit" [disabled]="!paymentAmount || paymentAmount <= 0">
                  <ion-icon name="checkmark-circle-outline" slot="start"></ion-icon>
                  Confirm & Deduct Balance
                </ion-button>
              </div>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>

      <!-- ================= ADD SUPPLIER MODAL ================= -->
      <ion-modal [isOpen]="isAddSupplierModalOpen()">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>Add New Supplier / Distributor</ion-title>
              <ion-buttons slot="end">
                <ion-button (click)="isAddSupplierModalOpen.set(false)">
                  <ion-icon name="close-outline"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <form (ngSubmit)="submitAddSupplier()">
              <ion-item class="form-item">
                <ion-label position="stacked">Supplier Name*</ion-label>
                <ion-input type="text" [(ngModel)]="newSupplier.name" name="sname" required placeholder="e.g. Apex Pharma Distributors"></ion-input>
              </ion-item>

              <ion-item class="form-item">
                <ion-label position="stacked">Phone Number*</ion-label>
                <ion-input type="text" [(ngModel)]="newSupplier.phone" name="sphone" required placeholder="e.g. +91 98450 11223"></ion-input>
              </ion-item>

              <ion-item class="form-item">
                <ion-label position="stacked">Contact Person</ion-label>
                <ion-input type="text" [(ngModel)]="newSupplier.contactPerson" name="scontact" placeholder="e.g. Mahesh Patel"></ion-input>
              </ion-item>

              <ion-item class="form-item">
                <ion-label position="stacked">GSTIN (15 Digits)</ion-label>
                <ion-input type="text" [(ngModel)]="newSupplier.gstin" name="sgstin" placeholder="e.g. 29AABCM1234F1Z8"></ion-input>
              </ion-item>

              <ion-item class="form-item">
                <ion-label position="stacked">Drug License No (DL)</ion-label>
                <ion-input type="text" [(ngModel)]="newSupplier.dlNumber" name="sdl" placeholder="e.g. KA-B2-SUP-9988"></ion-input>
              </ion-item>

              <div class="modal-actions ion-margin-top">
                <ion-button expand="block" color="primary" type="submit" [disabled]="!newSupplier.name || !newSupplier.phone">
                  <ion-icon name="checkmark-circle-outline" slot="start"></ion-icon>
                  Save Supplier
                </ion-button>
              </div>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>

      <!-- ================= ADD CUSTOMER MODAL ================= -->
      <ion-modal [isOpen]="isAddCustomerModalOpen()">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>Register New Patient / Customer</ion-title>
              <ion-buttons slot="end">
                <ion-button (click)="isAddCustomerModalOpen.set(false)">
                  <ion-icon name="close-outline"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <form (ngSubmit)="submitAddCustomer()">
              <ion-item class="form-item">
                <ion-label position="stacked">Patient Full Name*</ion-label>
                <ion-input type="text" [(ngModel)]="newCustomer.name" name="cname" required placeholder="e.g. Rajesh Kumar"></ion-input>
              </ion-item>

              <ion-item class="form-item">
                <ion-label position="stacked">Phone Number*</ion-label>
                <ion-input type="text" [(ngModel)]="newCustomer.phone" name="cphone" required placeholder="e.g. +91 98765 43210"></ion-input>
              </ion-item>

              <ion-item class="form-item">
                <ion-label position="stacked">Prescribing Doctor</ion-label>
                <ion-input type="text" [(ngModel)]="newCustomer.doctorName" name="cdoctor" placeholder="e.g. Dr. A. K. Sharma"></ion-input>
              </ion-item>

              <ion-item class="form-item">
                <ion-label position="stacked">Doctor Registration No</ion-label>
                <ion-input type="text" [(ngModel)]="newCustomer.doctorRegNo" name="creg" placeholder="e.g. KMC-49210"></ion-input>
              </ion-item>

              <div class="modal-actions ion-margin-top">
                <ion-button expand="block" color="primary" type="submit" [disabled]="!newCustomer.name || !newCustomer.phone">
                  <ion-icon name="checkmark-circle-outline" slot="start"></ion-icon>
                  Save Customer
                </ion-button>
              </div>
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
      .content-bg {
        --background: #f8fafc;
      }
      .search-box {
        margin-bottom: 16px;
      }
      .loading-state {
        text-align: center;
        padding: 40px;
        color: #64748b;
      }
      .table-responsive {
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        overflow-x: auto;
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;
      }
      .data-table th {
        background: #f1f5f9;
        color: #334155;
        font-weight: 700;
        padding: 12px 16px;
        border-bottom: 2px solid #cbd5e1;
        white-space: nowrap;
      }
      .data-table td {
        padding: 12px 16px;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: middle;
      }
      .sub-text {
        font-size: 0.78rem;
        color: #64748b;
        margin-top: 2px;
      }
      .empty-state {
        text-align: center;
        padding: 40px;
        color: #94a3b8;
      }
      .outstanding-pill {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 6px;
        background: #f1f5f9;
        font-weight: 700;
        color: #475569;
      }
      .outstanding-pill.has-balance {
        background: #fee2e2;
        color: #b91c1c;
      }
      .payment-header-card {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 8px;
        padding: 14px;
        margin-bottom: 16px;
      }
      .payment-header-card h3 {
        margin: 0 0 6px 0;
        color: #166534;
      }
      .text-danger {
        color: #dc2626;
      }
      .form-item {
        --background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        margin-bottom: 12px;
      }
    `,
  ],
})
export class AccountsComponent implements OnInit {
  activeTab = signal<'suppliers' | 'customers'>('suppliers');
  isLoading = signal(false);
  suppliers = signal<any[]>([]);
  customers = signal<any[]>([]);
  toastMessage = signal<string | null>(null);

  // Supplier Pagination
  supplierCurrentPage = signal(1);
  supplierPageSize = signal(10);
  paginatedSuppliers = computed<any[]>(() => {
    const list = this.suppliers();
    const page = this.supplierCurrentPage();
    const size = this.supplierPageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  onSupplierPageSizeChange(size: number) {
    this.supplierPageSize.set(size);
    this.supplierCurrentPage.set(1);
  }

  // Customer Pagination
  customerCurrentPage = signal(1);
  customerPageSize = signal(10);
  paginatedCustomers = computed<any[]>(() => {
    const list = this.customers();
    const page = this.customerCurrentPage();
    const size = this.customerPageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  onCustomerPageSizeChange(size: number) {
    this.customerPageSize.set(size);
    this.customerCurrentPage.set(1);
  }

  // Supplier Payment Modal
  isPaymentModalOpen = signal(false);
  selectedSupplier = signal<any | null>(null);
  paymentAmount: number = 0;
  paymentMethod: string = 'BANK_TRANSFER';
  paymentRef: string = '';
  paymentNotes: string = '';

  // Add Supplier Modal
  isAddSupplierModalOpen = signal(false);
  newSupplier = { name: '', phone: '', contactPerson: '', gstin: '', dlNumber: '' };

  // Add Customer Modal
  isAddCustomerModalOpen = signal(false);
  newCustomer = { name: '', phone: '', doctorName: '', doctorRegNo: '' };

  constructor(private apiService: ApiService) {
    addIcons({
      peopleOutline,
      businessOutline,
      addOutline,
      cashOutline,
      receiptOutline,
      callOutline,
      mailOutline,
      closeOutline,
      checkmarkCircleOutline,
      walletOutline,
      timeOutline,
    });
  }

  ngOnInit() {
    this.loadData();
  }

  onTabChange(event: any) {
    this.activeTab.set(event.detail.value);
    this.loadData();
  }

  onSearch(event: any) {
    const val = event.target.value?.trim() || '';
    if (this.activeTab() === 'suppliers') {
      this.apiService.getSuppliers().subscribe((list) => {
        if (!val) {
          this.suppliers.set(list);
        } else {
          const q = val.toLowerCase();
          this.suppliers.set(
            list.filter(
              (s) =>
                s.name.toLowerCase().includes(q) ||
                s.phone.includes(q) ||
                (s.gstin && s.gstin.toLowerCase().includes(q)),
            ),
          );
        }
      });
    } else {
      this.apiService.getCustomers(val).subscribe((list) => {
        this.customers.set(list);
      });
    }
  }

  loadData() {
    this.isLoading.set(true);
    if (this.activeTab() === 'suppliers') {
      this.apiService.getSuppliers().subscribe({
        next: (data) => {
          this.suppliers.set(data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
    } else {
      this.apiService.getCustomers().subscribe({
        next: (data) => {
          this.customers.set(data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
    }
  }

  openPaymentModal(supplier: any) {
    this.selectedSupplier.set(supplier);
    this.paymentAmount = +supplier.outstandingBalance || 0;
    this.paymentMethod = 'BANK_TRANSFER';
    this.paymentRef = '';
    this.paymentNotes = '';
    this.isPaymentModalOpen.set(true);
  }

  submitSupplierPayment() {
    const supplier = this.selectedSupplier();
    if (!supplier) return;

    this.apiService
      .recordSupplierPayment(supplier.id, {
        amount: Number(this.paymentAmount),
        paymentMethod: this.paymentMethod,
        referenceNumber: this.paymentRef || undefined,
        notes: this.paymentNotes || undefined,
      })
      .subscribe({
        next: (res) => {
          this.isPaymentModalOpen.set(false);
          this.toastMessage.set(`Payment of ₹${this.paymentAmount} recorded. Remaining: ₹${res.remainingBalance}`);
          this.loadData();
        },
        error: (err) => {
          this.toastMessage.set(err.error?.message || 'Payment recording failed');
        },
      });
  }

  openAddSupplierModal() {
    this.newSupplier = { name: '', phone: '', contactPerson: '', gstin: '', dlNumber: '' };
    this.isAddSupplierModalOpen.set(true);
  }

  submitAddSupplier() {
    const payload: any = {
      name: this.newSupplier.name.trim(),
      phone: this.newSupplier.phone.trim(),
      paymentTermsDays: 30,
    };
    if (this.newSupplier.contactPerson?.trim()) payload.contactPerson = this.newSupplier.contactPerson.trim();
    if (this.newSupplier.gstin?.trim()) payload.gstin = this.newSupplier.gstin.trim();
    if (this.newSupplier.dlNumber?.trim()) payload.dlNumber = this.newSupplier.dlNumber.trim();

    this.apiService.createSupplier(payload).subscribe({
      next: () => {
        this.isAddSupplierModalOpen.set(false);
        this.toastMessage.set('Supplier created successfully!');
        this.loadData();
      },
      error: (err) => {
        const msg = Array.isArray(err.error?.message) ? err.error.message.join(', ') : (err.error?.message || 'Failed to create supplier');
        this.toastMessage.set(msg);
      },
    });
  }

  openAddCustomerModal() {
    this.newCustomer = { name: '', phone: '', doctorName: '', doctorRegNo: '' };
    this.isAddCustomerModalOpen.set(true);
  }

  submitAddCustomer() {
    this.apiService.createCustomer(this.newCustomer).subscribe({
      next: () => {
        this.isAddCustomerModalOpen.set(false);
        this.toastMessage.set('Customer registered successfully!');
        this.loadData();
      },
      error: (err) => {
        this.toastMessage.set(err.error?.message || 'Failed to create customer');
      },
    });
  }
}
