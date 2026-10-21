import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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
  IonCardSubtitle,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonBadge,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonMenuButton,
  IonButtons,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cashOutline,
  receiptOutline,
  warningOutline,
  timeOutline,
  trendingUpOutline,
  cartOutline,
  arrowForwardOutline,
  refreshOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonBadge,
    IonButton,
    IonList,
    IonItem,
    IonLabel,
    IonRefresher,
    IonRefresherContent,
    IonMenuButton,
    IonButtons,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button color="light"></ion-menu-button>
        </ion-buttons>
        <ion-title>Pharmacy Operations Dashboard</ion-title>
        <ion-button slot="end" fill="clear" (click)="loadDashboard()">
          <ion-icon name="refresh-outline" slot="icon-only"></ion-icon>
        </ion-button>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding dashboard-content">
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="store-badge-bar ion-margin-bottom" *ngIf="authService.activeStore() as store">
        <div class="store-info">
          <h3>{{ store.name }}</h3>
          <p>
            GSTIN: <span class="font-mono">{{ store.gstin }}</span> | DL:
            <span class="font-mono">{{ store.drugLicenseNumber }}</span>
          </p>
        </div>
        <ion-button routerLink="/pos" color="success" size="default">
          <ion-icon name="cart-outline" slot="start"></ion-icon>
          Open POS Billing
        </ion-button>
      </div>

      <!-- Metric Cards Grid -->
      <ion-grid [fixed]="true">
        <ion-row>
          <!-- Today's Sales -->
          <ion-col size="12" size-md="6" size-lg="3">
            <ion-card class="metric-card metric-sales">
              <ion-card-header>
                <div class="metric-header">
                  <ion-card-subtitle>TODAY'S SALES</ion-card-subtitle>
                  <ion-icon name="cash-outline" class="metric-icon"></ion-icon>
                </div>
                <ion-card-title class="metric-value">
                  ₹{{ (data()?.todaySales || 0).toLocaleString('en-IN') }}
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <span class="metric-subtext">
                  {{ data()?.todayTransactions || 0 }} completed transactions
                </span>
              </ion-card-content>
            </ion-card>
          </ion-col>

          <!-- Low Stock Alert -->
          <ion-col size="12" size-md="6" size-lg="3">
            <ion-card class="metric-card metric-warning" routerLink="/inventory">
              <ion-card-header>
                <div class="metric-header">
                  <ion-card-subtitle>LOW STOCK ALERT</ion-card-subtitle>
                  <ion-icon name="warning-outline" class="metric-icon"></ion-icon>
                </div>
                <ion-card-title class="metric-value">
                  {{ data()?.lowStockCount || 0 }}
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <span class="metric-subtext">Medicines below reorder level</span>
              </ion-card-content>
            </ion-card>
          </ion-col>

          <!-- Expiring Batches -->
          <ion-col size="12" size-md="6" size-lg="3">
            <ion-card class="metric-card metric-expiry" routerLink="/inventory">
              <ion-card-header>
                <div class="metric-header">
                  <ion-card-subtitle>EXPIRING SOON (90d)</ion-card-subtitle>
                  <ion-icon name="time-outline" class="metric-icon"></ion-icon>
                </div>
                <ion-card-title class="metric-value">
                  {{ data()?.expiringCount || 0 }}
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <span class="metric-subtext">
                  {{ data()?.expiredCount || 0 }} expired (quarantined)
                </span>
              </ion-card-content>
            </ion-card>
          </ion-col>

          <!-- Inventory Valuation -->
          <ion-col size="12" size-md="6" size-lg="3">
            <ion-card class="metric-card metric-valuation">
              <ion-card-header>
                <div class="metric-header">
                  <ion-card-subtitle>STOCK VALUATION</ion-card-subtitle>
                  <ion-icon name="trending-up-outline" class="metric-icon"></ion-icon>
                </div>
                <ion-card-title class="metric-value">
                  ₹{{ (data()?.stockValuation?.purchaseCostBasis || 0).toLocaleString('en-IN') }}
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <span class="metric-subtext">
                  Purchase cost basis (FIFO)
                </span>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>

        <!-- Payments by Method & Recent Activity -->
        <ion-row class="ion-margin-top">
          <!-- Left: Recent Sales -->
          <ion-col size="12" size-lg="8">
            <ion-card class="data-table-card">
              <ion-card-header>
                <div class="card-title-row">
                  <ion-card-title>Recent Sales Invoices</ion-card-title>
                  <ion-button fill="clear" size="small" routerLink="/reports">
                    View All Reports <ion-icon name="arrow-forward-outline" slot="end"></ion-icon>
                  </ion-button>
                </div>
              </ion-card-header>
              <ion-card-content>
                <div class="table-responsive">
                  <table class="pharmacy-table">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Time</th>
                        <th>Cashier</th>
                        <th>Items</th>
                        <th>Tax</th>
                        <th>Grand Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let s of data()?.recentSales">
                        <td class="font-mono invoice-cell">{{ s.invoiceNumber }}</td>
                        <td>{{ s.saleDate | date: 'shortTime' }}</td>
                        <td>{{ s.cashier?.fullName }}</td>
                        <td>{{ s._count?.items }} items</td>
                        <td>₹{{ s.totalTax }}</td>
                        <td class="font-bold">₹{{ s.grandTotal }}</td>
                      </tr>
                      <tr *ngIf="!data()?.recentSales?.length">
                        <td colspan="6" class="ion-text-center ion-padding">
                          No sales recorded yet today.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </ion-card-content>
            </ion-card>
          </ion-col>

          <!-- Right: Payment Methods Breakdown -->
          <ion-col size="12" size-lg="4">
            <ion-card class="data-table-card">
              <ion-card-header>
                <ion-card-title>Today's Collections</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-list lines="inset">
                  <ion-item *ngFor="let p of data()?.paymentsByMethod">
                    <ion-label>
                      <h3>{{ p.method }}</h3>
                      <p>Collected today</p>
                    </ion-label>
                    <ion-badge slot="end" color="primary">
                      ₹{{ p.total.toLocaleString('en-IN') }}
                    </ion-badge>
                  </ion-item>
                  <ion-item *ngIf="!data()?.paymentsByMethod?.length">
                    <ion-label color="medium">No collections yet</ion-label>
                  </ion-item>
                </ion-list>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  `,
  styles: [
    `
      .dashboard-content {
        --background: #f8fafc;
      }
      .store-badge-bar {
        background: #ffffff;
        padding: 16px 20px;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }
      .store-info h3 {
        margin: 0 0 4px;
        font-size: 1.2rem;
        font-weight: 700;
        color: #0f172a;
      }
      .store-info p {
        margin: 0;
        font-size: 0.85rem;
        color: #64748b;
      }
      .metric-card {
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
        border: 1px solid #e2e8f0;
        background: #ffffff;
        margin: 0;
      }
      .metric-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .metric-icon {
        font-size: 24px;
        color: var(--ion-color-primary);
      }
      .metric-value {
        font-size: 1.75rem;
        font-weight: 700;
        margin-top: 8px;
        color: #0f172a;
      }
      .metric-subtext {
        font-size: 0.82rem;
        color: #64748b;
      }
      .metric-sales .metric-icon {
        color: #0d9488;
      }
      .metric-warning .metric-icon {
        color: #d97706;
      }
      .metric-expiry .metric-icon {
        color: #dc2626;
      }
      .metric-valuation .metric-icon {
        color: #0284c7;
      }
      .data-table-card {
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        background: #ffffff;
        margin: 0;
      }
      .card-title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .pharmacy-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 0.88rem;
      }
      .pharmacy-table th {
        background: #f8fafc;
        padding: 10px 14px;
        color: #475569;
        font-weight: 600;
        border-bottom: 1px solid #e2e8f0;
      }
      .pharmacy-table td {
        padding: 12px 14px;
        border-bottom: 1px solid #f1f5f9;
        color: #1e293b;
      }
      .invoice-cell {
        font-weight: 600;
        color: var(--ion-color-primary);
      }
      .font-bold {
        font-weight: 700;
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  data = signal<any | null>(null);
  isLoading = signal(true);

  constructor(
    private apiService: ApiService,
    public authService: AuthService,
  ) {
    addIcons({
      cashOutline,
      receiptOutline,
      warningOutline,
      timeOutline,
      trendingUpOutline,
      cartOutline,
      arrowForwardOutline,
      refreshOutline,
      shieldCheckmarkOutline,
    });
  }

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.isLoading.set(true);
    this.apiService.getDashboard().subscribe({
      next: (res) => {
        this.data.set(res);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  handleRefresh(event: any) {
    this.apiService.getDashboard().subscribe({
      next: (res) => {
        this.data.set(res);
        event.target.complete();
      },
      error: () => {
        event.target.complete();
      },
    });
  }
}
