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
  IonModal,
  IonButton,
  IonIcon,
  IonMenuButton,
  IonButtons,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  documentTextOutline,
  receiptOutline,
  printOutline,
  shieldCheckmarkOutline,
  eyeOutline,
  closeOutline,
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
    IonModal,
    IonButton,
    IonIcon,
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
      <!-- Date Range Filter & Quick Action Bar -->
      <div class="filter-bar-card ion-margin-bottom">
        <div class="filter-inputs">
          <div class="filter-field">
            <label for="report-start-date">Start Date</label>
            <input
              id="report-start-date"
              name="startDate"
              type="date"
              class="date-input"
              [(ngModel)]="startDate"
              (change)="loadData()"
            />
          </div>
          <div class="filter-field">
            <label for="report-end-date">End Date</label>
            <input
              id="report-end-date"
              name="endDate"
              type="date"
              class="date-input"
              [(ngModel)]="endDate"
              (change)="loadData()"
            />
          </div>
          <div class="filter-actions">
            <ion-button size="small" fill="outline" color="primary" (click)="setPreset('today')">Today</ion-button>
            <ion-button size="small" fill="outline" color="primary" (click)="setPreset('yesterday')">Yesterday</ion-button>
            <ion-button size="small" fill="outline" color="primary" (click)="setPreset('this-month')">This Month</ion-button>
            <ion-button size="small" fill="outline" color="medium" (click)="resetFilters()">Clear</ion-button>
          </div>
        </div>
        <div class="print-actions">
          <ion-button size="small" fill="solid" color="primary" (click)="printReport()">
            <ion-icon name="print-outline" slot="start"></ion-icon>
            Print {{ activeTab === 'gst' ? 'GSTR-1' : (activeTab === 'schedule-h1' ? 'H1 Register' : 'Register') }}
          </ion-button>
        </div>
      </div>
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
                    <th class="ion-text-center">Actions</th>
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
                    <td class="ion-text-center">
                      <div class="action-buttons-group">
                        <button
                          type="button"
                          class="action-btn view"
                          (click)="viewSaleDetails(s.id)"
                          title="View Tax Breakdown & Batches"
                        >
                          <ion-icon name="eye-outline"></ion-icon>
                        </button>
                        <button
                          type="button"
                          class="action-btn print"
                          (click)="openPrintInvoice(s.id, 'a4')"
                          title="Print Official GST Tax Invoice (A4)"
                        >
                          <ion-icon name="print-outline"></ion-icon>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Sale Invoice Details Modal -->
      <ion-modal [isOpen]="isDetailsModalOpen()" class="sale-details-modal">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>Tax Invoice: {{ viewingSale()?.invoiceNumber }}</ion-title>
              <ion-button slot="end" fill="clear" color="light" (click)="closeDetailsModal()">
                <ion-icon name="close-outline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-toolbar>
          </ion-header>

          <ion-content class="ion-padding">
            <div *ngIf="viewingSale()" class="sale-summary-card">
              <div class="summary-grid">
                <div>
                  <span class="lbl">Invoice Number:</span>
                  <strong class="font-mono">{{ viewingSale()?.invoiceNumber }}</strong>
                </div>
                <div>
                  <span class="lbl">Sale Date:</span>
                  <strong>{{ viewingSale()?.saleDate | date:'medium' }}</strong>
                </div>
                <div>
                  <span class="lbl">Patient Name:</span>
                  <strong>{{ viewingSale()?.patientName || 'Walk-in Customer' }}</strong>
                </div>
                <div>
                  <span class="lbl">Doctor:</span>
                  <strong>{{ viewingSale()?.doctorName || 'N/A' }}</strong>
                </div>
                <div>
                  <span class="lbl">Payment Method:</span>
                  <ion-badge color="success">{{ viewingSale()?.payments?.[0]?.paymentMethod || 'CASH' }}</ion-badge>
                </div>
                <div>
                  <span class="lbl">Total Paid:</span>
                  <strong class="text-success font-bold">₹{{ viewingSale()?.grandTotal }}</strong>
                </div>
              </div>

              <!-- Dispensed Items with FEFO Batches & Tax Breakdown -->
              <h4 class="section-title ion-margin-top">Dispensed Items & FEFO Batches</h4>
              <div class="table-responsive">
                <table class="batch-items-table">
                  <thead>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Batch #</th>
                      <th>Expiry</th>
                      <th class="ion-text-right">Qty</th>
                      <th class="ion-text-right">Unit Rate</th>
                      <th class="ion-text-right">Taxable</th>
                      <th class="ion-text-right">CGST</th>
                      <th class="ion-text-right">SGST</th>
                      <th class="ion-text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let it of viewingSale()?.items">
                      <td><strong>{{ it.medicine?.name }}</strong></td>
                      <td class="font-mono">{{ it.batch?.batchNumber }}</td>
                      <td>{{ it.batch?.expiryDate | date:'shortDate' }}</td>
                      <td class="ion-text-right font-bold">{{ it.quantity }} <small style="color: #64748b; font-weight: normal;">{{ it.saleUnit || it.medicine?.purchaseUnit || '' }}</small></td>
                      <td class="ion-text-right">₹{{ it.unitPrice }}</td>
                      <td class="ion-text-right">₹{{ it.taxableAmount }}</td>
                      <td class="ion-text-right">₹{{ it.cgstAmount }}</td>
                      <td class="ion-text-right">₹{{ it.sgstAmount }}</td>
                      <td class="ion-text-right font-bold">₹{{ it.totalAmount }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Official Print Invoice Buttons -->
              <div class="modal-print-actions ion-margin-top">
                <ion-button fill="outline" color="primary" (click)="openPrintInvoice(viewingSale().id, 'thermal')">
                  <ion-icon name="receipt-outline" slot="start"></ion-icon>
                  Thermal Receipt (80mm)
                </ion-button>
                <ion-button fill="solid" color="primary" (click)="openPrintInvoice(viewingSale().id, 'a4')">
                  <ion-icon name="print-outline" slot="start"></ion-icon>
                  Full GST Tax Invoice (A4)
                </ion-button>
              </div>
            </div>
          </ion-content>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
  styles: [
    `
      .page-content {
        --background: #f8fafc;
      }
      .action-buttons-group {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .action-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        color: #475569;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 16px;
      }
      .action-btn:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
        color: #0f172a;
      }
      .action-btn.view:hover {
        background: #eff6ff;
        border-color: #bfdbfe;
        color: #2563eb;
      }
      .action-btn.print:hover {
        background: #f0fdf4;
        border-color: #bbf7d0;
        color: #16a34a;
      }
      .sale-details-modal {
        --width: 900px;
        --max-width: 95vw;
        --height: 600px;
        --border-radius: 14px;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        background: #f8fafc;
        padding: 14px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
      }
      .summary-grid .lbl {
        display: block;
        font-size: 0.75rem;
        color: #64748b;
        text-transform: uppercase;
        font-weight: 600;
      }
      .section-title {
        font-size: 0.95rem;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 8px;
      }
      .batch-items-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.84rem;
      }
      .batch-items-table th {
        background: #f1f5f9;
        padding: 8px 10px;
        text-align: left;
        color: #475569;
        font-weight: 600;
        border-bottom: 1px solid #cbd5e1;
      }
      .batch-items-table td {
        padding: 8px 10px;
        border-bottom: 1px solid #f1f5f9;
      }
      .modal-print-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding-top: 14px;
        border-top: 1px solid #e2e8f0;
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
      .filter-bar-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 14px 18px;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      .filter-inputs {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 14px;
      }
      .filter-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .filter-field label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #64748b;
      }
      .date-input {
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 0.85rem;
        background: #f8fafc;
        color: #0f172a;
        outline: none;
      }
      .filter-actions {
        display: flex;
        gap: 6px;
        align-self: flex-end;
      }
      .print-actions {
        display: flex;
        align-items: center;
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
  startDate = '';
  endDate = '';

  gstReport = signal<any | null>(null);
  scheduleH1Entries = signal<any[]>([]);
  salesList = signal<any[]>([]);

  // Sale Details Modal
  isDetailsModalOpen = signal(false);
  viewingSale = signal<any | null>(null);

  constructor(private apiService: ApiService) {
    addIcons({
      documentTextOutline,
      receiptOutline,
      printOutline,
      shieldCheckmarkOutline,
      eyeOutline,
      closeOutline,
    });
  }

  ngOnInit() {
    this.setPreset('this-month');
  }

  setPreset(preset: 'today' | 'yesterday' | 'this-month') {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toDateInputStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
      const todayStr = toDateInputStr(now);
      this.startDate = todayStr;
      this.endDate = todayStr;
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = toDateInputStr(y);
      this.startDate = yStr;
      this.endDate = yStr;
    } else if (preset === 'this-month') {
      const year = now.getFullYear();
      const month = pad(now.getMonth() + 1);
      this.startDate = `${year}-${month}-01`;
      this.endDate = toDateInputStr(now);
    }
    this.loadData();
  }

  resetFilters() {
    this.startDate = '';
    this.endDate = '';
    this.loadData();
  }

  loadData() {
    const sDate = this.startDate || undefined;
    const eDate = this.endDate || undefined;

    if (this.activeTab === 'gst') {
      this.apiService.getGstSummary(sDate, eDate).subscribe((res) => this.gstReport.set(res));
    } else if (this.activeTab === 'schedule-h1') {
      this.apiService.getScheduleH1Register(sDate, eDate).subscribe((res) => this.scheduleH1Entries.set(res));
    } else if (this.activeTab === 'sales') {
      this.apiService.getSales({ limit: 50, startDate: sDate, endDate: eDate }).subscribe((res) => {
        this.salesList.set(res?.data || res?.items || res || []);
      });
    }
  }

  printReport() {
    window.print();
  }

  viewSaleDetails(id: string) {
    this.apiService.getSale(id).subscribe({
      next: (fullSale) => {
        this.viewingSale.set(fullSale);
        this.isDetailsModalOpen.set(true);
      },
    });
  }

  closeDetailsModal() {
    this.isDetailsModalOpen.set(false);
    this.viewingSale.set(null);
  }

  openPrintInvoice(id: string, format: 'a4' | 'thermal') {
    this.apiService.getInvoicePrintHtml(id, format).subscribe({
      next: (rawHtml) => {
        const cleanHtml = rawHtml
          .replace(/<body[^>]*onload=["'][^"']*["']/gi, '<body>')
          .replace(/window\.print\(\)/gi, '');

        const oldFrame = document.getElementById('print-invoice-frame');
        if (oldFrame) oldFrame.remove();

        const iframe = document.createElement('iframe');
        iframe.id = 'print-invoice-frame';
        iframe.style.position = 'fixed';
        iframe.style.top = '-9999px';
        iframe.style.left = '-9999px';
        iframe.style.width = '1px';
        iframe.style.height = '1px';
        iframe.style.border = 'none';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document || iframe.contentDocument;
        if (doc) {
          doc.open();
          doc.write(cleanHtml);
          doc.close();

          let hasPrinted = false;
          const triggerPrintOnce = () => {
            if (hasPrinted) return;
            hasPrinted = true;

            const cw = iframe.contentWindow;
            if (cw) {
              cw.focus();
              cw.onafterprint = () => {
                iframe.remove();
              };
              cw.print();
            }
          };

          setTimeout(triggerPrintOnce, 250);
        }
      },
      error: () => {
        console.error('Failed to load printable invoice HTML');
      },
    });
  }
}
