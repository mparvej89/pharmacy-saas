import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
  IonButton,
  IonIcon,
  IonBadge,
  IonModal,
  IonItem,
  IonInput,
  IonToast,
  IonSpinner,
  IonMenuButton,
  IonButtons,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  personAddOutline,
  searchOutline,
  closeOutline,
  createOutline,
  eyeOutline,
  medkitOutline,
  callOutline,
  mailOutline,
  medicalOutline,
} from 'ionicons/icons';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PaginationComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonModal,
    IonItem,
    IonInput,
    IonToast,
    IonSpinner,
    IonMenuButton,
    IonButtons,
    IonGrid,
    IonRow,
    IonCol,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button color="light"></ion-menu-button>
        </ion-buttons>
        <ion-title>Customers & Patient Profiles</ion-title>
        <ion-button slot="end" fill="solid" color="light" class="ion-margin-end" (click)="openCreateModal()">
          <ion-icon name="person-add-outline" slot="start"></ion-icon>
          Add Patient
        </ion-button>
      </ion-toolbar>

      <ion-toolbar>
        <div class="search-bar-container">
          <div class="search-box">
            <ion-icon name="search-outline"></ion-icon>
            <input
              id="customer-search-input"
              name="searchQuery"
              type="text"
              placeholder="Search patients by name or phone number..."
              [(ngModel)]="searchQuery"
              (input)="onSearchChange()"
            />
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-content">
      <ion-card class="table-card">
        <ion-card-header class="table-header">
          <div class="header-content">
            <ion-card-title>Registered Patients & Customers ({{ customers().length }})</ion-card-title>
            <span class="sub-text">Includes Schedule drug dispensing history & prescription profile</span>
          </div>
        </ion-card-header>

        <ion-card-content class="ion-no-padding">
          <div class="table-responsive">
            <table class="pharmacy-table">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Mobile Phone</th>
                  <th>Email</th>
                  <th>Prescribing Doctor</th>
                  <th>Doctor Reg #</th>
                  <th class="ion-text-center">Past Invoices</th>
                  <th class="ion-text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let c of paginatedCustomers()">
                  <td>
                    <div class="customer-name-cell">
                      <span class="name-bold">{{ c.name }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="phone-cell">
                      <ion-icon name="call-outline"></ion-icon>
                      <span class="font-mono">{{ c.phone }}</span>
                    </div>
                  </td>
                  <td>
                    <span *ngIf="c.email" class="sub-text">{{ c.email }}</span>
                    <span *ngIf="!c.email" class="text-muted">—</span>
                  </td>
                  <td>{{ c.doctorName || 'Walk-in / None' }}</td>
                  <td>
                    <span *ngIf="c.doctorRegNo" class="font-mono">{{ c.doctorRegNo }}</span>
                    <span *ngIf="!c.doctorRegNo" class="text-muted">—</span>
                  </td>
                  <td class="ion-text-center">
                    <ion-badge color="light" class="sales-count-badge">
                      {{ c._count?.sales || 0 }} bills
                    </ion-badge>
                  </td>
                  <td class="ion-text-center">
                    <div class="action-buttons-group">
                      <button
                        type="button"
                        class="action-btn view"
                        (click)="viewCustomerHistory(c.id)"
                        title="View Patient Prescription History"
                      >
                        <ion-icon name="eye-outline"></ion-icon>
                      </button>
                      <button
                        type="button"
                        class="action-btn edit"
                        (click)="openEditModal(c)"
                        title="Edit Patient Details"
                      >
                        <ion-icon name="create-outline"></ion-icon>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="!customers().length">
                  <td colspan="7" class="ion-text-center ion-padding empty-row">
                    No customers found matching "{{ searchQuery }}". Click "Add Patient" to register.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <app-pagination
            *ngIf="customers().length > 0"
            [totalItems]="customers().length"
            [currentPage]="currentPage()"
            [pageSize]="pageSize()"
            [pageSizeOptions]="[10, 25, 50, 100]"
            itemLabel="patients"
            (pageChange)="onPageChange($event)"
            (pageSizeChange)="onPageSizeChange($event)"
          ></app-pagination>
        </ion-card-content>
      </ion-card>

      <!-- Customer Modal: Create & Edit -->
      <ion-modal [isOpen]="isModalOpen()">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>{{ isEditing() ? 'Edit Customer Profile' : 'Register New Patient' }}</ion-title>
              <ion-button slot="end" fill="clear" color="light" (click)="closeModal()">
                <ion-icon name="close-outline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-toolbar>
          </ion-header>

          <ion-content class="ion-padding modal-content">
            <form [formGroup]="customerForm" (ngSubmit)="saveCustomer()">
              <ion-grid class="ion-no-padding">
                <ion-row>
                  <ion-col size="12">
                    <ion-item fill="outline" class="form-item ion-margin-bottom">
                      <ion-input
                        id="customer-form-name"
                        name="customerName"
                        label="Full Patient / Customer Name *"
                        labelPlacement="floating"
                        placeholder="e.g. Ramesh Kumar"
                        formControlName="name"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                </ion-row>

                <ion-row>
                  <ion-col size="12" size-md="6">
                    <ion-item fill="outline" class="form-item ion-margin-bottom">
                      <ion-input
                        id="customer-form-phone"
                        name="customerPhone"
                        label="Mobile Phone *"
                        labelPlacement="floating"
                        placeholder="e.g. 9876543210"
                        formControlName="phone"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="12" size-md="6">
                    <ion-item fill="outline" class="form-item ion-margin-bottom">
                      <ion-input
                        id="customer-form-email"
                        name="customerEmail"
                        type="email"
                        label="Email Address"
                        labelPlacement="floating"
                        placeholder="patient@example.com"
                        formControlName="email"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                </ion-row>

                <div class="section-divider ion-margin-top ion-margin-bottom">
                  <span>Prescription & Statutory Doctor Details</span>
                </div>

                <ion-row>
                  <ion-col size="12" size-md="6">
                    <ion-item fill="outline" class="form-item ion-margin-bottom">
                      <ion-input
                        id="customer-form-doctor"
                        name="doctorName"
                        label="Prescribing Doctor Name"
                        labelPlacement="floating"
                        placeholder="e.g. Dr. A. Sharma"
                        formControlName="doctorName"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="12" size-md="6">
                    <ion-item fill="outline" class="form-item ion-margin-bottom">
                      <ion-input
                        id="customer-form-doctor-reg"
                        name="doctorRegNo"
                        label="Doctor Registration / MCI #"
                        labelPlacement="floating"
                        placeholder="e.g. MCI-18492"
                        formControlName="doctorRegNo"
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
                [disabled]="customerForm.invalid || isSubmitting()"
              >
                <ion-spinner *ngIf="isSubmitting()" name="crescent" slot="start"></ion-spinner>
                <span *ngIf="!isSubmitting()">{{ isEditing() ? 'Update Customer' : 'Create Customer' }}</span>
              </ion-button>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>

      <!-- Customer Prescription & Dispensing History Modal -->
      <ion-modal [isOpen]="isHistoryModalOpen()" class="history-details-modal">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>Patient History: {{ activeCustomer()?.name }}</ion-title>
              <ion-button slot="end" fill="clear" color="light" (click)="closeHistoryModal()">
                <ion-icon name="close-outline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-toolbar>
          </ion-header>

          <ion-content class="ion-padding">
            <div *ngIf="activeCustomer() as c">
              <!-- Customer Profile Card -->
              <div class="patient-profile-card ion-margin-bottom">
                <div class="profile-header">
                  <h3>{{ c.name }}</h3>
                  <span class="phone-tag font-mono">📱 {{ c.phone }}</span>
                </div>
                <div class="profile-grid">
                  <div><strong>Email:</strong> {{ c.email || 'None' }}</div>
                  <div><strong>Prescribing Doctor:</strong> {{ c.doctorName || 'Walk-in' }}</div>
                  <div><strong>Doctor Reg #:</strong> {{ c.doctorRegNo || 'None' }}</div>
                </div>
              </div>

              <h4 class="history-title">Recent Prescription Dispensing & Invoices ({{ c.sales?.length || 0 }})</h4>
              <div class="table-responsive">
                <table class="pharmacy-table history-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Dispensed Date</th>
                      <th>Medicines Dispensed</th>
                      <th class="ion-text-right">Grand Total</th>
                      <th>Payment Mode</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let s of c.sales">
                      <td class="font-mono font-bold">{{ s.invoiceNumber }}</td>
                      <td>{{ s.saleDate | date:'mediumDate' }}</td>
                      <td>
                        <div class="med-chips">
                          <span *ngFor="let it of s.items" class="med-chip">
                            {{ it.medicine?.name }} (×{{ it.quantity }})
                          </span>
                        </div>
                      </td>
                      <td class="ion-text-right font-bold">₹{{ s.grandTotal }}</td>
                      <td>
                        <ion-badge color="secondary">{{ s.paymentMethod }}</ion-badge>
                      </td>
                      <td>
                        <ion-badge color="success">{{ s.status }}</ion-badge>
                      </td>
                    </tr>
                    <tr *ngIf="!c.sales?.length">
                      <td colspan="6" class="ion-text-center ion-padding">
                        No prior dispensing history recorded for this patient.
                      </td>
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
      .search-bar-container {
        padding: 8px 16px;
        background: #ffffff;
      }
      .search-box {
        display: flex;
        align-items: center;
        background: #f1f5f9;
        border-radius: 8px;
        padding: 8px 12px;
        gap: 8px;
      }
      .search-box input {
        border: none;
        background: transparent;
        outline: none;
        width: 100%;
        font-size: 0.9rem;
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
      .name-bold {
        font-weight: 600;
        color: #0f172a;
      }
      .phone-cell {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #475569;
      }
      .font-mono {
        font-family: monospace;
      }
      .sub-text {
        font-size: 0.8rem;
        color: #64748b;
      }
      .text-muted {
        color: #94a3b8;
      }
      .sales-count-badge {
        font-size: 0.8rem;
        font-weight: 600;
      }
      .action-buttons-group {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .action-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
        background: #ffffff;
        cursor: pointer;
        transition: all 0.15s ease-in-out;
      }
      .action-btn.view {
        color: #0284c7;
      }
      .action-btn.view:hover {
        background: #e0f2fe;
        border-color: #38bdf8;
      }
      .action-btn.edit {
        color: #0d9488;
      }
      .action-btn.edit:hover {
        background: #ccfbf1;
        border-color: #2dd4bf;
      }
      .section-divider {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #64748b;
        letter-spacing: 0.05em;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 6px;
      }
      .patient-profile-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
      }
      .profile-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      .profile-header h3 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 700;
      }
      .profile-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 8px;
        font-size: 0.85rem;
        color: #334155;
      }
      .history-title {
        font-size: 1rem;
        font-weight: 700;
        margin: 16px 0 8px 0;
        color: #1e293b;
      }
      .med-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .med-chip {
        font-size: 0.75rem;
        background: #e2e8f0;
        color: #1e293b;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .history-details-modal {
        --width: 90%;
        --max-width: 900px;
        --height: 85%;
      }
    `,
  ],
})
export class CustomersComponent implements OnInit {
  customers = signal<any[]>([]);
  searchQuery = '';
  isModalOpen = signal(false);
  isEditing = signal(false);
  editingCustomerId = signal<string | null>(null);
  isSubmitting = signal(false);
  toastMessage = signal<string | null>(null);

  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);

  paginatedCustomers = computed<any[]>(() => {
    const list = this.customers();
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

  isHistoryModalOpen = signal(false);
  activeCustomer = signal<any | null>(null);

  customerForm: FormGroup;

  constructor(
    private apiService: ApiService,
    private fb: FormBuilder,
  ) {
    addIcons({
      peopleOutline,
      personAddOutline,
      searchOutline,
      closeOutline,
      createOutline,
      eyeOutline,
      medkitOutline,
      callOutline,
      mailOutline,
      medicalOutline,
    });

    this.customerForm = this.fb.group({
      name: ['', Validators.required],
      phone: ['', Validators.required],
      email: [''],
      doctorName: [''],
      doctorRegNo: [''],
    });
  }

  ngOnInit() {
    this.loadCustomers();
  }

  loadCustomers() {
    this.apiService.getCustomers(this.searchQuery || undefined).subscribe({
      next: (res) => this.customers.set(res || []),
      error: (err) => this.toastMessage.set(err.error?.message || 'Failed to load customers'),
    });
  }

  onSearchChange() {
    this.loadCustomers();
  }

  openCreateModal() {
    this.isEditing.set(false);
    this.editingCustomerId.set(null);
    this.customerForm.reset();
    this.isModalOpen.set(true);
  }

  openEditModal(customer: any) {
    this.isEditing.set(true);
    this.editingCustomerId.set(customer.id);
    this.customerForm.patchValue({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      doctorName: customer.doctorName || '',
      doctorRegNo: customer.doctorRegNo || '',
    });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  saveCustomer() {
    if (this.customerForm.invalid) return;

    this.isSubmitting.set(true);
    const formVal = this.customerForm.value;
    const data = {
      name: formVal.name,
      phone: formVal.phone,
      email: formVal.email || undefined,
      doctorName: formVal.doctorName || undefined,
      doctorRegNo: formVal.doctorRegNo || undefined,
    };

    if (this.isEditing() && this.editingCustomerId()) {
      this.apiService.updateCustomer(this.editingCustomerId()!, data).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toastMessage.set('Customer profile updated successfully.');
          this.closeModal();
          this.loadCustomers();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.toastMessage.set(err.error?.message || 'Failed to update customer');
        },
      });
    } else {
      this.apiService.createCustomer(data).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toastMessage.set('New customer / patient created successfully.');
          this.closeModal();
          this.loadCustomers();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.toastMessage.set(err.error?.message || 'Failed to create customer');
        },
      });
    }
  }

  viewCustomerHistory(id: string) {
    this.apiService.getCustomer(id).subscribe({
      next: (fullCustomer) => {
        this.activeCustomer.set(fullCustomer);
        this.isHistoryModalOpen.set(true);
      },
      error: (err) => {
        this.toastMessage.set(err.error?.message || 'Failed to load customer profile.');
      },
    });
  }

  closeHistoryModal() {
    this.isHistoryModalOpen.set(false);
    this.activeCustomer.set(null);
  }
}
