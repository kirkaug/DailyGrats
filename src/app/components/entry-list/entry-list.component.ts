import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { JournalService } from '../../services/journal.service';
import { JournalEntry } from '../../models/journal-entry.model';

export type TimeFilter = 'all' | 'week' | 'month' | 'year';

export interface FilterOption {
  value: TimeFilter;
  label: string;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

@Component({
  selector: 'app-entry-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './entry-list.component.html',
  styleUrls: ['./entry-list.component.scss']
})
export class EntryListComponent implements OnInit, OnDestroy {
  entries: JournalEntry[] = [];
  filteredEntries: JournalEntry[] = [];
  availableFilterOptions: FilterOption[] = [];
  selectedFilter: TimeFilter = 'all';
  loading = true;
  private entriesSubscription?: Subscription;

  readonly filterOptions: FilterOption[] = [
    { value: 'all', label: 'All' },
    { value: 'week', label: 'Weekly' },
    { value: 'month', label: 'Monthly' },
    { value: 'year', label: 'Yearly' }
  ];

  constructor(
    private journalService: JournalService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadEntries();
  }

  ngOnDestroy(): void {
    this.entriesSubscription?.unsubscribe();
  }

  private loadEntries(): void {
    this.entriesSubscription?.unsubscribe();
    this.entriesSubscription = this.journalService.entries$.subscribe(entries => {
      this.entries = entries;
      this.applyFilter();
      this.loading = false;
      this.cdr.markForCheck();
    });
  }

  setFilter(filter: TimeFilter, referenceDate: Date = new Date()): void {
    if (this.selectedFilter === filter) {
      return;
    }
    this.selectedFilter = filter;
    this.applyFilter(referenceDate);
  }

  applyFilter(referenceDate: Date = new Date()): void {
    this.availableFilterOptions = this.filterOptions.filter(
      option =>
        option.value === 'all' ||
        this.entries.some(entry => this.matchesFilter(entry.date, option.value, referenceDate))
    );

    if (
      this.selectedFilter !== 'all' &&
      !this.availableFilterOptions.some(option => option.value === this.selectedFilter)
    ) {
      this.selectedFilter = 'all';
    }

    this.filteredEntries = this.entries.filter(entry =>
      this.matchesFilter(entry.date, this.selectedFilter, referenceDate)
    );
    this.cdr.markForCheck();
  }

  matchesFilter(entryDateInput: Date, filter: TimeFilter, referenceDate: Date = new Date()): boolean {
    if (filter === 'all') {
      return true;
    }

    const entryDate = new Date(entryDateInput);
    const today = new Date(referenceDate);

    const diffDays = this.getCalendarDaysDiff(entryDate, today);
    if (diffDays <= 0) {
      return false;
    }

    switch (filter) {
      case 'week':
        return diffDays >= 7 && diffDays % 7 === 0;
      case 'month': {
        const monthsDiff =
          (today.getFullYear() - entryDate.getFullYear()) * 12 +
          (today.getMonth() - entryDate.getMonth());
        return monthsDiff >= 1 && entryDate.getDate() === today.getDate();
      }
      case 'year': {
        const yearsDiff = today.getFullYear() - entryDate.getFullYear();
        return (
          yearsDiff >= 1 &&
          entryDate.getMonth() === today.getMonth() &&
          entryDate.getDate() === today.getDate()
        );
      }
    }
  }

  getIncrementLabel(entryDateInput: Date, referenceDate: Date = new Date()): string {
    if (this.selectedFilter === 'all') {
      return '';
    }

    const entryDate = new Date(entryDateInput);
    const today = new Date(referenceDate);

    switch (this.selectedFilter) {
      case 'week': {
        const weeks = Math.round(this.getCalendarDaysDiff(entryDate, today) / 7);
        return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
      }
      case 'month': {
        const months =
          (today.getFullYear() - entryDate.getFullYear()) * 12 +
          (today.getMonth() - entryDate.getMonth());
        return months === 1 ? '1 month ago' : `${months} months ago`;
      }
      case 'year': {
        const years = today.getFullYear() - entryDate.getFullYear();
        return years === 1 ? '1 year ago' : `${years} years ago`;
      }
    }
  }

  getEmptyFilterMessage(): string {
    switch (this.selectedFilter) {
      case 'week':
        return 'No entries found from 1 or more weeks ago on this day of the week.';
      case 'month':
        return 'No entries found from previous months on this day of the month.';
      case 'year':
        return 'No entries found from previous years on this date.';
      default:
        return '';
    }
  }

  private getCalendarDaysDiff(earlier: Date, later: Date): number {
    const utcEarlier = Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
    const utcLater = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate());
    return Math.round((utcLater - utcEarlier) / MS_PER_DAY);
  }

  createEntry(): void {
    this.router.navigate(['/entry', 'new']);
  }

  viewEntry(entry: JournalEntry): void {
    this.router.navigate(['/entry', entry.id]);
  }

  formatDate(date: Date): string {
    const today = new Date();
    const entryDate = new Date(date);

    if (this.isSameDay(entryDate, today)) {
      return 'Today';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (this.isSameDay(entryDate, yesterday)) {
      return 'Yesterday';
    }

    return entryDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: entryDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  getPreview(content: string): string {
    return content.length > 150 ? content.substring(0, 150) + '...' : content;
  }
}
