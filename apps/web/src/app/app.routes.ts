import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'pos',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/pos/pos.component').then((m) => m.PosComponent),
  },
  {
    path: 'medicines',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/medicines/medicines.component').then((m) => m.MedicinesComponent),
  },
  {
    path: 'inventory',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/inventory/inventory.component').then((m) => m.InventoryComponent),
  },
  {
    path: 'purchases',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/purchases/purchases.component').then((m) => m.PurchasesComponent),
  },
  {
    path: 'returns',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/returns/returns.component').then((m) => m.ReturnsComponent),
  },
  {
    path: 'reports',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/reports/reports.component').then((m) => m.ReportsComponent),
  },
  {
    path: 'stores',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/stores/stores.component').then((m) => m.StoresComponent),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
