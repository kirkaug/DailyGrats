import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { JournalEntry } from '../models/journal-entry.model';
import { StorageService } from './storage.service';

const ENTRIES_KEY = 'journal_entries';

@Injectable({
  providedIn: 'root'
})
export class JournalService {
  private entriesSubject = new BehaviorSubject<JournalEntry[]>([]);
  public entries$: Observable<JournalEntry[]> = this.entriesSubject.asObservable();

  constructor(private storageService: StorageService) {
    this.loadEntries();
  }

  private async loadEntries(): Promise<void> {
    const entries = await this.storageService.get<JournalEntry[]>(ENTRIES_KEY);
    if (entries) {
      // Convert date strings back to Date objects
      const parsedEntries = entries.map(entry => ({
        ...entry,
        date: new Date(entry.date),
        createdAt: new Date(entry.createdAt),
        updatedAt: new Date(entry.updatedAt)
      }));
      this.entriesSubject.next(parsedEntries);
    }
  }

  private async saveEntries(entries: JournalEntry[]): Promise<void> {
    await this.storageService.set(ENTRIES_KEY, entries);
    this.entriesSubject.next(entries);
  }

  async getEntries(): Promise<JournalEntry[]> {
    return this.entriesSubject.value;
  }

  async getEntryById(id: string): Promise<JournalEntry | undefined> {
    const entries = this.entriesSubject.value;
    return entries.find(entry => entry.id === id);
  }

  async getEntryByDate(date: Date): Promise<JournalEntry | undefined> {
    const entries = this.entriesSubject.value;
    const dateStr = this.formatDate(date);
    return entries.find(entry => this.formatDate(entry.date) === dateStr);
  }

  async createEntry(content: string, photoUrl?: string): Promise<JournalEntry> {
    const entries = this.entriesSubject.value;
    const now = new Date();
    const entry: JournalEntry = {
      id: this.generateId(),
      date: now,
      content,
      photoUrl,
      createdAt: now,
      updatedAt: now
    };

    const updatedEntries = [...entries, entry].sort((a, b) =>
      b.date.getTime() - a.date.getTime()
    );

    await this.saveEntries(updatedEntries);
    return entry;
  }

  async updateEntry(id: string, updates: Partial<JournalEntry>): Promise<JournalEntry | null> {
    const entries = this.entriesSubject.value;
    const index = entries.findIndex(entry => entry.id === id);

    if (index === -1) {
      return null;
    }

    const updatedEntry = {
      ...entries[index],
      ...updates,
      updatedAt: new Date()
    };

    const updatedEntries = [...entries];
    updatedEntries[index] = updatedEntry;

    await this.saveEntries(updatedEntries);
    return updatedEntry;
  }

  async deleteEntry(id: string): Promise<boolean> {
    const entries = this.entriesSubject.value;
    const filteredEntries = entries.filter(entry => entry.id !== id);

    if (filteredEntries.length === entries.length) {
      return false;
    }

    await this.saveEntries(filteredEntries);
    return true;
  }

  async addAiReflection(id: string, reflection: string): Promise<JournalEntry | null> {
    return this.updateEntry(id, { aiReflection: reflection });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
