import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonApp,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonSpinner,
  IonText,
  IonChip,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  medkitOutline,
  lockClosedOutline,
  mailOutline,
  shieldCheckmarkOutline,
  personOutline,
  arrowForwardOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner,
    IonText,
    IonChip,
  ],
  template: `
    <ion-content class="ion-padding login-container">
      <div class="login-wrapper">
        <ion-card class="login-card">
          <ion-card-header class="ion-text-center">
            <div class="logo-badge">
              <ion-icon name="medkit-outline" class="brand-icon"></ion-icon>
            </div>
            <ion-card-title class="brand-title">PharmaPulse POS</ion-card-title>
            <ion-card-subtitle>Pharmacy Billing & Stock Management SaaS</ion-card-subtitle>
            <ion-chip color="primary" class="gst-badge">
              <ion-icon name="shield-checkmark-outline"></ion-icon>
              <ion-label>Indian GST & FEFO Ready</ion-label>
            </ion-chip>
          </ion-card-header>

          <ion-card-content>
            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
              <ion-item lines="inset" class="custom-input-item">
                <ion-icon name="mail-outline" slot="start" color="medium"></ion-icon>
                <ion-input
                  id="login-email"
                  name="email"
                  autocomplete="username"
                  formControlName="email"
                  type="email"
                  label="Email Address"
                  labelPlacement="floating"
                  placeholder="name@pharmacy.local"
                ></ion-input>
              </ion-item>
              <div *ngIf="loginForm.get('email')?.touched && loginForm.get('email')?.invalid" class="validation-msg">
                <ion-text color="danger">Please enter a valid email address</ion-text>
              </div>

              <ion-item lines="inset" class="custom-input-item ion-margin-top">
                <ion-icon name="lock-closed-outline" slot="start" color="medium"></ion-icon>
                <ion-input
                  id="login-password"
                  name="password"
                  autocomplete="current-password"
                  formControlName="password"
                  type="password"
                  label="Password"
                  labelPlacement="floating"
                  placeholder="••••••••"
                ></ion-input>
              </ion-item>
              <div *ngIf="loginForm.get('password')?.touched && loginForm.get('password')?.invalid" class="validation-msg">
                <ion-text color="danger">Password must be at least 6 characters</ion-text>
              </div>

              <div *ngIf="errorMessage()" class="error-banner ion-margin-top">
                <ion-text color="danger">{{ errorMessage() }}</ion-text>
              </div>

              <ion-button
                expand="block"
                type="submit"
                [disabled]="loginForm.invalid || isLoading()"
                class="ion-margin-top submit-btn"
              >
                <ion-spinner *ngIf="isLoading()" name="crescent" slot="start"></ion-spinner>
                <span *ngIf="!isLoading()">Sign In to Terminal</span>
                <ion-icon *ngIf="!isLoading()" name="arrow-forward-outline" slot="end"></ion-icon>
              </ion-button>
            </form>

            <div class="demo-accounts ion-margin-top">
              <p class="demo-title">Quick Demo Sign-in:</p>
              <div class="demo-buttons">
                <ion-button
                  size="small"
                  fill="solid"
                  color="danger"
                  (click)="fillCredentials('superadmin@pharmapulse.io', 'Password@123')"
                >
                  SaaS Super Admin
                </ion-button>
                <ion-button
                  size="small"
                  fill="outline"
                  color="primary"
                  (click)="fillCredentials('admin@apollopharmacy.local', 'Password@123')"
                >
                  Store Owner
                </ion-button>
                <ion-button
                  size="small"
                  fill="outline"
                  color="secondary"
                  (click)="fillCredentials('pharmacist@apollopharmacy.local', 'Password@123')"
                >
                  Pharmacist
                </ion-button>
                <ion-button
                  size="small"
                  fill="outline"
                  color="tertiary"
                  (click)="fillCredentials('cashier@apollopharmacy.local', 'Password@123')"
                >
                  Cashier POS
                </ion-button>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .login-container {
        --background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100%;
      }
      .login-wrapper {
        max-width: 440px;
        margin: 40px auto;
      }
      .login-card {
        border-radius: 16px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
        border: 1px solid #e2e8f0;
        background: #ffffff;
      }
      .logo-badge {
        width: 64px;
        height: 64px;
        margin: 0 auto 12px;
        background: #ccfbf1;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .brand-icon {
        font-size: 34px;
        color: var(--ion-color-primary);
      }
      .brand-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #0f172a;
      }
      .gst-badge {
        margin-top: 8px;
        font-weight: 500;
      }
      .custom-input-item {
        --background: #f8fafc;
        border-radius: 8px;
        margin-bottom: 4px;
      }
      .validation-msg {
        padding: 4px 8px;
        font-size: 0.8rem;
      }
      .error-banner {
        background: #fef2f2;
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid #fecaca;
        font-size: 0.85rem;
      }
      .submit-btn {
        margin-top: 20px;
        font-weight: 600;
        --border-radius: 8px;
      }
      .demo-accounts {
        text-align: center;
        border-top: 1px dashed #cbd5e1;
        padding-top: 16px;
      }
      .demo-title {
        font-size: 0.82rem;
        color: #64748b;
        margin-bottom: 8px;
      }
      .demo-buttons {
        display: flex;
        gap: 8px;
        justify-content: center;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    addIcons({
      medkitOutline,
      lockClosedOutline,
      mailOutline,
      shieldCheckmarkOutline,
      personOutline,
      arrowForwardOutline,
    });

    this.loginForm = this.fb.group({
      email: ['admin@apollopharmacy.local', [Validators.required, Validators.email]],
      password: ['Password@123', [Validators.required, Validators.minLength(6)]],
    });
  }

  fillCredentials(email: string, pass: string) {
    this.loginForm.patchValue({ email, password: pass });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.user.isSuperAdmin) {
          this.router.navigate(['/stores']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Login failed. Please check your credentials.');
      },
    });
  }
}
