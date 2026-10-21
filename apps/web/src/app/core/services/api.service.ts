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

  checkDuplicateMedicine(data: { name: string; barcode?: string; excludeId?: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/medicines/check-duplicate`, data);
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

  // ----------------- SUPPLIERS -----------------
  getSuppliers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/suppliers`);
  }

  createSupplier(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/suppliers`, data);
  }

  // ----------------- RETURNS & QUARANTINE -----------------
  getReturns(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/returns`);
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
}
