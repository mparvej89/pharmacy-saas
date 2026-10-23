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
  IonNote,
  IonTextarea,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  walletOutline,
  cashOutline,
  businessOutline,
  swapHorizontalOutline,
  arrowDownOutline,
  arrowUpOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  refreshOutline,
  addOutline,
  closeOutline,
  documentTextOutline,
  todayOutline,
  shieldCheckmarkOutline,
  cardOutline,
  qrCodeOutline,
  lockClosedOutline,
  receiptOutline,
  timeOutline,
  createOutline,
  trashOutline,
  lockOpenOutline,
} from 'ionicons/icons';
import { ApiService } from '../../core/services/api.service';
import {
  CashBankAccount,
  CashBankTransaction,
  BankDashboardSummary,
  BankReconciliationSummary,
  DailyCashClosingStatus,
  BankAccountType,
  BankTransactionType,
} from '../../core/models';

@Component({
  selector: 'app-banking',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
    IonLabel,
    IonSegment,
    IonSegmentButton,
    IonToast,
    IonSpinner,
    IonMenuButton,
    IonButtons,
    IonSelect,
    IonSelectOption,
    IonNote,
    IonTextarea,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Cash & Bank Management</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" (click)="loadAllData()" [disabled]="isLoading()">
            <ion-icon name="refresh-outline" slot="icon-only"></ion-icon>
          </ion-button>
          <ion-button fill="solid" color="light" (click)="openAddAccountModal()">
            <ion-icon name="add-outline" slot="start"></ion-icon>
            Add Account
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Navigation Tabs: Dashboard / Accounts / Transactions / Reconciliation / Cash Closing -->
      <ion-toolbar color="light">
        <ion-segment [value]="activeTab()" (ionChange)="onTabChange($event)">
          <ion-segment-button value="dashboard">
            <ion-label>
              <ion-icon name="wallet-outline"></ion-icon>
              Dashboard & Balances
            </ion-label>
          </ion-segment-button>
          <ion-segment-button value="accounts">
            <ion-label>
              <ion-icon name="business-outline"></ion-icon>
              Accounts Directory
            </ion-label>
          </ion-segment-button>
          <ion-segment-button value="transactions">
            <ion-label>
              <ion-icon name="document-text-outline"></ion-icon>
              Ledger Transactions
            </ion-label>
          </ion-segment-button>
          <ion-segment-button value="reconciliation">
            <ion-label>
              <ion-icon name="shield-checkmark-outline"></ion-icon>
              Bank Reconciliation
            </ion-label>
          </ion-segment-button>
          <ion-segment-button value="cash-closing">
            <ion-label>
              <ion-icon name="lock-closed-outline"></ion-icon>
              Daily Cash Closing
            </ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding content-bg">
      <!-- Quick Action Floating/Top Bar -->
      <div class="action-bar ion-margin-bottom">
        <ion-button color="success" size="small" (click)="openReceiptModal()">
          <ion-icon name="arrow-down-outline" slot="start"></ion-icon>
          + Money Receipt
        </ion-button>
        <ion-button color="danger" size="small" (click)="openPaymentModal()">
          <ion-icon name="arrow-up-outline" slot="start"></ion-icon>
          - Payment Voucher
        </ion-button>
        <ion-button color="tertiary" size="small" (click)="openTransferModal()">
          <ion-icon name="swap-horizontal-outline" slot="start"></ion-icon>
          Contra / Inter-Account Transfer
        </ion-button>
        <ion-button color="warning" size="small" (click)="activeTab.set('cash-closing')">
          <ion-icon name="today-outline" slot="start"></ion-icon>
          Close Cash Counter
        </ion-button>
      </div>

      <!-- Loading Spinner -->
      <div class="loading-state" *ngIf="isLoading()">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p>Calculating verified book balances & ledgers...</p>
      </div>

      <!-- ================= 1. DASHBOARD & BALANCES TAB ================= -->
      <div *ngIf="activeTab() === 'dashboard' && !isLoading()">
        <!-- Summary KPI Grid -->
        <div class="kpi-grid">
          <div class="kpi-card total-card">
            <div class="kpi-icon"><ion-icon name="wallet-outline"></ion-icon></div>
            <div class="kpi-info">
              <span class="kpi-label">TOTAL BOOK BALANCE</span>
              <span class="kpi-val">₹{{ (dashboard()?.totalBookBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</span>
              <span class="kpi-sub">Across all configured accounts</span>
            </div>
          </div>

          <div class="kpi-card cash-card">
            <div class="kpi-icon"><ion-icon name="cash-outline"></ion-icon></div>
            <div class="kpi-info">
              <span class="kpi-label">CASH IN HAND</span>
              <span class="kpi-val">₹{{ (dashboard()?.cashInHand || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</span>
              <span class="kpi-sub">Physical counter cash register</span>
            </div>
          </div>

          <div class="kpi-card bank-card">
            <div class="kpi-icon"><ion-icon name="business-outline"></ion-icon></div>
            <div class="kpi-info">
              <span class="kpi-label">BANK BALANCES (BOOK)</span>
              <span class="kpi-val">₹{{ (dashboard()?.bankBalances || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</span>
              <span class="kpi-sub">Recorded ledger book balance</span>
            </div>
          </div>

          <div class="kpi-card upi-card">
            <div class="kpi-icon"><ion-icon name="qr-code-outline"></ion-icon></div>
            <div class="kpi-info">
              <span class="kpi-label">UPI / SETTLEMENTS</span>
              <span class="kpi-val">₹{{ (dashboard()?.upiSettlementBalances || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</span>
              <span class="kpi-sub">Gateway & QR unsettled balance</span>
            </div>
          </div>
        </div>

        <!-- Today Inflows vs Outflows Banner -->
        <div class="today-banner ion-margin-top ion-margin-bottom">
          <div class="banner-item receipt-item">
            <ion-icon name="arrow-down-outline"></ion-icon>
            <div>
              <div class="label">Today's Inflows / Receipts</div>
              <div class="amount">+₹{{ (dashboard()?.todayReceipts || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</div>
            </div>
          </div>
          <div class="banner-separator"></div>
          <div class="banner-item payment-item">
            <ion-icon name="arrow-up-outline"></ion-icon>
            <div>
              <div class="label">Today's Outflows / Payments</div>
              <div class="amount">-₹{{ (dashboard()?.todayPayments || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</div>
            </div>
          </div>
        </div>

        <!-- Individual Accounts Balance Cards Table -->
        <ion-card class="section-card">
          <ion-card-header>
            <ion-card-title>Configured Accounts Breakdown & Reconciliation Status</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Account Name</th>
                    <th>Type</th>
                    <th>Account Details</th>
                    <th style="text-align: right;">Book Balance</th>
                    <th style="text-align: center;">Reconciliation Variance</th>
                    <th style="text-align: center;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let acc of dashboard()?.accounts">
                    <td>
                      <strong>{{ acc.accountName }}</strong>
                      <ion-badge *ngIf="acc.isDefault" color="success" class="default-badge">Primary</ion-badge>
                    </td>
                    <td>
                      <ion-badge [color]="getTypeBadgeColor(acc.accountType)">{{ acc.accountType }}</ion-badge>
                    </td>
                    <td>
                      <div *ngIf="acc.bankName"><strong>Bank:</strong> {{ acc.bankName }}</div>
                      <div class="sub-text" *ngIf="acc.accountNumber">A/c: ****{{ acc.accountNumber.slice(-4) }}</div>
                      <div class="sub-text" *ngIf="!acc.bankName && !acc.accountNumber">In-Store Register</div>
                    </td>
                    <td style="text-align: right;">
                      <span class="balance-pill" [class.negative]="acc.bookBalance < 0">
                        ₹{{ acc.bookBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
                      </span>
                    </td>
                    <td style="text-align: center;">
                      <span *ngIf="acc.accountType === 'BANK'">
                        <ion-badge *ngIf="acc.unreconciledCount === 0" color="success">
                          ✓ Reconciled
                        </ion-badge>
                        <ion-badge *ngIf="acc.unreconciledCount > 0" color="warning">
                          {{ acc.unreconciledCount }} Unmatched (Diff: ₹{{ acc.unreconciledDifference }})
                        </ion-badge>
                      </span>
                      <span *ngIf="acc.accountType !== 'BANK'" class="sub-text">N/A</span>
                    </td>
                    <td style="text-align: center; white-space: nowrap;">
                      <ion-button size="small" fill="outline" (click)="inspectAccountReconciliation(acc.id)" *ngIf="acc.accountType === 'BANK'">
                        Reconcile
                      </ion-button>
                      <ion-button size="small" fill="clear" color="primary" (click)="viewAccountLedger(acc.id)" title="View Ledger">
                        Ledger
                      </ion-button>
                      <ion-button size="small" fill="clear" color="primary" (click)="openEditAccountModal(acc)" title="Edit Account">
                        <ion-icon name="create-outline" slot="icon-only"></ion-icon>
                      </ion-button>
                      <ion-button size="small" fill="clear" color="danger" (click)="deleteAccount(acc)" title="Delete Account">
                        <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
                      </ion-button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- ================= 2. ACCOUNTS DIRECTORY TAB ================= -->
      <div *ngIf="activeTab() === 'accounts' && !isLoading()">
        <ion-card class="section-card">
          <ion-card-header>
            <div class="header-split">
              <ion-card-title>Cash & Bank Accounts</ion-card-title>
              <ion-button size="small" (click)="openAddAccountModal()">
                <ion-icon name="add-outline" slot="start"></ion-icon>
                Create Account
              </ion-button>
            </div>
          </ion-card-header>
          <ion-card-content>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Account Type</th>
                    <th>Bank & Branch</th>
                    <th>Account / UPI No.</th>
                    <th>Opening Date</th>
                    <th style="text-align: right;">Opening Balance</th>
                    <th style="text-align: right;">Total Inflows</th>
                    <th style="text-align: right;">Total Outflows</th>
                    <th style="text-align: right;">Calculated Book Balance</th>
                    <th style="text-align: center;">Status</th>
                    <th style="text-align: center;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let a of accountsList()">
                    <td>
                      <strong>{{ a.accountName }}</strong>
                      <ion-badge *ngIf="a.isDefault" color="primary" class="default-badge">DEFAULT</ion-badge>
                    </td>
                    <td><ion-badge [color]="getTypeBadgeColor(a.accountType)">{{ a.accountType }}</ion-badge></td>
                    <td>
                      <div>{{ a.bankName || 'Cash Vault / Register' }}</div>
                      <div class="sub-text" *ngIf="a.branchName">{{ a.branchName }} (IFSC: {{ a.ifscCode || 'N/A' }})</div>
                    </td>
                    <td>
                      <div *ngIf="a.accountNumber">{{ a.accountNumber }}</div>
                      <div *ngIf="a.upiId" class="sub-text">UPI: {{ a.upiId }}</div>
                      <div *ngIf="!a.accountNumber && !a.upiId" class="sub-text">-</div>
                    </td>
                    <td>{{ a.openingDate | date:'mediumDate' }}</td>
                    <td style="text-align: right;">₹{{ a.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</td>
                    <td style="text-align: right; color: #16a34a;">+₹{{ (a.totalInflows || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</td>
                    <td style="text-align: right; color: #dc2626;">-₹{{ (a.totalOutflows || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</td>
                    <td style="text-align: right;">
                      <span class="balance-pill">
                        ₹{{ (a.bookBalance ?? a.currentBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
                      </span>
                    </td>
                    <td style="text-align: center;">
                      <ion-badge [color]="a.isActive ? 'success' : 'medium'">
                        {{ a.isActive ? 'ACTIVE' : 'INACTIVE' }}
                      </ion-badge>
                    </td>
                    <td style="text-align: center; white-space: nowrap;">
                      <ion-button size="small" fill="clear" color="primary" (click)="openEditAccountModal(a)" title="Edit Account">
                        <ion-icon name="create-outline" slot="icon-only"></ion-icon>
                      </ion-button>
                      <ion-button size="small" fill="clear" color="danger" (click)="deleteAccount(a)" title="Delete Account">
                        <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
                      </ion-button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- ================= 3. LEDGER TRANSACTIONS TAB ================= -->
      <div *ngIf="activeTab() === 'transactions' && !isLoading()">
        <ion-card class="section-card">
          <ion-card-header>
            <div class="filter-row">
              <ion-card-title>Transaction Ledger & Audit Trail</ion-card-title>
              <div class="filter-controls">
                <ion-select
                  placeholder="Filter Account"
                  [(ngModel)]="filterAccountId"
                  (ionChange)="loadTransactions()"
                  interface="popover"
                >
                  <ion-select-option value="">All Accounts</ion-select-option>
                  <ion-select-option *ngFor="let acc of accountsList()" [value]="acc.id">
                    {{ acc.accountName }}
                  </ion-select-option>
                </ion-select>
              </div>
            </div>
          </ion-card-header>
          <ion-card-content>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Account</th>
                    <th>Type / Purpose</th>
                    <th>Method</th>
                    <th>Party / Reference</th>
                    <th>Narration</th>
                    <th style="text-align: right;">Amount</th>
                    <th style="text-align: right;">Balance After</th>
                    <th style="text-align: center;">Audit / Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let tx of transactions()" [class.reversed-row]="tx.isReversed">
                    <td>
                      <div>{{ tx.transactionDate | date:'mediumDate' }}</div>
                      <div class="sub-text">{{ tx.transactionDate | date:'shortTime' }}</div>
                    </td>
                    <td>
                      <strong>{{ tx.account?.accountName || 'Primary A/c' }}</strong>
                    </td>
                    <td>
                      <ion-badge [color]="getTransactionBadgeColor(tx.transactionType)">
                        {{ tx.transactionType }}
                      </ion-badge>
                    </td>
                    <td><ion-badge color="light">{{ tx.paymentMethod }}</ion-badge></td>
                    <td>
                      <div>{{ tx.partyName || 'Counter Party' }}</div>
                      <div class="sub-text" *ngIf="tx.referenceNumber">Ref: {{ tx.referenceNumber }}</div>
                    </td>
                    <td>{{ tx.narration || '-' }}</td>
                    <td style="text-align: right;">
                      <span [class.inflow-text]="isInflow(tx.transactionType)" [class.outflow-text]="!isInflow(tx.transactionType)">
                        {{ isInflow(tx.transactionType) ? '+' : '-' }}₹{{ tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      ₹{{ (tx.balanceAfter || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
                    </td>
                    <td style="text-align: center;">
                      <span *ngIf="tx.isReversed">
                        <ion-badge color="danger">REVERSED</ion-badge>
                        <div class="sub-text">{{ tx.reversalReason }}</div>
                      </span>
                      <ion-button
                        *ngIf="!tx.isReversed"
                        size="small"
                        fill="outline"
                        color="danger"
                        (click)="promptReversal(tx)"
                      >
                        Reverse
                      </ion-button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- ================= 4. BANK RECONCILIATION TAB ================= -->
      <div *ngIf="activeTab() === 'reconciliation' && !isLoading()">
        <ion-card class="section-card">
          <ion-card-header>
            <div class="header-split">
              <div>
                <ion-card-title>Bank Statement Reconciliation</ion-card-title>
                <div class="sub-text">Match recorded book entries against official imported bank statements</div>
              </div>
              <div class="action-buttons">
                <ion-select
                  [(ngModel)]="selectedReconcileAccountId"
                  (ionChange)="loadReconciliation()"
                  interface="popover"
                  placeholder="Select Bank Account"
                >
                  <ion-select-option *ngFor="let b of bankOnlyAccounts()" [value]="b.id">
                    {{ b.accountName }} ({{ b.bankName }})
                  </ion-select-option>
                </ion-select>
                <ion-button size="small" fill="solid" (click)="openImportStatementModal()">
                  + Import Statement
                </ion-button>
              </div>
            </div>
          </ion-card-header>
          <ion-card-content>
            <!-- Reconciliation Comparative Strip -->
            <div class="reconcile-strip ion-margin-bottom" *ngIf="reconciliation()">
              <div class="strip-item">
                <span class="label">Book Balance:</span>
                <span class="val">₹{{ (reconciliation()?.bookBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</span>
              </div>
              <div class="strip-item">
                <span class="label">Statement Balance:</span>
                <span class="val">
                  {{ reconciliation()?.statementBalance !== null ? '₹' + reconciliation()?.statementBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : 'No Statement Yet' }}
                </span>
              </div>
              <div class="strip-item difference-item">
                <span class="label">Reconciliation Difference:</span>
                <span class="val" [class.has-diff]="(reconciliation()?.difference || 0) !== 0">
                  {{ reconciliation()?.difference !== null ? '₹' + reconciliation()?.difference?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : 'N/A' }}
                </span>
              </div>
            </div>

            <!-- Unmatched Statement Rows -->
            <h4>Unmatched Statement Entries ({{ reconciliation()?.unmatchedEntries?.length || 0 }})</h4>
            <div class="table-responsive ion-margin-bottom">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Reference</th>
                    <th style="text-align: right;">Withdrawal</th>
                    <th style="text-align: right;">Deposit</th>
                    <th style="text-align: right;">Statement Balance</th>
                    <th style="text-align: center;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let s of reconciliation()?.unmatchedEntries">
                    <td>{{ s.statementDate | date:'mediumDate' }}</td>
                    <td>{{ s.description }}</td>
                    <td>{{ s.referenceNumber || '-' }}</td>
                    <td style="text-align: right; color: #dc2626;">{{ s.withdrawalAmount > 0 ? '₹' + s.withdrawalAmount : '-' }}</td>
                    <td style="text-align: right; color: #16a34a;">{{ s.depositAmount > 0 ? '₹' + s.depositAmount : '-' }}</td>
                    <td style="text-align: right;">{{ s.bankBalance !== null ? '₹' + s.bankBalance : '-' }}</td>
                    <td style="text-align: center;">
                      <ion-button size="small" fill="solid" color="success" (click)="matchStatementEntry(s.id)">
                        Match Book Tx
                      </ion-button>
                    </td>
                  </tr>
                  <tr *ngIf="!reconciliation()?.unmatchedEntries?.length">
                    <td colspan="7" style="text-align: center; color: #64748b; padding: 20px;">
                      No unmatched statement entries. All transactions are fully reconciled!
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Matched Statement Rows -->
            <h4>Matched / Reconciled Entries ({{ reconciliation()?.matchedEntries?.length || 0 }})</h4>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Reference</th>
                    <th style="text-align: right;">Amount</th>
                    <th>Matched Transaction</th>
                    <th style="text-align: center;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let m of reconciliation()?.matchedEntries">
                    <td>{{ m.statementDate | date:'mediumDate' }}</td>
                    <td>{{ m.description }}</td>
                    <td>{{ m.referenceNumber || '-' }}</td>
                    <td style="text-align: right;">
                      ₹{{ (m.depositAmount > 0 ? m.depositAmount : m.withdrawalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}
                    </td>
                    <td>
                      <span *ngIf="m.matchedTransaction">
                        Tx #{{ m.matchedTransaction.id.slice(0, 8) }} ({{ m.matchedTransaction.partyName || m.matchedTransaction.narration }})
                      </span>
                      <span *ngIf="!m.matchedTransaction" class="sub-text">Manually Verified</span>
                    </td>
                    <td style="text-align: center;">
                      <ion-button size="small" fill="outline" color="warning" (click)="unmatchEntry(m.id)">
                        Unmatch
                      </ion-button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- ================= 5. DAILY CASH CLOSING TAB ================= -->
      <div *ngIf="activeTab() === 'cash-closing' && !isLoading()">
        <ion-card class="section-card">
          <ion-card-header>
            <ion-card-title>End-of-Day Cash Counter Closing & Audit</ion-card-title>
            <div class="sub-text">Reconcile physical cash counted in drawer against calculated system expected cash</div>
          </ion-card-header>
          <ion-card-content>
            <div class="closing-grid">
              <!-- Summary Numbers -->
              <div class="closing-summary-box">
                <div class="summary-line">
                  <span>Opening Cash (From Start of Day):</span>
                  <strong>₹{{ (cashClosingStatus()?.openingCash || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</strong>
                </div>
                <div class="summary-line">
                  <span>+ Total Cash Receipts Today:</span>
                  <strong style="color: #16a34a;">+₹{{ (cashClosingStatus()?.cashReceipts || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</strong>
                </div>
                <div class="summary-line">
                  <span>- Total Cash Payments Today:</span>
                  <strong style="color: #dc2626;">-₹{{ (cashClosingStatus()?.cashPayments || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</strong>
                </div>
                <hr />
                <div class="summary-line total-line">
                  <span>SYSTEM EXPECTED CASH BALANCE:</span>
                  <span class="expected-val">₹{{ (cashClosingStatus()?.expectedCash || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</span>
                </div>
              </div>

              <!-- Physical Cash Count Submission Form -->
              <div class="closing-form-box">
                <div *ngIf="cashClosingStatus()?.isClosed" class="closed-notice">
                  <ion-icon name="checkmark-circle-outline"></ion-icon>
                  <div style="flex: 1;">
                    <strong>Cash Counter Closed For Today</strong>
                    <div>Physical Cash Counted: ₹{{ cashClosingStatus()?.closingRecord?.physicalCashCounted }}</div>
                    <div>Variance / Shortage: ₹{{ cashClosingStatus()?.closingRecord?.differenceAmount }}</div>
                    <div class="sub-text">Closed by: {{ cashClosingStatus()?.closingRecord?.closedBy?.fullName || 'Pharmacist' }}</div>
                  </div>
                  <ion-button size="small" color="light" fill="solid" (click)="reopenCashClosing()" title="Unlock register to adjust physical count">
                    <ion-icon name="lock-open-outline" slot="start"></ion-icon>
                    Reopen / Recount
                  </ion-button>
                </div>

                <div *ngIf="!cashClosingStatus()?.isClosed">
                  <ion-item lines="none" class="input-item">
                    <ion-label position="stacked">Physical Cash Counted in Drawer (₹)*</ion-label>
                    <ion-input
                      type="number"
                      placeholder="e.g. 14500"
                      [(ngModel)]="physicalCashInput"
                      (ionInput)="calculateCashDifference()"
                    ></ion-input>
                  </ion-item>

                  <div class="difference-pill-box ion-margin-top ion-margin-bottom" *ngIf="physicalCashInput !== null">
                    <span class="diff-label">Variance (Counted − Expected):</span>
                    <span class="diff-val" [class.shortage]="cashDifference < 0" [class.excess]="cashDifference > 0">
                      {{ cashDifference >= 0 ? '+' : '' }}₹{{ cashDifference.toFixed(2) }}
                      <span *ngIf="cashDifference === 0">(Exact Match)</span>
                      <span *ngIf="cashDifference < 0">(Shortage)</span>
                      <span *ngIf="cashDifference > 0">(Excess)</span>
                    </span>
                  </div>

                  <ion-item lines="none" class="input-item">
                    <ion-label position="stacked">Closing Notes & Denominations Breakdown</ion-label>
                    <ion-textarea
                      rows="3"
                      placeholder="e.g. 500x20, 200x15, 100x10. Shortage due to petty medicine emergency purchase."
                      [(ngModel)]="cashClosingNotes"
                    ></ion-textarea>
                  </ion-item>

                  <ion-button
                    expand="block"
                    color="warning"
                    class="ion-margin-top"
                    (click)="submitCashClosing()"
                    [disabled]="physicalCashInput === null || physicalCashInput < 0"
                  >
                    <ion-icon name="lock-closed-outline" slot="start"></ion-icon>
                    Confirm & Lock Daily Cash Closing
                  </ion-button>
                </div>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>

    <!-- ================= MODAL: ADD ACCOUNT ================= -->
    <ion-modal [isOpen]="isAddAccountModalOpen()">
      <ng-template>
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>{{ editingAccountId() ? 'Edit Cash / Bank Account' : 'Create Cash / Bank Account' }}</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="isAddAccountModalOpen.set(false)">
                <ion-icon name="close-outline"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding modal-content">
          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Account Name *</ion-label>
            <ion-input placeholder="e.g. HDFC Main Current A/c" [(ngModel)]="newAccount.accountName"></ion-input>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Account Type *</ion-label>
            <ion-select [(ngModel)]="newAccount.accountType" interface="popover">
              <ion-select-option value="CASH">Cash in Hand</ion-select-option>
              <ion-select-option value="BANK">Bank Account</ion-select-option>
              <ion-select-option value="UPI_SETTLEMENT">UPI / Payment Settlement Account</ion-select-option>
              <ion-select-option value="CHEQUE">Cheque Collection Account</ion-select-option>
            </ion-select>
          </ion-item>

          <div *ngIf="newAccount.accountType === 'BANK'">
            <ion-item lines="none" class="input-item">
              <ion-label position="stacked">Bank Name</ion-label>
              <ion-input placeholder="e.g. HDFC Bank" [(ngModel)]="newAccount.bankName"></ion-input>
            </ion-item>
            <ion-item lines="none" class="input-item">
              <ion-label position="stacked">Account Number</ion-label>
              <ion-input placeholder="e.g. 50200012345678" [(ngModel)]="newAccount.accountNumber"></ion-input>
            </ion-item>
            <ion-item lines="none" class="input-item">
              <ion-label position="stacked">IFSC Code</ion-label>
              <ion-input placeholder="e.g. HDFC0001234" [(ngModel)]="newAccount.ifscCode"></ion-input>
            </ion-item>
          </div>

          <div *ngIf="newAccount.accountType === 'UPI_SETTLEMENT'">
            <ion-item lines="none" class="input-item">
              <ion-label position="stacked">UPI ID (VPA)</ion-label>
              <ion-input placeholder="e.g. pharmacy@hdfcbank" [(ngModel)]="newAccount.upiId"></ion-input>
            </ion-item>
          </div>

          <ion-item lines="none" class="input-item" *ngIf="!editingAccountId()">
            <ion-label position="stacked">Opening Balance (₹) *</ion-label>
            <ion-input type="number" placeholder="0.00" [(ngModel)]="newAccount.openingBalance"></ion-input>
          </ion-item>

          <ion-note color="medium" class="security-note">
            🛡️ Privacy & Security: Never enter or store internet banking passwords, PINs, or OTPs. PharmaPulse only tracks verified book ledgers.
          </ion-note>

          <ion-button expand="block" color="primary" class="ion-margin-top" (click)="saveAccount()">
            {{ editingAccountId() ? 'Update Account' : 'Save Account' }}
          </ion-button>
        </ion-content>
      </ng-template>
    </ion-modal>

    <!-- ================= MODAL: RECEIPT VOUCHER ================= -->
    <ion-modal [isOpen]="isReceiptModalOpen()">
      <ng-template>
        <ion-header>
          <ion-toolbar color="success">
            <ion-title>Money Receipt Voucher</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="isReceiptModalOpen.set(false)"><ion-icon name="close-outline"></ion-icon></ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding modal-content">
          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Deposit Into Account *</ion-label>
            <ion-select [(ngModel)]="voucher.accountId" interface="popover">
              <ion-select-option *ngFor="let acc of accountsList()" [value]="acc.id">
                {{ acc.accountName }} (Balance: ₹{{ acc.bookBalance }})
              </ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Receipt Purpose / Type</ion-label>
            <ion-select [(ngModel)]="voucher.transactionType" interface="popover">
              <ion-select-option value="RECEIPT">General Money Receipt</ion-select-option>
              <ion-select-option value="CUSTOMER_COLLECTION">Customer / Patient Due Collection</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Amount (₹) *</ion-label>
            <ion-input type="number" placeholder="0.00" [(ngModel)]="voucher.amount"></ion-input>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Received From (Party / Customer Name)</ion-label>
            <ion-input placeholder="e.g. Ramesh Kumar" [(ngModel)]="voucher.partyName"></ion-input>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Payment Method</ion-label>
            <ion-select [(ngModel)]="voucher.paymentMethod" interface="popover">
              <ion-select-option value="CASH">Cash</ion-select-option>
              <ion-select-option value="UPI">UPI</ion-select-option>
              <ion-select-option value="CARD">Debit / Credit Card</ion-select-option>
              <ion-select-option value="CHEQUE">Cheque</ion-select-option>
              <ion-select-option value="NET_BANKING">Net Banking / NEFT</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Reference / Cheque / UTR No.</ion-label>
            <ion-input placeholder="e.g. UTR-92837482" [(ngModel)]="voucher.referenceNumber"></ion-input>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Narration / Remarks</ion-label>
            <ion-input placeholder="e.g. Balance settlement for bill #104" [(ngModel)]="voucher.narration"></ion-input>
          </ion-item>

          <ion-button expand="block" color="success" class="ion-margin-top" (click)="saveTransaction()">
            Post Money Receipt
          </ion-button>
        </ion-content>
      </ng-template>
    </ion-modal>

    <!-- ================= MODAL: PAYMENT VOUCHER ================= -->
    <ion-modal [isOpen]="isPaymentModalOpen()">
      <ng-template>
        <ion-header>
          <ion-toolbar color="danger">
            <ion-title>Payment Voucher (Expenses / Suppliers)</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="isPaymentModalOpen.set(false)"><ion-icon name="close-outline"></ion-icon></ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding modal-content">
          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Pay From Account *</ion-label>
            <ion-select [(ngModel)]="voucher.accountId" interface="popover">
              <ion-select-option *ngFor="let acc of accountsList()" [value]="acc.id">
                {{ acc.accountName }} (Balance: ₹{{ acc.bookBalance }})
              </ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Payment Category *</ion-label>
            <ion-select [(ngModel)]="voucher.transactionType" interface="popover">
              <ion-select-option value="EXPENSE">Expense Payment (Rent, Electricity, Tea)</ion-select-option>
              <ion-select-option value="SUPPLIER_PAYMENT">Supplier / Distributor Payment</ion-select-option>
              <ion-select-option value="PAYMENT">General Direct Payment</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Amount (₹) *</ion-label>
            <ion-input type="number" placeholder="0.00" [(ngModel)]="voucher.amount"></ion-input>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Paid To (Party / Beneficiary Name)</ion-label>
            <ion-input placeholder="e.g. MedPlus Logistics / Electric Dept" [(ngModel)]="voucher.partyName"></ion-input>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Payment Method</ion-label>
            <ion-select [(ngModel)]="voucher.paymentMethod" interface="popover">
              <ion-select-option value="CASH">Cash</ion-select-option>
              <ion-select-option value="UPI">UPI</ion-select-option>
              <ion-select-option value="CARD">Debit / Credit Card</ion-select-option>
              <ion-select-option value="CHEQUE">Cheque</ion-select-option>
              <ion-select-option value="NET_BANKING">Net Banking / NEFT</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Reference / Cheque / UTR No.</ion-label>
            <ion-input placeholder="e.g. CHQ-48291" [(ngModel)]="voucher.referenceNumber"></ion-input>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Narration / Reason</ion-label>
            <ion-input placeholder="e.g. Shop electricity bill for Oct" [(ngModel)]="voucher.narration"></ion-input>
          </ion-item>

          <ion-button expand="block" color="danger" class="ion-margin-top" (click)="saveTransaction()">
            Post Payment Voucher
          </ion-button>
        </ion-content>
      </ng-template>
    </ion-modal>

    <!-- ================= MODAL: CONTRA / TRANSFER FUNDS ================= -->
    <ion-modal [isOpen]="isTransferModalOpen()">
      <ng-template>
        <ion-header>
          <ion-toolbar color="tertiary">
            <ion-title>Contra Transfer (Cash Deposit / Withdrawal / Inter-Bank)</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="isTransferModalOpen.set(false)"><ion-icon name="close-outline"></ion-icon></ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding modal-content">
          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Transfer Type *</ion-label>
            <ion-select [(ngModel)]="transferDto.transactionType" interface="popover">
              <ion-select-option value="DEPOSIT">Cash Deposit into Bank (Cash -> Bank)</ion-select-option>
              <ion-select-option value="WITHDRAWAL">Cash Withdrawal from Bank (Bank -> Cash)</ion-select-option>
              <ion-select-option value="TRANSFER">Bank-to-Bank Transfer</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Source Account (Outflow) *</ion-label>
            <ion-select [(ngModel)]="transferDto.accountId" interface="popover">
              <ion-select-option *ngFor="let acc of accountsList()" [value]="acc.id">
                {{ acc.accountName }} (Balance: ₹{{ acc.bookBalance }})
              </ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Destination Account (Inflow) *</ion-label>
            <ion-select [(ngModel)]="transferDto.transferAccountId" interface="popover">
              <ion-select-option *ngFor="let acc of accountsList()" [value]="acc.id">
                {{ acc.accountName }} (Balance: ₹{{ acc.bookBalance }})
              </ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Amount (₹) *</ion-label>
            <ion-input type="number" placeholder="0.00" [(ngModel)]="transferDto.amount"></ion-input>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Reference / UTR / Slip No.</ion-label>
            <ion-input placeholder="e.g. DEPOSIT-SLIP-401" [(ngModel)]="transferDto.referenceNumber"></ion-input>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Narration</ion-label>
            <ion-input placeholder="e.g. Deposited cash takings into HDFC" [(ngModel)]="transferDto.narration"></ion-input>
          </ion-item>

          <ion-note color="medium" class="security-note">
            💡 Accounting Principle: Contra transfers do not affect Profit & Loss. Both source debit and destination credit are posted atomically in a single database transaction.
          </ion-note>

          <ion-button expand="block" color="tertiary" class="ion-margin-top" (click)="saveTransfer()">
            Execute Contra Transfer
          </ion-button>
        </ion-content>
      </ng-template>
    </ion-modal>

    <!-- ================= MODAL: IMPORT STATEMENT ================= -->
    <ion-modal [isOpen]="isImportStatementModalOpen()">
      <ng-template>
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Import Bank Statement Rows</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="isImportStatementModalOpen.set(false)"><ion-icon name="close-outline"></ion-icon></ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding modal-content">
          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Select Bank Account *</ion-label>
            <ion-select [(ngModel)]="statementImport.accountId" interface="popover">
              <ion-select-option *ngFor="let b of bankOnlyAccounts()" [value]="b.id">
                {{ b.accountName }} ({{ b.bankName }})
              </ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Statement Date *</ion-label>
            <ion-input type="date" [(ngModel)]="statementLine.statementDate"></ion-input>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Description / Narration *</ion-label>
            <ion-input placeholder="e.g. NEFT INWARD - MEDICARE REF" [(ngModel)]="statementLine.description"></ion-input>
          </ion-item>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Reference Number</ion-label>
            <ion-input placeholder="e.g. UTR10293847" [(ngModel)]="statementLine.referenceNumber"></ion-input>
          </ion-item>

          <div class="row-inputs">
            <ion-item lines="none" class="input-item">
              <ion-label position="stacked">Withdrawal / Debit (₹)</ion-label>
              <ion-input type="number" placeholder="0.00" [(ngModel)]="statementLine.withdrawalAmount"></ion-input>
            </ion-item>
            <ion-item lines="none" class="input-item">
              <ion-label position="stacked">Deposit / Credit (₹)</ion-label>
              <ion-input type="number" placeholder="0.00" [(ngModel)]="statementLine.depositAmount"></ion-input>
            </ion-item>
          </div>

          <ion-item lines="none" class="input-item">
            <ion-label position="stacked">Actual Statement Bank Balance After (₹)</ion-label>
            <ion-input type="number" placeholder="e.g. 154200.00" [(ngModel)]="statementLine.bankBalance"></ion-input>
          </ion-item>

          <ion-button expand="block" color="primary" class="ion-margin-top" (click)="saveStatementEntry()">
            Save Statement Entry
          </ion-button>
        </ion-content>
      </ng-template>
    </ion-modal>

    <!-- Toast Notification -->
    <ion-toast
      [isOpen]="!!toastMessage()"
      [message]="toastMessage()"
      [duration]="3500"
      position="top"
      cssClass="toast-top-right"
      (didDismiss)="toastMessage.set('')"
    ></ion-toast>
  `,
  styles: [
    `
      .content-bg {
        --background: #f8fafc;
      }
      .action-bar {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
      }
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
      }
      .kpi-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 18px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        border: 1px solid #e2e8f0;
      }
      .kpi-icon {
        width: 48px;
        height: 48px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      }
      .total-card .kpi-icon { background: #e0f2fe; color: #0284c7; }
      .cash-card .kpi-icon { background: #dcfce7; color: #16a34a; }
      .bank-card .kpi-icon { background: #f3e8ff; color: #9333ea; }
      .upi-card .kpi-icon { background: #fef3c7; color: #d97706; }

      .kpi-info {
        display: flex;
        flex-direction: column;
      }
      .kpi-label {
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
        letter-spacing: 0.5px;
      }
      .kpi-val {
        font-size: 22px;
        font-weight: 800;
        color: #0f172a;
        margin: 4px 0 2px 0;
      }
      .kpi-sub {
        font-size: 11px;
        color: #94a3b8;
      }

      .today-banner {
        display: flex;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 14px 20px;
        align-items: center;
        justify-content: space-around;
      }
      .banner-item {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .banner-item ion-icon {
        font-size: 26px;
      }
      .receipt-item ion-icon { color: #16a34a; }
      .payment-item ion-icon { color: #dc2626; }
      .banner-item .label {
        font-size: 12px;
        color: #64748b;
        font-weight: 600;
      }
      .banner-item .amount {
        font-size: 18px;
        font-weight: 700;
      }
      .receipt-item .amount { color: #16a34a; }
      .payment-item .amount { color: #dc2626; }
      .banner-separator {
        width: 1px;
        height: 36px;
        background: #e2e8f0;
      }

      .section-card {
        background: #ffffff;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        margin: 0;
      }
      .header-split, .filter-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        flex-wrap: wrap;
        gap: 10px;
      }
      .filter-controls, .action-buttons {
        display: flex;
        gap: 10px;
        align-items: center;
      }

      .table-responsive {
        overflow-x: auto;
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .data-table th {
        background: #f8fafc;
        padding: 10px 12px;
        text-align: left;
        color: #475569;
        font-weight: 600;
        border-bottom: 1px solid #e2e8f0;
      }
      .data-table td {
        padding: 12px;
        border-bottom: 1px solid #f1f5f9;
        color: #1e293b;
      }
      .data-table tr:hover {
        background: #f8fafc;
      }
      .sub-text {
        font-size: 11px;
        color: #64748b;
      }
      .balance-pill {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 20px;
        background: #ecfdf5;
        color: #065f46;
        font-weight: 700;
      }
      .balance-pill.negative {
        background: #fef2f2;
        color: #991b1b;
      }
      .default-badge {
        font-size: 9px;
        margin-left: 6px;
      }

      .inflow-text { color: #16a34a; font-weight: 600; }
      .outflow-text { color: #dc2626; font-weight: 600; }
      .reversed-row { opacity: 0.55; background: #fff1f2; text-decoration: line-through; }

      .reconcile-strip {
        display: flex;
        gap: 20px;
        background: #f1f5f9;
        padding: 12px 18px;
        border-radius: 8px;
        flex-wrap: wrap;
      }
      .strip-item .label {
        font-size: 12px;
        color: #64748b;
        margin-right: 6px;
      }
      .strip-item .val {
        font-size: 16px;
        font-weight: 700;
        color: #0f172a;
      }
      .difference-item .val.has-diff {
        color: #dc2626;
      }

      .closing-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
      }
      @media (max-width: 768px) {
        .closing-grid { grid-template-columns: 1fr; }
      }
      .closing-summary-box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 20px;
      }
      .summary-line {
        display: flex;
        justify-content: space-between;
        margin-bottom: 12px;
        font-size: 14px;
        color: #334155;
      }
      .total-line {
        font-size: 15px;
        font-weight: 700;
        margin-top: 14px;
      }
      .expected-val {
        font-size: 22px;
        font-weight: 800;
        color: #0284c7;
      }
      .closing-form-box {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 20px;
      }
      .diff-val.shortage { color: #dc2626; font-weight: 700; font-size: 16px; }
      .diff-val.excess { color: #16a34a; font-weight: 700; font-size: 16px; }
      .closed-notice {
        display: flex;
        gap: 16px;
        background: #ecfdf5;
        border: 1px solid #a7f3d0;
        padding: 16px;
        border-radius: 10px;
        color: #065f46;
      }
      .closed-notice ion-icon { font-size: 32px; color: #10b981; }

      .input-item {
        --background: #f8fafc;
        border-radius: 8px;
        margin-bottom: 12px;
        border: 1px solid #e2e8f0;
      }
      .security-note {
        display: block;
        font-size: 11px;
        margin-top: 8px;
        line-height: 1.4;
      }
      .row-inputs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .loading-state {
        text-align: center;
        padding: 40px;
        color: #64748b;
      }
    `,
  ],
})
export class BankingComponent implements OnInit {
  activeTab = signal<'dashboard' | 'accounts' | 'transactions' | 'reconciliation' | 'cash-closing'>('dashboard');
  isLoading = signal<boolean>(false);
  toastMessage = signal<string>('');

  // Data signals
  dashboard = signal<BankDashboardSummary | null>(null);
  accountsList = signal<CashBankAccount[]>([]);
  transactions = signal<CashBankTransaction[]>([]);
  reconciliation = signal<BankReconciliationSummary | null>(null);
  cashClosingStatus = signal<DailyCashClosingStatus | null>(null);

  // Filters
  filterAccountId = '';
  selectedReconcileAccountId = '';

  // Modals
  isAddAccountModalOpen = signal<boolean>(false);
  isReceiptModalOpen = signal<boolean>(false);
  isPaymentModalOpen = signal<boolean>(false);
  isTransferModalOpen = signal<boolean>(false);
  isImportStatementModalOpen = signal<boolean>(false);

  // Form Models
  editingAccountId = signal<string | null>(null);
  newAccount: any = {
    accountName: '',
    accountType: 'BANK',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
    openingBalance: 0,
    isDefault: false,
  };

  voucher: any = {
    accountId: '',
    transactionType: 'RECEIPT',
    amount: null,
    paymentMethod: 'CASH',
    referenceNumber: '',
    partyName: '',
    narration: '',
  };

  transferDto: any = {
    transactionType: 'DEPOSIT',
    accountId: '',
    transferAccountId: '',
    amount: null,
    referenceNumber: '',
    narration: '',
  };

  statementImport: any = {
    accountId: '',
  };
  statementLine: any = {
    statementDate: new Date().toISOString().slice(0, 10),
    description: '',
    referenceNumber: '',
    withdrawalAmount: 0,
    depositAmount: 0,
    bankBalance: null,
  };

  // Cash Closing
  physicalCashInput: number | null = null;
  cashClosingNotes = '';
  cashDifference = 0;

  bankOnlyAccounts = computed(() => {
    return this.accountsList().filter((a) => a.accountType === 'BANK');
  });

  constructor(
    private apiService: ApiService,
    private alertController: AlertController,
  ) {
    addIcons({
      walletOutline,
      cashOutline,
      businessOutline,
      swapHorizontalOutline,
      arrowDownOutline,
      arrowUpOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      refreshOutline,
      addOutline,
      closeOutline,
      documentTextOutline,
      todayOutline,
      shieldCheckmarkOutline,
      cardOutline,
      qrCodeOutline,
      lockClosedOutline,
      receiptOutline,
      timeOutline,
      createOutline,
      trashOutline,
      lockOpenOutline,
    });
  }

  ngOnInit() {
    this.loadAllData();
  }

  onTabChange(event: any) {
    this.activeTab.set(event.detail.value);
    if (this.activeTab() === 'transactions') {
      this.loadTransactions();
    } else if (this.activeTab() === 'reconciliation') {
      this.loadReconciliation();
    } else if (this.activeTab() === 'cash-closing') {
      this.loadCashClosing();
    }
  }

  loadAllData() {
    this.isLoading.set(true);
    this.apiService.getBankDashboard().subscribe({
      next: (res) => {
        this.dashboard.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });

    this.apiService.getBankAccounts().subscribe({
      next: (accounts) => {
        this.accountsList.set(accounts);
        if (accounts.length > 0 && !this.selectedReconcileAccountId) {
          const bankAcc = accounts.find((a) => a.accountType === 'BANK');
          if (bankAcc) this.selectedReconcileAccountId = bankAcc.id;
        }
      },
    });

    this.loadTransactions();
    this.loadCashClosing();
  }

  loadTransactions() {
    this.apiService
      .getBankTransactions({ accountId: this.filterAccountId || undefined })
      .subscribe({
        next: (txs) => this.transactions.set(txs),
      });
  }

  loadReconciliation() {
    if (!this.selectedReconcileAccountId) return;
    this.apiService
      .getBankReconciliation(this.selectedReconcileAccountId)
      .subscribe({
        next: (summary) => this.reconciliation.set(summary),
      });
  }

  loadCashClosing() {
    this.apiService.getCashClosingStatus().subscribe({
      next: (status) => {
        this.cashClosingStatus.set(status);
        if (status.closingRecord) {
          this.physicalCashInput = status.closingRecord.physicalCashCounted;
          this.cashDifference = status.closingRecord.differenceAmount;
        } else {
          this.calculateCashDifference();
        }
      },
    });
  }

  calculateCashDifference() {
    const expected = this.cashClosingStatus()?.expectedCash || 0;
    const counted = this.physicalCashInput || 0;
    this.cashDifference = counted - expected;
  }

  // Account Operations
  openAddAccountModal() {
    this.editingAccountId.set(null);
    this.newAccount = {
      accountName: '',
      accountType: 'BANK',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      upiId: '',
      openingBalance: 0,
      isDefault: false,
    };
    this.isAddAccountModalOpen.set(true);
  }

  openEditAccountModal(acc: any) {
    this.editingAccountId.set(acc.id);
    this.newAccount = {
      accountName: acc.accountName,
      accountType: acc.accountType,
      bankName: acc.bankName || '',
      accountNumber: acc.accountNumber || '',
      ifscCode: acc.ifscCode || '',
      upiId: acc.upiId || '',
      openingBalance: acc.openingBalance || 0,
      isDefault: !!acc.isDefault,
    };
    this.isAddAccountModalOpen.set(true);
  }

  saveAccount() {
    if (!this.newAccount.accountName.trim()) {
      this.toastMessage.set('Account name is required');
      return;
    }

    const accountId = this.editingAccountId();
    if (accountId) {
      // Update existing account
      const updatePayload: any = {
        accountName: this.newAccount.accountName,
        accountType: this.newAccount.accountType,
        bankName: this.newAccount.bankName,
        accountNumber: this.newAccount.accountNumber,
        ifscCode: this.newAccount.ifscCode,
        upiId: this.newAccount.upiId,
        isDefault: this.newAccount.isDefault,
      };

      this.apiService.updateBankAccount(accountId, updatePayload).subscribe({
        next: () => {
          this.isAddAccountModalOpen.set(false);
          this.toastMessage.set('Account updated successfully!');
          this.loadAllData();
        },
        error: (err) => {
          this.toastMessage.set(err.error?.message || 'Failed to update account');
        },
      });
    } else {
      // Create new account
      this.apiService.createBankAccount(this.newAccount).subscribe({
        next: () => {
          this.isAddAccountModalOpen.set(false);
          this.toastMessage.set('Cash / Bank Account created successfully!');
          this.loadAllData();
        },
        error: (err) => {
          this.toastMessage.set(err.error?.message || 'Failed to create account');
        },
      });
    }
  }

  async deleteAccount(acc: any) {
    const alert = await this.alertController.create({
      header: 'Delete Account',
      subHeader: acc.accountName,
      message: 'Are you sure you want to delete this account? Accounts with posted ledger transactions cannot be deleted for accounting audit integrity.',
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'alert-btn-cancel',
        },
        {
          text: 'Delete Account',
          role: 'destructive',
          cssClass: 'alert-btn-danger',
          handler: () => {
            this.apiService.deleteBankAccount(acc.id).subscribe({
              next: () => {
                this.toastMessage.set(`Account "${acc.accountName}" deleted successfully`);
                this.loadAllData();
              },
              error: (err) => {
                this.toastMessage.set(err.error?.message || 'Failed to delete account');
              },
            });
          },
        },
      ],
    });

    await alert.present();
  }

  // Vouchers & Transactions
  openReceiptModal() {
    const defaultAcc = this.accountsList().find((a) => a.isDefault) || this.accountsList()[0];
    this.voucher = {
      accountId: defaultAcc?.id || '',
      transactionType: 'RECEIPT',
      amount: null,
      paymentMethod: 'CASH',
      referenceNumber: '',
      partyName: '',
      narration: '',
    };
    this.isReceiptModalOpen.set(true);
  }

  openPaymentModal() {
    const defaultAcc = this.accountsList().find((a) => a.isDefault) || this.accountsList()[0];
    this.voucher = {
      accountId: defaultAcc?.id || '',
      transactionType: 'EXPENSE',
      amount: null,
      paymentMethod: 'CASH',
      referenceNumber: '',
      partyName: '',
      narration: '',
    };
    this.isPaymentModalOpen.set(true);
  }

  saveTransaction() {
    if (!this.voucher.accountId || !this.voucher.amount || Number(this.voucher.amount) <= 0) {
      this.toastMessage.set('Valid account and positive amount are required');
      return;
    }

    this.apiService.postBankTransaction(this.voucher).subscribe({
      next: () => {
        this.isReceiptModalOpen.set(false);
        this.isPaymentModalOpen.set(false);
        this.toastMessage.set('Ledger transaction recorded successfully!');
        this.loadAllData();
      },
      error: (err) => {
        this.toastMessage.set(err.error?.message || 'Transaction recording failed');
      },
    });
  }

  openTransferModal() {
    const cashAcc = this.accountsList().find((a) => a.accountType === 'CASH');
    const bankAcc = this.accountsList().find((a) => a.accountType === 'BANK');
    this.transferDto = {
      transactionType: 'DEPOSIT',
      accountId: cashAcc?.id || '',
      transferAccountId: bankAcc?.id || '',
      amount: null,
      referenceNumber: '',
      narration: '',
    };
    this.isTransferModalOpen.set(true);
  }

  saveTransfer() {
    if (!this.transferDto.accountId || !this.transferDto.transferAccountId) {
      this.toastMessage.set('Source and destination accounts are required');
      return;
    }
    if (this.transferDto.accountId === this.transferDto.transferAccountId) {
      this.toastMessage.set('Source and destination accounts must be different');
      return;
    }
    if (!this.transferDto.amount || Number(this.transferDto.amount) <= 0) {
      this.toastMessage.set('Amount must be positive');
      return;
    }

    this.apiService.postBankTransaction(this.transferDto).subscribe({
      next: () => {
        this.isTransferModalOpen.set(false);
        this.toastMessage.set('Contra Transfer executed atomically!');
        this.loadAllData();
      },
      error: (err) => {
        this.toastMessage.set(err.error?.message || 'Transfer failed');
      },
    });
  }

  async promptReversal(tx: CashBankTransaction) {
    const alert = await this.alertController.create({
      header: 'Reverse Transaction',
      subHeader: `Transaction #${tx.id.slice(0, 8)}`,
      message: 'Enter an auditable reason for reversing this transaction. A compensating accounting reversal entry will be posted to the ledger.',
      cssClass: 'custom-alert',
      inputs: [
        {
          name: 'reason',
          type: 'text',
          placeholder: 'e.g. Incorrect bank account selected / Duplicate receipt',
          attributes: {
            autofocus: true,
          },
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'alert-btn-cancel',
        },
        {
          text: 'Reverse Entry',
          role: 'confirm',
          cssClass: 'alert-btn-danger',
          handler: (data) => {
            const reason = data?.reason?.trim();
            if (!reason) {
              this.toastMessage.set('Please provide a valid auditable reason for reversal.');
              return false;
            }

            this.apiService.reverseBankTransaction(tx.id, reason).subscribe({
              next: () => {
                this.toastMessage.set('Transaction reversed and compensating entry posted!');
                this.loadAllData();
              },
              error: (err) => {
                this.toastMessage.set(err.error?.message || 'Reversal failed');
              },
            });
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  // Reconciliation
  inspectAccountReconciliation(accountId: string) {
    this.selectedReconcileAccountId = accountId;
    this.activeTab.set('reconciliation');
    this.loadReconciliation();
  }

  viewAccountLedger(accountId: string) {
    this.filterAccountId = accountId;
    this.activeTab.set('transactions');
    this.loadTransactions();
  }

  openImportStatementModal() {
    this.statementImport.accountId = this.selectedReconcileAccountId;
    this.statementLine = {
      statementDate: new Date().toISOString().slice(0, 10),
      description: '',
      referenceNumber: '',
      withdrawalAmount: 0,
      depositAmount: 0,
      bankBalance: null,
    };
    this.isImportStatementModalOpen.set(true);
  }

  saveStatementEntry() {
    if (!this.statementImport.accountId || !this.statementLine.description.trim()) {
      this.toastMessage.set('Account and description are required');
      return;
    }

    this.apiService
      .importBankStatement({
        accountId: this.statementImport.accountId,
        entries: [this.statementLine],
      })
      .subscribe({
        next: () => {
          this.isImportStatementModalOpen.set(false);
          this.toastMessage.set('Statement entry imported!');
          this.loadReconciliation();
          this.loadAllData();
        },
        error: (err) => {
          this.toastMessage.set(err.error?.message || 'Failed to import statement');
        },
      });
  }

  matchStatementEntry(statementId: string) {
    this.apiService.matchBankStatement({ statementId }).subscribe({
      next: () => {
        this.toastMessage.set('Statement entry marked reconciled!');
        this.loadReconciliation();
      },
      error: (err) => this.toastMessage.set(err.error?.message || 'Matching failed'),
    });
  }

  unmatchEntry(statementId: string) {
    this.apiService.unmatchBankStatement(statementId).subscribe({
      next: () => {
        this.toastMessage.set('Statement entry unmatched');
        this.loadReconciliation();
      },
      error: (err) => this.toastMessage.set(err.error?.message || 'Unmatch failed'),
    });
  }

  submitCashClosing() {
    const cashAcc = this.accountsList().find((a) => a.accountType === 'CASH');
    if (!cashAcc) {
      this.toastMessage.set('No active cash account found');
      return;
    }
    if (this.physicalCashInput === null || this.physicalCashInput < 0) {
      this.toastMessage.set('Please enter counted physical cash');
      return;
    }

    this.apiService
      .submitDailyCashClosing({
        accountId: cashAcc.id,
        physicalCashCounted: Number(this.physicalCashInput),
        notes: this.cashClosingNotes,
      })
      .subscribe({
        next: () => {
          this.toastMessage.set('Daily Cash Counter Closed & Locked!');
          this.loadCashClosing();
        },
        error: (err) => this.toastMessage.set(err.error?.message || 'Failed to close cash counter'),
      });
  }

  async reopenCashClosing() {
    const alert = await this.alertController.create({
      header: 'Reopen Cash Counter',
      message: 'This will unlock today’s cash register drawer so you can recount cash or enter updated denomination figures.',
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'alert-btn-cancel',
        },
        {
          text: 'Unlock & Reopen',
          role: 'confirm',
          cssClass: 'alert-btn-warning',
          handler: () => {
            this.apiService.reopenDailyCashClosing().subscribe({
              next: (res) => {
                this.toastMessage.set(res.message || 'Cash counter unlocked for recounting');
                this.loadCashClosing();
              },
              error: (err) => {
                this.toastMessage.set(err.error?.message || 'Failed to reopen cash counter');
              },
            });
          },
        },
      ],
    });

    await alert.present();
  }

  // Helpers
  getTypeBadgeColor(type: BankAccountType) {
    switch (type) {
      case 'CASH': return 'success';
      case 'BANK': return 'primary';
      case 'UPI_SETTLEMENT': return 'warning';
      case 'CHEQUE': return 'tertiary';
      default: return 'medium';
    }
  }

  getTransactionBadgeColor(type: BankTransactionType) {
    switch (type) {
      case 'RECEIPT':
      case 'CUSTOMER_COLLECTION':
        return 'success';
      case 'PAYMENT':
      case 'SUPPLIER_PAYMENT':
      case 'EXPENSE':
      case 'REFUND':
        return 'danger';
      case 'TRANSFER':
      case 'DEPOSIT':
      case 'WITHDRAWAL':
      case 'CONTRA_TRANSFER':
        return 'tertiary';
      default:
        return 'medium';
    }
  }

  isInflow(type: BankTransactionType): boolean {
    return (
      type === 'RECEIPT' ||
      type === 'CUSTOMER_COLLECTION' ||
      type === 'CONTRA_TRANSFER' ||
      type === 'DEPOSIT'
    );
  }
}
