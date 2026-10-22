import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ImportResult, JournalEntry, JournalExportData } from '../models/journal-entry.model';
import { PHOTO_REF_PREFIX, StorageService } from './storage.service';
import { PhotoService } from './photo.service';

const ENTRY_KEY_PREFIX = 'entry_';
const MAX_UNCOMPRESSED_PHOTO_LENGTH = 300_000;

@Injectable({
  providedIn: 'root'
})
export class JournalService {
  private entriesSubject = new BehaviorSubject<JournalEntry[]>([]);
  public entries$: Observable<JournalEntry[]> = this.entriesSubject.asObservable();
  private initializedPromise: Promise<void>;

  constructor(
    private storageService: StorageService,
    private photoService?: PhotoService
  ) {
    this.initializedPromise = this.loadEntries();
  }

  private async loadEntries(): Promise<void> {
    const keys = await this.storageService.keys();
    if (!keys) {
      return;
    }
    const entryKeys = keys.filter(k => k.startsWith(ENTRY_KEY_PREFIX));
    const loadedEntries = await Promise.all(
      entryKeys.map(async key => {
        const entry = await this.storageService.get<JournalEntry>(key);
        if (!entry) {
          return null;
        }

        let photoUrl = entry.photoUrl;
        if (photoUrl?.startsWith(PHOTO_REF_PREFIX)) {
          const refId = photoUrl.slice(PHOTO_REF_PREFIX.length) || entry.id;
          photoUrl = await this.storageService.getPhoto?.(refId);
        } else if (photoUrl) {
          if (photoUrl.length > MAX_UNCOMPRESSED_PHOTO_LENGTH && this.photoService) {
            photoUrl = await this.photoService.compressImage(photoUrl);
          }
          // Migrate legacy inline photo out of Preferences into dedicated photo storage
          if (typeof this.storageService.setPhoto === 'function') {
            const photoRef = await this.storageService.setPhoto(entry.id, photoUrl);
            await this.storageService.set(key, { ...entry, photoUrl: photoRef });
          } else if (photoUrl !== entry.photoUrl) {
            await this.storageService.set(key, { ...entry, photoUrl });
          }
        }

        // Convert date strings back to Date objects
        return {
          ...entry,
          photoUrl,
          date: new Date(entry.date),
          createdAt: new Date(entry.createdAt),
          updatedAt: new Date(entry.updatedAt)
        } as JournalEntry;
      })
    );

    const entries = loadedEntries.filter((e): e is JournalEntry => e !== null);
    this.entriesSubject.next(entries.sort((a, b) => b.date.getTime() - a.date.getTime()));
  }

  async getEntries(): Promise<JournalEntry[]> {
    await this.initializedPromise;
    return this.entriesSubject.value;
  }

  async getEntryById(id: string): Promise<JournalEntry | undefined> {
    await this.initializedPromise;
    const entries = this.entriesSubject.value;
    return entries.find(entry => entry.id === id);
  }

  async getEntryByDate(date: Date): Promise<JournalEntry | undefined> {
    await this.initializedPromise;
    const entries = this.entriesSubject.value;
    const dateStr = this.formatDate(date);
    return entries.find(entry => this.formatDate(entry.date) === dateStr);
  }

  async createEntry(content: string, photoUrl?: string, aiReflection?: string): Promise<JournalEntry> {
    await this.initializedPromise;
    const normalizedPhoto = await this.normalizePhoto(photoUrl);
    const now = new Date();
    const entry: JournalEntry = {
      id: this.generateId(),
      date: now,
      content,
      photoUrl: normalizedPhoto,
      aiReflection,
      createdAt: now,
      updatedAt: now
    };

    await this.persistEntry(entry);
    const currentEntries = this.entriesSubject.value;
    const updatedEntries = [...currentEntries, entry].sort((a, b) =>
      b.date.getTime() - a.date.getTime()
    );
    this.entriesSubject.next(updatedEntries);
    return entry;
  }

  async updateEntry(id: string, updates: Partial<JournalEntry>): Promise<JournalEntry | null> {
    await this.initializedPromise;
    const entries = this.entriesSubject.value;
    const index = entries.findIndex(entry => entry.id === id);

    if (index === -1) {
      return null;
    }

    const normalizedPhoto =
      'photoUrl' in updates
        ? await this.normalizePhoto(updates.photoUrl)
        : entries[index].photoUrl;

    if ('photoUrl' in updates && !normalizedPhoto) {
      await this.storageService.removePhoto?.(id);
    }

    const updatedEntry: JournalEntry = {
      ...entries[index],
      ...updates,
      photoUrl: normalizedPhoto,
      updatedAt: new Date()
    };

    await this.persistEntry(updatedEntry);
    const updatedEntries = [...entries];
    updatedEntries[index] = updatedEntry;
    this.entriesSubject.next(updatedEntries);
    return updatedEntry;
  }

