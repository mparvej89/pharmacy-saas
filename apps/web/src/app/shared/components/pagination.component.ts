import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, IonIcon],
  template: `
    <div class="pagination-footer" *ngIf="totalItems > 0">
      <div class="pagination-info">
        Showing <strong>{{ startItem }} - {{ endItem }}</strong> of <strong>{{ totalItems }}</strong> {{ itemLabel }}
      </div>
      <div class="pagination-actions">
        <div class="page-size-selector" *ngIf="showPageSize">
          <span class="size-lbl">Show:</span>
          <select [value]="pageSize" (change)="onSizeChange($event)">
            <option *ngFor="let s of pageSizeOptions" [value]="s">{{ s }}</option>
          </select>
          <span class="size-lbl">per page</span>
        </div>
        <div class="pagination-controls">
          <button
            type="button"
            class="page-nav-btn"
            [disabled]="currentPage <= 1"
            (click)="onPrev()"
            title="Previous Page"
          >
            <ion-icon name="chevron-back-outline"></ion-icon>
            <span>Prev</span>
          </button>
          <span class="page-current">Page {{ currentPage }} of {{ totalPages }}</span>
          <button
            type="button"
            class="page-nav-btn"
            [disabled]="currentPage >= totalPages"
            (click)="onNext()"
            title="Next Page"
          >
            <span>Next</span>
            <ion-icon name="chevron-forward-outline"></ion-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .pagination-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        flex-wrap: wrap;
        gap: 12px;
      }
      .pagination-info {
        font-size: 0.84rem;
        color: #64748b;
      }
      .pagination-actions {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
      }
      .page-size-selector {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.84rem;
        color: #475569;
      }
      .page-size-selector select {
        padding: 4px 8px;
        border-radius: 6px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        font-size: 0.84rem;
        outline: none;
        cursor: pointer;
      }
      .pagination-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .page-nav-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        padding: 5px 10px;
        border-radius: 6px;
        font-size: 0.82rem;
        font-weight: 600;
        color: #334155;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .page-nav-btn:hover:not(:disabled) {
        background: #f1f5f9;
        border-color: #94a3b8;
        color: #0284c7;
      }
      .page-nav-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .page-current {
        font-size: 0.82rem;
        font-weight: 600;
        color: #475569;
        padding: 0 4px;
      }
    `,
  ],
})
export class PaginationComponent {
  @Input() totalItems: number = 0;
  @Input() currentPage: number = 1;
  @Input() pageSize: number = 10;
  @Input() pageSizeOptions: number[] = [10, 25, 50, 100];
  @Input() itemLabel: string = 'records';
  @Input() showPageSize: boolean = true;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  constructor() {
    addIcons({
      chevronBackOutline,
      chevronForwardOutline,
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get startItem(): number {
    if (this.totalItems === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  onPrev() {
    if (this.currentPage > 1) {
      this.pageChange.emit(this.currentPage - 1);
    }
  }

  onNext() {
    if (this.currentPage < this.totalPages) {
      this.pageChange.emit(this.currentPage + 1);
    }
  }

  onSizeChange(event: any) {
    const size = Number(event.target.value) || 10;
    this.pageSizeChange.emit(size);
  }
}
