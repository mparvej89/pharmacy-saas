import { Component, Input, Output, EventEmitter, signal, computed, forwardRef, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  IonItem,
  IonInput,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, closeCircleOutline } from 'ionicons/icons';

export interface SearchableOption {
  id: string;
  label: string;
  subLabel?: string;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonItem,
    IonInput,
    IonIcon,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true,
    },
  ],
  template: `
    <div class="searchable-wrapper">
      <ion-item fill="outline" class="form-item trigger-item" (click)="toggleDropdown()">
        <ion-input
          [label]="label"
          labelPlacement="floating"
          [value]="selectedLabel()"
          readonly="true"
          [placeholder]="placeholder || 'Search & select...'"
        ></ion-input>
        <ion-icon name="search-outline" slot="end" color="primary"></ion-icon>
      </ion-item>

      <!-- Dropdown Filter Panel -->
      <div class="dropdown-popup" *ngIf="isOpen()">
        <div class="dropdown-search-header">
          <div class="search-input-box">
            <ion-icon name="search-outline" class="search-icon"></ion-icon>
            <input
              type="text"
              class="native-search-input"
              [placeholder]="'Search ' + (label || 'options') + '...'"
              [value]="searchQuery()"
              (input)="onSearchInput($event)"
              #searchInput
            />
            <ion-icon
              name="close-circle-outline"
              class="clear-icon"
              *ngIf="searchQuery()"
              (click)="clearSearch()"
            ></ion-icon>
          </div>
        </div>

        <div class="dropdown-options-list">
          <div
            *ngFor="let opt of filteredOptions()"
            class="option-row"
            [class.active]="opt.id === selectedId()"
            (click)="selectOption(opt)"
          >
            <div class="option-label">{{ opt.label }}</div>
            <div class="option-sub" *ngIf="opt.subLabel">{{ opt.subLabel }}</div>
          </div>

          <div class="empty-state" *ngIf="filteredOptions().length === 0">
            No matching results found
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .searchable-wrapper {
        position: relative;
        width: 100%;
      }
      .trigger-item {
        --background: #ffffff;
        cursor: pointer;
      }
      .dropdown-popup {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        z-index: 10000;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        max-height: 280px;
        overflow-y: auto;
        margin-top: 4px;
      }
      .dropdown-search-header {
        padding: 8px 10px;
        border-bottom: 1px solid #f1f5f9;
        background: #f8fafc;
      }
      .search-input-box {
        display: flex;
        align-items: center;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 6px 10px;
        gap: 8px;
      }
      .search-icon {
        font-size: 16px;
        color: #64748b;
      }
      .clear-icon {
        font-size: 16px;
        color: #94a3b8;
        cursor: pointer;
      }
      .clear-icon:hover {
        color: #dc2626;
      }
      .native-search-input {
        border: none;
        outline: none;
        width: 100%;
        font-size: 0.88rem;
        color: #1e293b;
        background: transparent;
      }
      .native-search-input::placeholder {
        color: #94a3b8;
      }
      .dropdown-options-list {
        padding: 4px 0;
      }
      .option-row {
        padding: 10px 14px;
        cursor: pointer;
        border-bottom: 1px solid #f8fafc;
        transition: background 0.15s ease;
      }
      .option-row:hover,
      .option-row.active {
        background: #f0fdf4;
      }
      .option-label {
        font-weight: 600;
        color: #0f172a;
        font-size: 0.88rem;
      }
      .option-sub {
        font-size: 0.76rem;
        color: #64748b;
        margin-top: 2px;
      }
      .empty-state {
        padding: 16px;
        text-align: center;
        color: #94a3b8;
        font-size: 0.82rem;
      }
    `,
  ],
})
export class SearchableSelectComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() set options(val: SearchableOption[]) {
    this._allOptions.set(val || []);
  }

  @Output() optionSelected = new EventEmitter<SearchableOption>();

  private _allOptions = signal<SearchableOption[]>([]);
  isOpen = signal(false);
  selectedId = signal<string>('');
  searchQuery = signal<string>('');

  filteredOptions = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this._allOptions();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.subLabel && item.subLabel.toLowerCase().includes(q)),
    );
  });

  selectedLabel = computed(() => {
    const id = this.selectedId();
    const match = this._allOptions().find((opt) => opt.id === id);
    return match ? match.label : '';
  });

  onChange = (_val: any) => {};
  onTouched = () => {};

  constructor(private elementRef: ElementRef) {
    addIcons({ searchOutline, closeCircleOutline });
  }

  // Dismiss dropdown when clicking outside component
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  writeValue(val: any): void {
    if (val !== undefined && val !== null) {
      this.selectedId.set(val);
    } else {
      this.selectedId.set('');
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  toggleDropdown() {
    this.isOpen.update((v) => !v);
    if (this.isOpen()) {
      this.searchQuery.set('');
      setTimeout(() => {
        const inputEl = this.elementRef.nativeElement.querySelector('.native-search-input');
        if (inputEl) inputEl.focus();
      }, 50);
    }
  }

  onSearchInput(event: any) {
    this.searchQuery.set(event.target.value || '');
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  selectOption(opt: SearchableOption) {
    this.selectedId.set(opt.id);
    this.onChange(opt.id);
    this.optionSelected.emit(opt);
    this.isOpen.set(false);
  }
}
