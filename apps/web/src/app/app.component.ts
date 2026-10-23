import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonApp,
  IonSplitPane,
  IonMenu,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonMenuToggle,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonBadge,
  IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  gridOutline,
  cartOutline,
  medkitOutline,
  cubeOutline,
  bagAddOutline,
  returnDownBackOutline,
  documentTextOutline,
  logOutOutline,
  businessOutline,
  personCircleOutline,
  menuOutline,
  menuSharp,
  walletOutline,
  cashOutline,
  peopleOutline,
  receiptOutline,
} from 'ionicons/icons';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    IonApp,
    IonSplitPane,
    IonMenu,
    IonContent,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
    IonRouterOutlet,
    IonMenuToggle,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonBadge,
    IonButton,
  ],
  template: `
    <ion-app>
      <ion-split-pane contentId="main-content" when="lg">
        <!-- Side Navigation Menu (Active when logged in) -->
        <ion-menu contentId="main-content" type="overlay" *ngIf="authService.isAuthenticated()">
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>PharmaPulse</ion-title>
            </ion-toolbar>
          </ion-header>

          <ion-content class="menu-content">
            <!-- Active Store / User Pill -->
            <div class="user-profile-badge ion-padding" *ngIf="authService.currentUser() as user">
              <div class="avatar-row">
                <ion-icon name="person-circle-outline" class="user-avatar-icon"></ion-icon>
                <div class="user-details">
                  <div class="user-name">{{ user.fullName }}</div>
                  <ion-badge [color]="user.isSuperAdmin ? 'danger' : 'secondary'" class="role-badge">
                    {{ user.isSuperAdmin ? 'SAAS_SUPER_ADMIN' : (user.activeStore?.role || 'Staff') }}
                  </ion-badge>
                </div>
              </div>

              <!-- Super Admin Platform Scope Box -->
              <div class="store-box saas-platform-box ion-margin-top" *ngIf="user.isSuperAdmin">
                <ion-icon name="business-outline"></ion-icon>
                <span>Global SaaS Platform Console</span>
              </div>

              <!-- Store Specific Pharmacy Scope Box -->
              <div class="store-box ion-margin-top" *ngIf="!user.isSuperAdmin && user.activeStore">
                <ion-icon name="business-outline"></ion-icon>
                <span>{{ user.activeStore.name }}</span>
              </div>
            </div>

            <!-- Navigation Links -->
            <ion-list lines="none" class="nav-list" *ngIf="authService.currentUser() as user">
              <ion-menu-toggle auto-hide="false">
                <!-- 1. PURE SAAS SUPER ADMIN MENU -->
                <ng-container *ngIf="user.isSuperAdmin">
                  <ion-item routerLink="/stores" routerLinkActive="active-item" class="nav-item">
                    <ion-icon name="business-outline" slot="start"></ion-icon>
                    <ion-label>Tenant Stores & Onboarding</ion-label>
                  </ion-item>

                  <ion-item routerLink="/reports" routerLinkActive="active-item" class="nav-item">
                    <ion-icon name="document-text-outline" slot="start"></ion-icon>
                    <ion-label>Global Reports & Audit</ion-label>
                  </ion-item>
                </ng-container>

                <!-- 2. CLINIC / STORE OWNER & STAFF MENU -->
                <ng-container *ngIf="!user.isSuperAdmin">
                  <ion-item routerLink="/dashboard" routerLinkActive="active-item" class="nav-item">
                    <ion-icon name="grid-outline" slot="start"></ion-icon>
                    <ion-label>Dashboard</ion-label>
                  </ion-item>

                  <ion-item routerLink="/pos" routerLinkActive="active-item" class="nav-item pos-highlight">
                    <ion-icon name="cart-outline" slot="start"></ion-icon>
                    <ion-label>POS Billing Terminal</ion-label>
                  </ion-item>

                  <ion-item routerLink="/sales-history" routerLinkActive="active-item" class="nav-item">
                    <ion-icon name="receipt-outline" slot="start"></ion-icon>
                    <ion-label>Sales History</ion-label>
                  </ion-item>

                  <ion-item routerLink="/medicines" routerLinkActive="active-item" class="nav-item">
                    <ion-icon name="medkit-outline" slot="start"></ion-icon>
                    <ion-label>Medicine Catalogue</ion-label>
                  </ion-item>

                  <ion-item routerLink="/inventory" routerLinkActive="active-item" class="nav-item">
                    <ion-icon name="cube-outline" slot="start"></ion-icon>
                    <ion-label>Inventory & FEFO</ion-label>
                  </ion-item>

                  <ion-item routerLink="/purchases" routerLinkActive="active-item" class="nav-item">
                    <ion-icon name="bag-add-outline" slot="start"></ion-icon>
                    <ion-label>Supplier Purchases</ion-label>
                  </ion-item>

                  <ion-item routerLink="/returns" routerLinkActive="active-item" class="nav-item">
                    <ion-icon name="return-down-back-outline" slot="start"></ion-icon>
                    <ion-label>Returns & Quarantine</ion-label>
                  </ion-item>

                  <ion-item routerLink="/customers" routerLinkActive="active-item" class="nav-item">
                    <ion-icon name="people-outline" slot="start"></ion-icon>
                    <ion-label>Patients & Customers</ion-label>
                  </ion-item>

                  <ion-item routerLink="/banking" routerLinkActive="active-item" class="nav-item">
                    <ion-icon name="cash-outline" slot="start"></ion-icon>
                    <ion-label>Cash & Bank</ion-label>
                  </ion-item>

                  <ion-item routerLink="/accounts" routerLinkActive="active-item" class="nav-item">
                    <ion-icon name="wallet-outline" slot="start"></ion-icon>
                    <ion-label>Ledgers (Party Payables)</ion-label>
                  </ion-item>

                  <ion-item routerLink="/reports" routerLinkActive="active-item" class="nav-item">
                    <ion-icon name="document-text-outline" slot="start"></ion-icon>
                    <ion-label>GST & Drug Reports</ion-label>
                  </ion-item>
                </ng-container>
              </ion-menu-toggle>
            </ion-list>

            <div class="logout-section ion-padding">
              <ion-button expand="block" fill="outline" color="danger" (click)="authService.logout()">
                <ion-icon name="log-out-outline" slot="start"></ion-icon>
                Sign Out
              </ion-button>
            </div>
          </ion-content>
        </ion-menu>

        <!-- Main Content Area -->
        <ion-router-outlet id="main-content"></ion-router-outlet>
      </ion-split-pane>
    </ion-app>
  `,
  styles: [
    `
      ion-split-pane {
        --side-width: 250px;
        --side-max-width: 250px;
        --side-min-width: 250px;
      }
      ion-menu {
        --width: 250px;
        --max-width: 250px;
        --min-width: 250px;
        border-right: 1px solid #e2e8f0;
      }
      .menu-content {
        --background: #ffffff;
      }
      .user-profile-badge {
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        padding: 12px 14px;
      }
      .avatar-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .user-avatar-icon {
        font-size: 34px;
        color: var(--ion-color-primary);
        flex-shrink: 0;
      }
      .user-name {
        font-weight: 700;
        font-size: 0.88rem;
        color: #0f172a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .role-badge {
        font-size: 0.68rem;
        margin-top: 2px;
        letter-spacing: 0.02em;
      }
      .store-box {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.75rem;
        color: #64748b;
        background: #ffffff;
        padding: 5px 8px;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .store-box span {
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .nav-list {
        padding: 8px 6px;
        background: transparent;
      }
      .nav-item {
        --background: transparent;
        --color: #334155;
        --border-radius: 7px;
        --min-height: 40px;
        margin-bottom: 3px;
        font-weight: 500;
        font-size: 0.84rem;
        transition: all 0.15s ease-in-out;
      }
      .nav-item ion-icon {
        color: #64748b;
        margin-right: 10px;
        font-size: 18px;
      }
      .nav-item.active-item {
        --background: #ccfbf1;
        --color: #0f766e;
        font-weight: 700;
      }
      .nav-item.active-item ion-icon {
        color: #0f766e;
      }
      .pos-highlight {
        border: 1px dashed #0d9488;
        background: #f0fdfa !important;
      }
      .logout-section {
        margin-top: auto;
        padding: 12px 14px;
      }
    `,
  ],
})
export class AppComponent {
  constructor(public authService: AuthService) {
    addIcons({
      gridOutline,
      cartOutline,
      medkitOutline,
      cubeOutline,
      bagAddOutline,
      returnDownBackOutline,
      documentTextOutline,
      logOutOutline,
      businessOutline,
      personCircleOutline,
      menuOutline,
      menuSharp,
      walletOutline,
      cashOutline,
      peopleOutline,
      receiptOutline,
    });
  }
}
