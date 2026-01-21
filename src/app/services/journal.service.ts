import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { JournalEntry } from '../models/journal-entry.model';
import { StorageService } from './storage.service';

const ENTRY_KEY_PREFIX = 'entry_';

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
    const keys = await this.storageService.keys();
    if (!keys) {
      return;
    }
    const entryKeys = keys.filter(k => k.startsWith(ENTRY_KEY_PREFIX));
    const entries: JournalEntry[] = [];
    for (const key of entryKeys) {
      const entry = await this.storageService.get<JournalEntry>(key);
      if (entry) {
        // Convert date strings back to Date objects
        const parsedEntry = {
          ...entry,
          date: new Date(entry.date),
          createdAt: new Date(entry.createdAt),
          updatedAt: new Date(entry.updatedAt)
        };
        entries.push(parsedEntry);
      }
    }
    this.entriesSubject.next(entries.sort((a, b) => b.date.getTime() - a.date.getTime()));
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
    const now = new Date();
    const entry: JournalEntry = {
      id: this.generateId(),
      date: now,
      content,
      photoUrl,
      createdAt: now,
      updatedAt: now
    };

    await this.storageService.set(`${ENTRY_KEY_PREFIX}${entry.id}`, entry);
    const currentEntries = this.entriesSubject.value;
    const updatedEntries = [...currentEntries, entry].sort((a, b) =>
      b.date.getTime() - a.date.getTime()
    );
    this.entriesSubject.next(updatedEntries);
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

    await this.storageService.set(`${ENTRY_KEY_PREFIX}${id}`, updatedEntry);
    const updatedEntries = [...entries];
    updatedEntries[index] = updatedEntry;
    this.entriesSubject.next(updatedEntries);
    return updatedEntry;
  }

  async deleteEntry(id: string): Promise<boolean> {
    const entries = this.entriesSubject.value;
    const filteredEntries = entries.filter(entry => entry.id !== id);

    if (filteredEntries.length === entries.length) {
      return false;
    }

    await this.storageService.remove(`${ENTRY_KEY_PREFIX}${id}`);
    this.entriesSubject.next(filteredEntries);
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
