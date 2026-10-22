import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { EntryListComponent } from './entry-list.component';
import { JournalService } from '../../services/journal.service';
import { JournalEntry } from '../../models/journal-entry.model';

function makeEntry(id: string, date: Date, content = `Entry ${id}`): JournalEntry {
  return {
    id,
    date,
    content,
    createdAt: date,
    updatedAt: date
  };
}

describe('EntryListComponent time increment filtering', () => {
  const referenceDate = new Date(2026, 9, 22, 12, 0, 0); // Oct 22, 2026

  const sampleEntries: JournalEntry[] = [
    makeEntry('today', new Date(2026, 9, 22, 9, 0, 0), 'Today entry'),
    makeEntry('3days', new Date(2026, 9, 19, 9, 0, 0), '3 days ago'),
    makeEntry('1week', new Date(2026, 9, 15, 9, 0, 0), '1 week ago'),
    makeEntry('2weeks', new Date(2026, 9, 8, 9, 0, 0), '2 weeks ago'),
    makeEntry('3weeks', new Date(2026, 9, 1, 9, 0, 0), '3 weeks ago'),
    makeEntry('1month', new Date(2026, 8, 22, 9, 0, 0), '1 month ago'), // Sep 22, 2026
    makeEntry('2months', new Date(2026, 7, 22, 9, 0, 0), '2 months ago'), // Aug 22, 2026
    makeEntry('14months', new Date(2025, 7, 22, 9, 0, 0), '14 months ago'), // Aug 22, 2025
    makeEntry('1year', new Date(2025, 9, 22, 9, 0, 0), '1 year ago'), // Oct 22, 2025
    makeEntry('2years', new Date(2024, 9, 22, 9, 0, 0), '2 years ago') // Oct 22, 2024
  ];

  let entriesSubject: BehaviorSubject<JournalEntry[]>;

  beforeEach(async () => {
    entriesSubject = new BehaviorSubject<JournalEntry[]>(sampleEntries);

    await TestBed.configureTestingModule({
      imports: [EntryListComponent],
      providers: [
        provideRouter([]),
        {
          provide: JournalService,
          useValue: {
            entries$: entriesSubject.asObservable()
          }
        }
      ]
    }).compileComponents();
  });

  it('shows all entries by default', () => {
    const fixture = TestBed.createComponent(EntryListComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.selectedFilter).toBe('all');
    expect(component.filteredEntries.length).toBe(sampleEntries.length);
  });

  it('filters entries by weekly increments (1 week ago, 2 weeks ago, etc.) excluding today', () => {
    const fixture = TestBed.createComponent(EntryListComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.selectedFilter = 'week';
    component.applyFilter(referenceDate);

    expect(component.filteredEntries.map(e => e.id)).toEqual(['1week', '2weeks', '3weeks']);
    expect(component.getIncrementLabel(sampleEntries[2].date, referenceDate)).toBe('1 week ago');
    expect(component.getIncrementLabel(sampleEntries[3].date, referenceDate)).toBe('2 weeks ago');
  });

  it('filters entries by monthly increments on the same day of the month excluding today', () => {
    const fixture = TestBed.createComponent(EntryListComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.selectedFilter = 'month';
    component.applyFilter(referenceDate);

    // Matches Sep 22 2026, Aug 22 2026, Aug 22 2025, Oct 22 2025 (12 months), Oct 22 2024 (24 months)
    expect(component.filteredEntries.map(e => e.id)).toEqual([
      '1month',
      '2months',
      '14months',
      '1year',
      '2years'
    ]);
    expect(component.getIncrementLabel(sampleEntries[5].date, referenceDate)).toBe('1 month ago');
    expect(component.getIncrementLabel(sampleEntries[6].date, referenceDate)).toBe('2 months ago');
    expect(component.getIncrementLabel(sampleEntries[7].date, referenceDate)).toBe('14 months ago');
  });

  it('filters entries by yearly increments on the same month and day excluding today', () => {
    const fixture = TestBed.createComponent(EntryListComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.selectedFilter = 'year';
    component.applyFilter(referenceDate);

    expect(component.filteredEntries.map(e => e.id)).toEqual(['1year', '2years']);
    expect(component.getIncrementLabel(sampleEntries[8].date, referenceDate)).toBe('1 year ago');
    expect(component.getIncrementLabel(sampleEntries[9].date, referenceDate)).toBe('2 years ago');
  });

  it('hides time increment filter options that have no matching entries', () => {
    entriesSubject.next([
      makeEntry('today', new Date(2026, 9, 22, 9, 0, 0)),
      makeEntry('1week', new Date(2026, 9, 15, 9, 0, 0))
    ]);

    const fixture = TestBed.createComponent(EntryListComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.applyFilter(referenceDate);
    fixture.detectChanges();

    expect(component.availableFilterOptions.map(o => o.value)).toEqual(['all', 'week']);
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.filter-btn') as NodeListOf<HTMLButtonElement>
    ).map(btn => btn.textContent?.trim());
    expect(buttons).toEqual(['All', 'Weekly']);
  });

  it('resets selectedFilter to all if the selected increment has no matching entries', () => {
    entriesSubject.next([makeEntry('today', new Date(2026, 9, 22, 9, 0, 0))]);
    const fixture = TestBed.createComponent(EntryListComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.setFilter('year', referenceDate);
    fixture.detectChanges();

    expect(component.availableFilterOptions.map(o => o.value)).toEqual(['all']);
    expect(component.selectedFilter).toBe('all');
    expect(component.filteredEntries.length).toBe(1);
  });

  it('unsubscribes from JournalService.entries$ on destroy', () => {
    const fixture = TestBed.createComponent(EntryListComponent);
    fixture.detectChanges();
    expect(entriesSubject.observed).toBe(true);

    fixture.destroy();
    expect(entriesSubject.observed).toBe(false);
  });

  it('renders keyboard-focusable entry cards that activate on Enter', () => {
    const fixture = TestBed.createComponent(EntryListComponent);
    const router = TestBed.inject(Router);
    let navigatedTo: unknown[] | undefined;
    router.navigate = async (commands: unknown[]) => {
      navigatedTo = commands;
      return true;
    };
    fixture.detectChanges();

    const firstCard = fixture.nativeElement.querySelector('.entry-card') as HTMLElement;
    expect(firstCard.getAttribute('role')).toBe('button');
    expect(firstCard.getAttribute('tabindex')).toBe('0');
    expect(firstCard.getAttribute('aria-label')).toContain('View entry');

    firstCard.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(navigatedTo).toEqual(['/entry', 'today']);
  });
});
