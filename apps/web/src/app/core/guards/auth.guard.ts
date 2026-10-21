import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('pharma_access_token');

  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};
