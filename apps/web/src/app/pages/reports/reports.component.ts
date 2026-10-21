import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol,
  IonMenuButton,
  IonButtons,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  documentTextOutline,
  receiptOutline,
  printOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
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
        <ion-title>Reports & Tax</ion-title>
      </ion-toolbar>

      <ion-toolbar>
        <ion-segment [(ngModel)]="activeTab" (ionChange)="loadData()">
          <ion-segment-button value="gst">
            <ion-label>GST Summary</ion-label>
          </ion-segment-button>
          <ion-segment-button value="schedule-h1">
            <ion-label>Schedule H1 & X</ion-label>
          </ion-segment-button>
          <ion-segment-button value="sales">
            <ion-label>Sales History</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-content">
      <!-- 1. GSTR-1 Tax Summary -->
      <div *ngIf="activeTab === 'gst'">
        <ion-grid [fixed]="true">
          <ion-row>
            <ion-col size="12" size-md="3">
              <ion-card class="summary-metric-card">
                <ion-card-content>
                  <div class="metric-label">TOTAL TAXABLE VALUE</div>
                  <div class="metric-val">₹{{ (gstReport()?.summary?.totalTaxable || 0).toLocaleString('en-IN') }}</div>
                </ion-card-content>
              </ion-card>
            </ion-col>
            <ion-col size="12" size-md="3">
              <ion-card class="summary-metric-card">
                <ion-card-content>
                  <div class="metric-label">TOTAL CGST (CENTRAL)</div>
                  <div class="metric-val">₹{{ (gstReport()?.summary?.totalCgst || 0).toLocaleString('en-IN') }}</div>
                </ion-card-content>
              </ion-card>
            </ion-col>
            <ion-col size="12" size-md="3">
              <ion-card class="summary-metric-card">
                <ion-card-content>
                  <div class="metric-label">TOTAL SGST (STATE)</div>
                  <div class="metric-val">₹{{ (gstReport()?.summary?.totalSgst || 0).toLocaleString('en-IN') }}</div>
                </ion-card-content>
              </ion-card>
            </ion-col>
            <ion-col size="12" size-md="3">
              <ion-card class="summary-metric-card">
                <ion-card-content>
                  <div class="metric-label">TOTAL TAX COLLECTED</div>
                  <div class="metric-val font-bold">₹{{ (gstReport()?.summary?.totalTax || 0).toLocaleString('en-IN') }}</div>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>

        <ion-card class="table-card ion-margin-top">
          <ion-card-header>
            <ion-card-title>HSN Summary (GSTR-1 Format)</ion-card-title>
          </ion-card-header>
          <ion-card-content class="ion-no-padding">
            <div class="table-responsive">
              <table class="pharmacy-table">
                <thead>
                  <tr>
                    <th>HSN Code</th>
                    <th class="ion-text-right">Taxable Value</th>
                    <th class="ion-text-right">CGST</th>
                    <th class="ion-text-right">SGST</th>
                    <th class="ion-text-right">IGST</th>
                    <th class="ion-text-right">Total Invoice Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let h of gstReport()?.hsnBreakdown">
                    <td class="font-mono font-bold">{{ h.hsnCode }}</td>
                    <td class="ion-text-right">₹{{ h.taxable }}</td>
                    <td class="ion-text-right">₹{{ h.cgst }}</td>
                    <td class="ion-text-right">₹{{ h.sgst }}</td>
                    <td class="ion-text-right">₹{{ h.igst }}</td>
                    <td class="ion-text-right font-bold">₹{{ h.total }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- 2. Schedule H1 & X Statutory Register -->
      <div *ngIf="activeTab === 'schedule-h1'">
        <ion-card class="table-card">
          <ion-card-header>
            <ion-card-title>Schedule H1 & Schedule X Dispensing Register</ion-card-title>
          </ion-card-header>
          <ion-card-content class="ion-no-padding">
            <div class="table-responsive">
              <table class="pharmacy-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice #</th>
                    <th>Patient Name</th>
                    <th>Doctor Name</th>
                    <th>Doctor Reg #</th>
                    <th>Medicine Dispensed</th>
                    <th>Category</th>
                    <th>Batch #</th>
                    <th>Expiry</th>
                    <th>Qty</th>
                    <th>Cashier</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of scheduleH1Entries()">
                    <td>{{ item.date | date:'shortDate' }}</td>
                    <td class="font-mono">{{ item.invoiceNumber }}</td>
                    <td><strong>{{ item.patientName || 'N/A' }}</strong></td>
                    <td>{{ item.doctorName || 'N/A' }}</td>
                    <td class="font-mono">{{ item.doctorRegNo || 'N/A' }}</td>
                    <td>{{ item.medicineName }}</td>
                    <td>
                      <ion-badge color="danger">{{ item.category }}</ion-badge>
                    </td>
                    <td class="font-mono">{{ item.batchNumber }}</td>
                    <td class="font-mono">{{ item.expiryDate | date:'MM/yy' }}</td>
                    <td class="font-bold">{{ item.quantity }}</td>
                    <td>{{ item.cashier }}</td>
                  </tr>
                  <tr *ngIf="!scheduleH1Entries().length">
                    <td colspan="11" class="ion-text-center ion-padding">
                      No Schedule H1 or Schedule X medicines have been dispensed in this period.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- 3. Sales Invoices History -->
      <div *ngIf="activeTab === 'sales'">
        <ion-card class="table-card">
          <ion-card-content class="ion-no-padding">
            <div class="table-responsive">
              <table class="pharmacy-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date & Time</th>
                    <th>Patient</th>
                    <th>Cashier</th>
                    <th>Subtotal</th>
                    <th>Tax</th>
                    <th>Grand Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let s of salesList()">
                    <td class="font-mono font-bold">{{ s.invoiceNumber }}</td>
                    <td>{{ s.saleDate | date:'short' }}</td>
                    <td>{{ s.patientName || 'Walk-in' }}</td>
                    <td>{{ s.cashier?.fullName }}</td>
                    <td>₹{{ s.subtotal }}</td>
                    <td>₹{{ s.totalTax }}</td>
                    <td class="font-bold">₹{{ s.grandTotal }}</td>
                    <td>
                      <ion-badge color="success">{{ s.status }}</ion-badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .page-content {
        --background: #f8fafc;
      }
      .summary-metric-card {
        border-radius: 10px;
        border: 1px solid #e2e8f0;
        background: #ffffff;
        margin: 0;
      }
      .metric-label {
        font-size: 0.75rem;
        color: #64748b;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .metric-val {
        font-size: 1.5rem;
        font-weight: 700;
        color: #0f172a;
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
      .font-bold {
        font-weight: 700;
      }
    `,
  ],
})
export class ReportsComponent implements OnInit {
  activeTab = 'gst';
  gstReport = signal<any | null>(null);
  scheduleH1Entries = signal<any[]>([]);
  salesList = signal<any[]>([]);

  constructor(private apiService: ApiService) {
    addIcons({
      documentTextOutline,
      receiptOutline,
      printOutline,
      shieldCheckmarkOutline,
    });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    if (this.activeTab === 'gst') {
      this.apiService.getGstSummary().subscribe((res) => this.gstReport.set(res));
    } else if (this.activeTab === 'schedule-h1') {
      this.apiService.getScheduleH1Register().subscribe((res) => this.scheduleH1Entries.set(res));
    } else if (this.activeTab === 'sales') {
      this.apiService.getSales({ limit: 50 }).subscribe((res) => this.salesList.set(res.items || []));
    }
  }
}
