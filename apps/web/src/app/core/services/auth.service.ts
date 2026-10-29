import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { UserSession, StoreInfo } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly baseUrl = environment.apiBaseUrl;

  private currentUserSignal = signal<UserSession | null>(this.getStoredUser());

  currentUser = computed(() => this.currentUserSignal());
  activeStore = computed(() => this.currentUserSignal()?.activeStore || null);
  isAuthenticated = computed(() => !!this.currentUserSignal());

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  private getStoredUser(): UserSession | null {
    const raw = localStorage.getItem('pharma_user_session');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  login(credentials: { email: string; password: string }) {
    return this.http
      .post<{ accessToken: string; user: UserSession }>(`${this.baseUrl}/auth/login`, credentials)
      .pipe(
        tap((res) => {
          localStorage.setItem('pharma_access_token', res.accessToken);
          localStorage.setItem('pharma_user_session', JSON.stringify(res.user));
          this.currentUserSignal.set(res.user);
        }),
      );
  }

  selectStore(storeId: string) {
    return this.http
      .post<{ accessToken: string; activeStore: StoreInfo }>(`${this.baseUrl}/auth/select-store`, {
        storeId,
      })
      .pipe(
        tap((res) => {
          localStorage.setItem('pharma_access_token', res.accessToken);
          const current = this.currentUserSignal();
          if (current) {
            const updated: UserSession = {
              ...current,
              activeStore: res.activeStore,
            };
            localStorage.setItem('pharma_user_session', JSON.stringify(updated));
            this.currentUserSignal.set(updated);
          }
        }),
      );
  }

  logout() {
    localStorage.removeItem('pharma_access_token');
    localStorage.removeItem('pharma_user_session');
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
  }
}
