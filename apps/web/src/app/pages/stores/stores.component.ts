import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  addOutline,
  medkitOutline,
  cubeOutline,
  cartOutline,
  peopleOutline,
  checkmarkCircleOutline,
  closeOutline,
  refreshOutline,
  arrowForwardOutline,
} from 'ionicons/icons';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-stores',
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
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
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
        <ion-title>SaaS Tenant Stores & Branches</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" (click)="loadStores()">
            <ion-icon name="refresh-outline" slot="icon-only"></ion-icon>
          </ion-button>
          <ion-button fill="solid" color="light" (click)="openCreateModal()">
            <ion-icon name="add-outline" slot="start"></ion-icon>
            Onboard Store
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-content">
      <div class="saas-header-banner ion-margin-bottom">
        <div>
          <h2>Super Admin Console</h2>
          <p>Manage multi-tenant pharmacy branches, drug licenses, GSTIN compliance, and branch analytics.</p>
        </div>
        <ion-badge color="success" class="saas-badge">Multi-Tenant Active</ion-badge>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="loading-state">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Loading pharmacy tenant stores...</p>
      </div>

      <!-- Stores Grid -->
      <ion-grid [fixed]="true" *ngIf="!isLoading()">
        <ion-row>
          <ion-col size="12" sizeMd="6" sizeLg="4" *ngFor="let store of stores()">
            <ion-card class="store-card">
              <ion-card-header>
                <div class="card-top-row">
                  <ion-badge [color]="store.isActive ? 'primary' : 'medium'" class="code-badge">
                    {{ store.code }}
                  </ion-badge>
                  <ion-badge [color]="isCurrentStore(store.id) ? 'success' : 'light'">
                    {{ isCurrentStore(store.id) ? 'ACTIVE CONTEXT' : 'STANDBY' }}
                  </ion-badge>
                </div>
                <ion-card-title class="store-name">{{ store.name }}</ion-card-title>
                <ion-card-subtitle class="store-location">{{ store.city }}, {{ store.state }}</ion-card-subtitle>
              </ion-card-header>

              <ion-card-content>
                <div class="compliance-box">
                  <div class="compliance-item">
                    <span class="label">GSTIN:</span>
                    <span class="font-mono value">{{ store.gstin }}</span>
                  </div>
                  <div class="compliance-item">
                    <span class="label">Drug License:</span>
                    <span class="font-mono value">{{ store.drugLicenseNumber }}</span>
                  </div>
                  <div class="compliance-item">
                    <span class="label">State Code:</span>
                    <span class="value">{{ store.stateCode }}</span>
                  </div>
                </div>

                <div class="metrics-row ion-margin-top">
                  <div class="metric-pill">
                    <ion-icon name="medkit-outline"></ion-icon>
                    <span><strong>{{ store._count?.medicines || 0 }}</strong> Meds</span>
                  </div>
                  <div class="metric-pill">
                    <ion-icon name="cube-outline"></ion-icon>
                    <span><strong>{{ store._count?.batches || 0 }}</strong> Batches</span>
                  </div>
                  <div class="metric-pill">
                    <ion-icon name="cart-outline"></ion-icon>
                    <span><strong>{{ store._count?.sales || 0 }}</strong> Sales</span>
                  </div>
                  <div class="metric-pill">
                    <ion-icon name="people-outline"></ion-icon>
                    <span><strong>{{ store._count?.userRoles || 0 }}</strong> Staff</span>
                  </div>
                </div>

                <div class="store-actions ion-margin-top">
                  <ion-button
                    expand="block"
                    [fill]="isCurrentStore(store.id) ? 'outline' : 'solid'"
                    color="primary"
                    (click)="switchToStore(store)"
                  >
                    <ion-icon name="arrow-forward-outline" slot="end"></ion-icon>
                    {{ isCurrentStore(store.id) ? 'Current Active Store' : 'Switch Context to Store' }}
                  </ion-button>
                </div>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>

      <!-- Onboard New Store Modal -->
      <ion-modal [isOpen]="isCreateModalOpen()" (didDismiss)="closeCreateModal()">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>Onboard New Pharmacy Branch</ion-title>
              <ion-button slot="end" fill="clear" color="light" (click)="closeCreateModal()">
                <ion-icon name="close-outline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-toolbar>
          </ion-header>

          <ion-content class="ion-padding">
            <form [formGroup]="storeForm" (ngSubmit)="submitCreateStore()">
              <ion-grid>
                <ion-row>
                  <ion-col size="12" sizeMd="8">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        label="Store Name *"
                        labelPlacement="floating"
                        formControlName="name"
                        placeholder="e.g. MedPlus Pharmacy Koramangala"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="12" sizeMd="4">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        label="Store Code *"
                        labelPlacement="floating"
                        formControlName="code"
                        placeholder="e.g. MEDPLUS-KOR"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                </ion-row>

                <ion-row>
                  <ion-col size="12" sizeMd="6">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        label="Drug License Number (Form 20B/21B) *"
                        labelPlacement="floating"
                        formControlName="drugLicenseNumber"
                        placeholder="e.g. KA-B2-998877"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="12" sizeMd="6">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        label="15-digit GSTIN *"
                        labelPlacement="floating"
                        formControlName="gstin"
                        placeholder="e.g. 29ABCDE1234F1Z5"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                </ion-row>

                <ion-row>
                  <ion-col size="12">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        label="Physical Address *"
                        labelPlacement="floating"
                        formControlName="address"
                        placeholder="Building, Street, Landmark"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                </ion-row>

                <ion-row>
                  <ion-col size="12" sizeMd="4">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        label="City *"
                        labelPlacement="floating"
                        formControlName="city"
                        placeholder="e.g. Bengaluru"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="12" sizeMd="4">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        label="State *"
                        labelPlacement="floating"
                        formControlName="state"
                        placeholder="e.g. Karnataka"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="6" sizeMd="2">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        label="State Code *"
                        labelPlacement="floating"
                        formControlName="stateCode"
                        placeholder="29"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="6" sizeMd="2">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        label="Pincode *"
                        labelPlacement="floating"
                        formControlName="pincode"
                        placeholder="560034"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                </ion-row>

                <ion-row>
                  <ion-col size="12" sizeMd="6">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        label="Official Phone *"
                        labelPlacement="floating"
                        formControlName="phone"
                        placeholder="+91 80 1234 5678"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                  <ion-col size="12" sizeMd="6">
                    <ion-item fill="outline" class="form-item">
                      <ion-input
                        label="Official Email *"
                        labelPlacement="floating"
                        formControlName="email"
                        placeholder="branch@pharmacy.local"
                      ></ion-input>
                    </ion-item>
                  </ion-col>
                </ion-row>
              </ion-grid>

              <div class="modal-actions ion-margin-top">
                <ion-button fill="outline" color="medium" (click)="closeCreateModal()">
                  Cancel
                </ion-button>
                <ion-button type="submit" color="primary" [disabled]="storeForm.invalid || isSubmitting()">
                  <ion-spinner *ngIf="isSubmitting()" name="dots"></ion-spinner>
                  <span *ngIf="!isSubmitting()">Onboard Pharmacy Branch</span>
                </ion-button>
              </div>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>

      <!-- Toast Feedback -->
      <ion-toast
        [isOpen]="toastMessage() !== ''"
        [message]="toastMessage()"
        [duration]="3000"
        (didDismiss)="toastMessage.set('')"
      ></ion-toast>
    </ion-content>
  `,
  styles: [
    `
      .saas-header-banner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
        color: #ffffff;
        padding: 20px 24px;
        border-radius: 12px;
      }
      .saas-header-banner h2 {
        margin: 0 0 6px 0;
        font-weight: 700;
        font-size: 1.4rem;
      }
      .saas-header-banner p {
        margin: 0;
        opacity: 0.9;
        font-size: 0.9rem;
      }
      .saas-badge {
        font-size: 0.85rem;
        padding: 8px 12px;
        border-radius: 20px;
      }
      .store-card {
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        border: 1px solid #e2e8f0;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .store-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
      }
      .card-top-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .code-badge {
        font-family: monospace;
        letter-spacing: 0.5px;
      }
      .store-name {
        font-weight: 700;
        font-size: 1.15rem;
        color: #0f172a;
      }
      .store-location {
        color: #64748b;
        font-size: 0.85rem;
      }
      .compliance-box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 10px 12px;
      }
      .compliance-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
        font-size: 0.82rem;
      }
      .compliance-item:last-child {
        margin-bottom: 0;
      }
      .compliance-item .label {
        color: #64748b;
      }
      .compliance-item .value {
        color: #1e293b;
        font-weight: 600;
      }
      .metrics-row {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }
      .metric-pill {
        display: flex;
        align-items: center;
        gap: 6px;
        background: #f1f5f9;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 0.82rem;
        color: #334155;
      }
      .metric-pill ion-icon {
        color: var(--ion-color-primary);
        font-size: 16px;
      }
      .loading-state {
        text-align: center;
        padding: 60px 20px;
        color: #64748b;
      }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      .font-mono {
        font-family: monospace;
      }
    `,
  ],
})
export class StoresComponent implements OnInit {
  stores = signal<any[]>([]);
  isLoading = signal(true);
  isCreateModalOpen = signal(false);
  isSubmitting = signal(false);
  toastMessage = signal('');

  storeForm: FormGroup;

  constructor(
    private apiService: ApiService,
    public authService: AuthService,
    private fb: FormBuilder,
  ) {
    addIcons({
      businessOutline,
      addOutline,
      medkitOutline,
      cubeOutline,
      cartOutline,
      peopleOutline,
      checkmarkCircleOutline,
      closeOutline,
      refreshOutline,
      arrowForwardOutline,
    });

    this.storeForm = this.fb.group({
      name: ['', Validators.required],
      code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9-]+$/)]],
      drugLicenseNumber: ['', Validators.required],
      gstin: ['', [Validators.required, Validators.minLength(15), Validators.maxLength(15)]],
      address: ['', Validators.required],
      city: ['', Validators.required],
      state: ['Karnataka', Validators.required],
      stateCode: ['29', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
      pincode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit() {
    this.loadStores();
  }

  loadStores() {
    this.isLoading.set(true);
    this.apiService.getStores().subscribe({
      next: (data) => {
        this.stores.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load stores', err);
        this.toastMessage.set('Failed to load stores: ' + (err.error?.message || err.message));
        this.isLoading.set(false);
      },
    });
  }

  isCurrentStore(storeId: string): boolean {
    return this.authService.activeStore()?.id === storeId;
  }

  switchToStore(store: any) {
    this.authService.selectStore(store.id).subscribe({
      next: () => {
        this.toastMessage.set(`Switched active context to ${store.name}`);
      },
      error: (err) => {
        this.toastMessage.set('Could not switch store: ' + (err.error?.message || err.message));
      },
    });
  }

  openCreateModal() {
    this.storeForm.reset({
      state: 'Karnataka',
      stateCode: '29',
    });
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal() {
    this.isCreateModalOpen.set(false);
  }

  submitCreateStore() {
    if (this.storeForm.invalid) return;

    this.isSubmitting.set(true);
    const formVal = this.storeForm.value;
    formVal.code = formVal.code.toUpperCase();

    this.apiService.createStore(formVal).subscribe({
      next: (newStore) => {
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.toastMessage.set(`Successfully onboarded ${newStore.name}!`);
        this.loadStores();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toastMessage.set('Failed to onboard store: ' + (err.error?.message || err.message));
      },
    });
  }
}
