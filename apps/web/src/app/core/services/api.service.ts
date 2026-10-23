import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Medicine } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = 'http://localhost:3000/api/v1';

  constructor(private http: HttpClient) {}

  // ----------------- MEDICINES -----------------
  getMedicines(params?: { search?: string; category?: string; page?: number; limit?: number }): Observable<any> {
    let httpParams = new HttpParams();
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.category) httpParams = httpParams.set('category', params.category);
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    return this.http.get<any>(`${this.baseUrl}/medicines`, { params: httpParams });
  }

  getMedicine(id: string): Observable<Medicine> {
    return this.http.get<Medicine>(`${this.baseUrl}/medicines/${id}`);
  }

  createMedicine(data: any): Observable<Medicine> {
    return this.http.post<Medicine>(`${this.baseUrl}/medicines`, data);
  }

  updateMedicine(id: string, data: any): Observable<Medicine> {
    return this.http.put<Medicine>(`${this.baseUrl}/medicines/${id}`, data);
  }

  toggleMedicineStatus(id: string): Observable<Medicine> {
    return this.http.patch<Medicine>(`${this.baseUrl}/medicines/${id}/toggle-status`, {});
  }

  deleteMedicine(id: string): Observable<{ success: boolean; softDeleted: boolean; message: string }> {
    return this.http.delete<{ success: boolean; softDeleted: boolean; message: string }>(`${this.baseUrl}/medicines/${id}`);
  }

  checkDuplicateMedicine(data: { name: string; barcode?: string; excludeId?: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/medicines/check-duplicate`, data);
  }

  getPackagingPreview(params: any): Observable<any> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        httpParams = httpParams.set(key, params[key].toString());
      }
    });
    return this.http.get<any>(`${this.baseUrl}/medicines/packaging-preview`, { params: httpParams });
  }

  // ----------------- INVENTORY & FEFO -----------------
  getBatches(medicineId?: string): Observable<any[]> {
    let params = new HttpParams();
    if (medicineId) params = params.set('medicineId', medicineId);
    return this.http.get<any[]>(`${this.baseUrl}/inventory/batches`, { params });
  }

  getFefoPreview(medicineId: string, quantity: number): Observable<any[]> {
    const params = new HttpParams().set('quantity', quantity.toString());
    return this.http.get<any[]>(`${this.baseUrl}/inventory/fefo-preview/${medicineId}`, { params });
  }

  getLowStock(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/inventory/low-stock`);
  }

  getExpiringBatches(days: number = 90): Observable<any[]> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<any[]>(`${this.baseUrl}/inventory/expiring`, { params });
  }

  createAdjustment(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/inventory/adjustments`, data);
  }

  updateBatchRack(batchId: string, rackLocation: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/inventory/batches/${batchId}/rack`, { rackLocation });
  }

  getStockLedger(params?: { medicineId?: string; batchId?: string; limit?: number }): Observable<any[]> {
    let httpParams = new HttpParams();
    if (params?.medicineId) httpParams = httpParams.set('medicineId', params.medicineId);
    if (params?.batchId) httpParams = httpParams.set('batchId', params.batchId);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    return this.http.get<any[]>(`${this.baseUrl}/inventory/ledger`, { params: httpParams });
  }

  // ----------------- POS SALES & BILLING -----------------
  checkoutSale(saleData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/sales/checkout`, saleData);
  }

  getSales(params?: { startDate?: string; endDate?: string; page?: number; limit?: number }): Observable<any> {
    let httpParams = new HttpParams();
    if (params?.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params?.endDate) httpParams = httpParams.set('endDate', params.endDate);
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    return this.http.get<any>(`${this.baseUrl}/sales`, { params: httpParams });
  }

  getSale(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/sales/${id}`);
  }

  getInvoicePrintUrl(id: string, format: 'a4' | 'thermal' = 'a4'): string {
    return `${this.baseUrl}/sales/${id}/print?format=${format}`;
  }

  getInvoicePrintHtml(id: string, format: 'a4' | 'thermal' = 'a4'): Observable<string> {
    return this.http.get(`${this.baseUrl}/sales/${id}/print?format=${format}`, {
      responseType: 'text',
    });
  }

  // ----------------- PURCHASES -----------------
  getPurchases(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/purchases`);
  }

  getPurchase(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/purchases/${id}`);
  }

  createDraftPurchase(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/purchases`, data);
  }

  postPurchase(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/purchases/${id}/post`, {});
  }

  cancelPurchase(id: string, reason?: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/purchases/${id}/cancel`, { reason });
  }

  // ----------------- CUSTOMERS & PATIENTS -----------------
  getCustomers(search?: string): Observable<any[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<any[]>(`${this.baseUrl}/customers`, { params });
  }

  getCustomer(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/customers/${id}`);
  }

  createCustomer(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/customers`, data);
  }

  updateCustomer(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/customers/${id}`, data);
  }

  // ----------------- SUPPLIERS -----------------
  getSuppliers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/suppliers`);
  }

  createSupplier(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/suppliers`, data);
  }

  recordSupplierPayment(supplierId: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/suppliers/${supplierId}/payments`, data);
  }

  // ----------------- RETURNS & QUARANTINE -----------------
  getReturns(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/returns`);
  }

  getReturn(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/returns/${id}`);
  }

  processReturn(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/returns`, data);
  }

  inspectReturnItem(itemId: string, data: { approveToSellable: boolean; inspectionNotes: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/returns/items/${itemId}/inspect`, data);
  }

  // ----------------- REPORTS & DASHBOARD -----------------
  getDashboard(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/reports/dashboard`);
  }

  getGstSummary(startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<any>(`${this.baseUrl}/reports/gst-summary`, { params });
  }

  getScheduleH1Register(startDate?: string, endDate?: string): Observable<any[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<any[]>(`${this.baseUrl}/reports/schedule-h1-register`, { params });
  }

  // ----------------- STORES & MULTI-TENANCY -----------------
  getStores(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/stores`);
  }

  createStore(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/stores`, data);
  }

  // ----------------- CASH & BANK MANAGEMENT -----------------
  getBankDashboard(startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<any>(`${this.baseUrl}/banking/dashboard`, { params });
  }

  getBankAccounts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/banking/accounts`);
  }

  createBankAccount(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/banking/accounts`, data);
  }

  updateBankAccount(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/banking/accounts/${id}`, data);
  }

  deleteBankAccount(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/banking/accounts/${id}`);
  }

  getBankTransactions(query?: {
    accountId?: string;
    transactionType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Observable<any[]> {
    let params = new HttpParams();
    if (query?.accountId) params = params.set('accountId', query.accountId);
    if (query?.transactionType) params = params.set('transactionType', query.transactionType);
    if (query?.startDate) params = params.set('startDate', query.startDate);
    if (query?.endDate) params = params.set('endDate', query.endDate);
    if (query?.limit) params = params.set('limit', query.limit.toString());
    return this.http.get<any[]>(`${this.baseUrl}/banking/transactions`, { params });
  }

  postBankTransaction(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/banking/transactions`, data);
  }

  reverseBankTransaction(id: string, reason: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/banking/transactions/${id}/reverse`, { reason });
  }

  getBankReconciliation(accountId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/banking/reconciliation/${accountId}`);
  }

  importBankStatement(data: { accountId: string; entries: any[] }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/banking/statement/import`, data);
  }

  matchBankStatement(data: { statementId: string; transactionId?: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/banking/statement/match`, data);
  }

  unmatchBankStatement(statementId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/banking/statement/${statementId}/unmatch`, {});
  }

  getCashClosingStatus(dateStr?: string): Observable<any> {
    let params = new HttpParams();
    if (dateStr) params = params.set('date', dateStr);
    return this.http.get<any>(`${this.baseUrl}/banking/cash-closing/status`, { params });
  }

  submitDailyCashClosing(data: {
    accountId: string;
    physicalCashCounted: number;
    closingDate?: string;
    notes?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/banking/cash-closing`, data);
  }

  reopenDailyCashClosing(dateStr?: string): Observable<any> {
    let params = new HttpParams();
    if (dateStr) params = params.set('date', dateStr);
    return this.http.post<any>(`${this.baseUrl}/banking/cash-closing/reopen`, {}, { params });
  }
}