  async deleteEntry(id: string): Promise<boolean> {
    await this.initializedPromise;
    const entries = this.entriesSubject.value;
    const filteredEntries = entries.filter(entry => entry.id !== id);

    if (filteredEntries.length === entries.length) {
      return false;
    }

    await this.storageService.remove(`${ENTRY_KEY_PREFIX}${id}`);
    await this.storageService.removePhoto?.(id);
    this.entriesSubject.next(filteredEntries);
    return true;
  }

  async addAiReflection(id: string, reflection: string): Promise<JournalEntry | null> {
    return this.updateEntry(id, { aiReflection: reflection });
  }

  async exportEntries(): Promise<string> {
    await this.initializedPromise;
    const exportData: JournalExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      entries: this.entriesSubject.value
    };
    return JSON.stringify(exportData, null, 2);
  }

  async importEntries(jsonData: string): Promise<ImportResult> {
    await this.initializedPromise;

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonData);
    } catch {
      throw new Error('Invalid JSON file.');
    }

    let rawEntries: unknown[];
    if (Array.isArray(parsed)) {
      rawEntries = parsed;
    } else if (
      parsed &&
      typeof parsed === 'object' &&
      'entries' in parsed &&
      Array.isArray((parsed as { entries: unknown }).entries)
    ) {
      rawEntries = (parsed as { entries: unknown[] }).entries;
    } else {
      throw new Error('Invalid export format: expected an "entries" array.');
    }

    const currentEntries = [...this.entriesSubject.value];
    const entriesById = new Map<string, JournalEntry>(
      currentEntries.map(entry => [entry.id, entry])
    );

    let added = 0;
    let updated = 0;

    for (const item of rawEntries) {
      if (!item || typeof item !== 'object') {
        throw new Error('Invalid entry in import file.');
      }

      const raw = item as Record<string, unknown>;
      if (typeof raw['content'] !== 'string') {
        throw new Error('Each imported entry must have a valid text "content" field.');
      }

      const id =
        typeof raw['id'] === 'string' && raw['id'].trim().length > 0
          ? raw['id'].trim()
          : this.generateId();

      const now = new Date();
      const date = raw['date'] ? new Date(String(raw['date'])) : now;
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date for entry "${id}".`);
      }

      const createdAt = raw['createdAt'] ? new Date(String(raw['createdAt'])) : date;
      const updatedAt = raw['updatedAt'] ? new Date(String(raw['updatedAt'])) : now;

      const photoUrl =
        typeof raw['photoUrl'] === 'string' && raw['photoUrl'].length > 0
          ? await this.normalizePhoto(raw['photoUrl'])
          : undefined;

      const aiReflection =
        typeof raw['aiReflection'] === 'string' && raw['aiReflection'].length > 0
          ? raw['aiReflection']
          : undefined;

      const entry: JournalEntry = {
        id,
        date,
        content: raw['content'],
        photoUrl,
        aiReflection,
        createdAt: isNaN(createdAt.getTime()) ? date : createdAt,
        updatedAt: isNaN(updatedAt.getTime()) ? now : updatedAt
      };

      const existed = entriesById.has(id);
      if (!photoUrl) {
        await this.storageService.removePhoto?.(id);
      }
      await this.persistEntry(entry);
      entriesById.set(id, entry);

      if (existed) {
        updated++;
      } else {
        added++;
      }
    }

    const mergedEntries = Array.from(entriesById.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
    this.entriesSubject.next(mergedEntries);

    return { added, updated };
  }

  async clearEntries(): Promise<number> {
    await this.initializedPromise;
    const currentEntries = this.entriesSubject.value;
    const keys = await this.storageService.keys();
    const entryKeys = new Set<string>(
      currentEntries.map(entry => `${ENTRY_KEY_PREFIX}${entry.id}`)
    );
    if (keys) {
      for (const key of keys) {
        if (key.startsWith(ENTRY_KEY_PREFIX)) {
          entryKeys.add(key);
        }
      }
    }

    for (const key of entryKeys) {
      await this.storageService.remove(key);
    }
    await this.storageService.clearPhotos?.();

    const removedCount = currentEntries.length;
    this.entriesSubject.next([]);
    return removedCount;
  }

  private async persistEntry(entry: JournalEntry): Promise<void> {
    const key = `${ENTRY_KEY_PREFIX}${entry.id}`;
    if (entry.photoUrl && typeof this.storageService.setPhoto === 'function') {
      const photoRef = await this.storageService.setPhoto(entry.id, entry.photoUrl);
      await this.storageService.set(key, { ...entry, photoUrl: photoRef });
    } else {
      await this.storageService.set(key, entry);
    }
  }

  private async normalizePhoto(photoUrl?: string): Promise<string | undefined> {
    if (!photoUrl) {
      return photoUrl;
    }
    if (photoUrl.length > MAX_UNCOMPRESSED_PHOTO_LENGTH && this.photoService) {
      return this.photoService.compressImage(photoUrl);
    }
    return photoUrl;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
