import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonModal,
  IonButton,
  IonIcon,
  IonMenuButton,
  IonButtons,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  receiptOutline,
  printOutline,
  eyeOutline,
  closeOutline,
  searchOutline,
  calendarOutline,
} from 'ionicons/icons';
import { ApiService } from '../../core/services/api.service';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-sales-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
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
        <ion-title>Sales History & Tax Invoices</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-content">
      <!-- Date Range Filter & Quick Action Bar -->
      <div class="filter-bar-card ion-margin-bottom">
        <div class="filter-inputs">
          <div class="filter-field">
            <label for="sales-start-date">From Date</label>
            <input
              id="sales-start-date"
              name="startDate"
              type="date"
              class="date-input"
              [(ngModel)]="startDate"
              (change)="loadSales()"
            />
          </div>
          <div class="filter-field">
            <label for="sales-end-date">To Date</label>
            <input
              id="sales-end-date"
              name="endDate"
              type="date"
              class="date-input"
              [(ngModel)]="endDate"
              (change)="loadSales()"
            />
          </div>
          <div class="filter-actions">
            <ion-button size="small" fill="outline" color="primary" (click)="setPreset('today')">Today</ion-button>
            <ion-button size="small" fill="outline" color="primary" (click)="setPreset('yesterday')">Yesterday</ion-button>
            <ion-button size="small" fill="outline" color="primary" (click)="setPreset('this-month')">This Month</ion-button>
            <ion-button size="small" fill="outline" color="medium" (click)="resetFilters()">Clear</ion-button>
          </div>
        </div>
        <div class="summary-counts">
          <span class="count-pill">Total Invoices: <strong>{{ salesList().length }}</strong></span>
          <span class="count-pill revenue">Revenue: <strong>₹{{ totalPeriodRevenue().toLocaleString('en-IN') }}</strong></span>
        </div>
      </div>

      <!-- Sales Invoices Table Card -->
      <ion-card class="table-card">
        <ion-card-header class="table-header">
          <ion-card-title>Billed Invoices Ledger</ion-card-title>
        </ion-card-header>
        <ion-card-content class="ion-no-padding">
          <div class="table-responsive">
            <table class="pharmacy-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date & Time</th>
                  <th>Patient / Customer</th>
                  <th>Prescribing Doctor</th>
                  <th>Cashier</th>
                  <th class="ion-text-right">Subtotal</th>
                  <th class="ion-text-right">Tax</th>
                  <th class="ion-text-right">Grand Total</th>
                  <th>Status</th>
                  <th class="ion-text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of paginatedSales()">
                  <td class="font-mono font-bold">{{ s.invoiceNumber }}</td>
                  <td>{{ s.saleDate | date:'medium' }}</td>
                  <td>
                    <strong>{{ s.patientName || 'Walk-in Customer' }}</strong>
                  </td>
                  <td>
                    <span *ngIf="s.doctorName">{{ s.doctorName }}</span>
                    <span *ngIf="!s.doctorName" class="text-muted">—</span>
                  </td>
                  <td>{{ s.cashier?.fullName }}</td>
                  <td class="ion-text-right">₹{{ s.subtotal }}</td>
                  <td class="ion-text-right">₹{{ s.totalTax }}</td>
                  <td class="ion-text-right font-bold text-success">₹{{ s.grandTotal }}</td>
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
                <tr *ngIf="!salesList().length">
                  <td colspan="10" class="ion-text-center ion-padding empty-row">
                    No sales invoices found for the selected period.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <app-pagination
            *ngIf="salesList().length > 0"
            [totalItems]="salesList().length"
            [currentPage]="currentPage()"
            [pageSize]="pageSize()"
            [pageSizeOptions]="[10, 25, 50, 100]"
            itemLabel="invoices"
            (pageChange)="onPageChange($event)"
            (pageSizeChange)="onPageSizeChange($event)"
          ></app-pagination>
        </ion-card-content>
      </ion-card>

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
                  <strong>{{ viewingSale()?.doctorName || 'N/A' }} {{ viewingSale()?.doctorRegNo ? '(' + viewingSale()?.doctorRegNo + ')' : '' }}</strong>
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
      .summary-counts {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .count-pill {
        font-size: 0.85rem;
        background: #f1f5f9;
        color: #334155;
        padding: 6px 12px;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
      }
      .count-pill.revenue {
        background: #ecfdf5;
        color: #065f46;
        border-color: #a7f3d0;
      }
      .table-card {
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        background: #ffffff;
        margin: 0;
      }
      .table-header {
        padding: 16px 20px;
        border-bottom: 1px solid #f1f5f9;
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
      .font-mono {
        font-family: monospace;
      }
      .font-bold {
        font-weight: 700;
      }
      .text-success {
        color: #059669;
      }
      .text-muted {
        color: #94a3b8;
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
        padding: 16px;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
      }
      .summary-grid .lbl {
        font-size: 0.75rem;
        color: #64748b;
        display: block;
        margin-bottom: 2px;
      }
      .section-title {
        font-size: 1rem;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 8px;
      }
      .batch-items-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
      }
      .batch-items-table th {
        background: #f1f5f9;
        padding: 8px 10px;
        color: #475569;
        text-align: left;
      }
      .batch-items-table td {
        padding: 8px 10px;
        border-bottom: 1px solid #e2e8f0;
      }
      .modal-print-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding-top: 14px;
        border-top: 1px solid #e2e8f0;
      }
    `,
  ],
})
export class SalesHistoryComponent implements OnInit {
  startDate = '';
  endDate = '';
  salesList = signal<any[]>([]);

  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);

  paginatedSales = computed<any[]>(() => {
    const list = this.salesList();
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

  // Sale Details Modal
  isDetailsModalOpen = signal(false);
  viewingSale = signal<any | null>(null);

  constructor(private apiService: ApiService) {
    addIcons({
      receiptOutline,
      printOutline,
      eyeOutline,
      closeOutline,
      searchOutline,
      calendarOutline,
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
    this.loadSales();
  }

  resetFilters() {
    this.startDate = '';
    this.endDate = '';
    this.loadSales();
  }

  loadSales() {
    const sDate = this.startDate || undefined;
    const eDate = this.endDate || undefined;

    this.apiService.getSales({ limit: 100, startDate: sDate, endDate: eDate }).subscribe({
      next: (res) => {
        this.salesList.set(res?.data || res?.items || res || []);
      },
      error: () => {
        this.salesList.set([]);
      },
    });
  }

  totalPeriodRevenue(): number {
    return this.salesList().reduce((acc, s) => acc + (Number(s.grandTotal) || 0), 0);
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
        // Strip out any inline onload="window.print()" or script print triggers to prevent duplicate dialogs
        const cleanHtml = rawHtml
          .replace(/<body[^>]*onload=["'][^"']*["']/gi, '<body>')
          .replace(/window\.print\(\)/gi, '');

        // Remove any previous print frame
        const oldFrame = document.getElementById('print-invoice-frame');
        if (oldFrame) oldFrame.remove();

        // Create invisible iframe
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
              // Remove iframe once print dialog is closed or cancelled
              cw.onafterprint = () => {
                iframe.remove();
              };
              cw.print();
            }
          };

          // Wait brief tick for styles & fonts to render in iframe, then trigger once
          setTimeout(triggerPrintOnce, 250);
        }
      },
      error: () => {
        console.error('Failed to load printable invoice HTML');
      },
    });
  }
}
