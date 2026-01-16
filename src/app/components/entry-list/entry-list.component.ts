import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { JournalService } from '../../services/journal.service';
import { JournalEntry } from '../../models/journal-entry.model';

@Component({
  selector: 'app-entry-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './entry-list.component.html',
  styleUrls: ['./entry-list.component.scss']
})
export class EntryListComponent implements OnInit {
  entries: JournalEntry[] = [];
  loading = true;

  constructor(
    private journalService: JournalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadEntries();
  }

  private loadEntries(): void {
    this.journalService.entries$.subscribe(entries => {
      this.entries = entries;
      this.loading = false;
    });
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
