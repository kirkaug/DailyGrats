import { JournalService } from './journal.service';
import { PHOTO_REF_PREFIX, StorageService } from './storage.service';
import { PhotoService } from './photo.service';
import { JournalEntry } from '../models/journal-entry.model';

describe('JournalService', () => {
  it('getEntryById awaits initial async storage load', async () => {
    const storedEntry: JournalEntry = {
      id: 'abc123',
      date: new Date('2026-10-22T10:00:00Z'),
      content: 'Grateful for morning coffee',
      createdAt: new Date('2026-10-22T10:00:00Z'),
      updatedAt: new Date('2026-10-22T10:00:00Z')
    };

    const mockStorage: Partial<StorageService> = {
      keys: () => new Promise(resolve => setTimeout(() => resolve(['entry_abc123']), 25)),
      get: async <T>(key: string) => (key === 'entry_abc123' ? (storedEntry as unknown as T) : null),
      set: async () => {},
      remove: async () => {}
    };

    const service = new JournalService(mockStorage as StorageService);
    const found = await service.getEntryById('abc123');
    expect(found).toBeDefined();
    expect(found?.content).toBe('Grateful for morning coffee');
  });

  it('exports entries to JSON and merges imported entries (updating matching IDs, adding new ones)', async () => {
    const store = new Map<string, unknown>();
    const initialEntry: JournalEntry = {
      id: 'entry1',
      date: new Date('2026-10-20T10:00:00Z'),
      content: 'Original content',
      aiReflection: 'Original reflection',
      createdAt: new Date('2026-10-20T10:00:00Z'),
      updatedAt: new Date('2026-10-20T10:00:00Z')
    };
    store.set('entry_entry1', initialEntry);

    const mockStorage: Partial<StorageService> = {
      keys: async () => Array.from(store.keys()),
      get: async <T>(key: string) => (store.get(key) as T) ?? null,
      set: async (key: string, value: unknown) => {
        store.set(key, value);
      },
      remove: async (key: string) => {
        store.delete(key);
      }
    };

    const service = new JournalService(mockStorage as StorageService);
    const exportedJson = await service.exportEntries();
    const parsedExport = JSON.parse(exportedJson);
    expect(parsedExport.version).toBe(1);
    expect(parsedExport.entries.length).toBe(1);
    expect(parsedExport.entries[0].id).toBe('entry1');

    const importPayload = JSON.stringify({
      version: 1,
      exportedAt: '2026-10-22T12:00:00Z',
      entries: [
        {
          id: 'entry1',
          date: '2026-10-20T10:00:00Z',
          content: 'Updated content from import',
          aiReflection: 'Updated reflection',
          createdAt: '2026-10-20T10:00:00Z',
          updatedAt: '2026-10-22T12:00:00Z'
        },
        {
          id: 'entry2',
          date: '2026-10-21T10:00:00Z',
          content: 'Brand new imported entry',
          photoUrl: 'data:image/jpeg;base64,abc',
          createdAt: '2026-10-21T10:00:00Z',
          updatedAt: '2026-10-21T10:00:00Z'
        }
      ]
    });

    const result = await service.importEntries(importPayload);
    expect(result).toEqual({ added: 1, updated: 1 });

    const allEntries = await service.getEntries();
    expect(allEntries.length).toBe(2);
    expect(allEntries[0].id).toBe('entry2');
    expect(allEntries[0].photoUrl).toBe('data:image/jpeg;base64,abc');
    expect(allEntries[1].id).toBe('entry1');
    expect(allEntries[1].content).toBe('Updated content from import');

    const clearedCount = await service.clearEntries();
    expect(clearedCount).toBe(2);
    expect((await service.getEntries()).length).toBe(0);
    expect(store.size).toBe(0);
  });

  it('offloads Base64 photo payloads from Preferences to photo store and migrates legacy inline photos', async () => {
    const kvStore = new Map<string, unknown>();
    const photoBlobs = new Map<string, string>();

    kvStore.set('entry_legacy1', {
      id: 'legacy1',
      date: '2026-10-21T10:00:00Z',
      content: 'Legacy entry with inline photo',
      photoUrl: 'data:image/png;base64,INLINE_LEGACY_DATA',
      createdAt: '2026-10-21T10:00:00Z',
      updatedAt: '2026-10-21T10:00:00Z'
    });

    const mockStorage: Partial<StorageService> = {
      keys: async () => Array.from(kvStore.keys()),
      get: async <T>(key: string) => (kvStore.get(key) as T) ?? null,
      set: async (key: string, value: unknown) => {
        kvStore.set(key, value);
      },
      remove: async (key: string) => {
        kvStore.delete(key);
      },
      setPhoto: async (entryId: string, dataUrl: string) => {
        photoBlobs.set(entryId, dataUrl);
        return `${PHOTO_REF_PREFIX}${entryId}`;
      },
      getPhoto: async (entryId: string) => photoBlobs.get(entryId),
      removePhoto: async (entryId: string) => {
        photoBlobs.delete(entryId);
      },
      clearPhotos: async () => {
        photoBlobs.clear();
      }
    };

    const service = new JournalService(mockStorage as StorageService);

    const loadedLegacy = await service.getEntryById('legacy1');
    expect(loadedLegacy?.photoUrl).toBe('data:image/png;base64,INLINE_LEGACY_DATA');
    const rawLegacyInKv = kvStore.get('entry_legacy1') as JournalEntry;
    expect(rawLegacyInKv.photoUrl).toBe(`${PHOTO_REF_PREFIX}legacy1`);
    expect(photoBlobs.get('legacy1')).toBe('data:image/png;base64,INLINE_LEGACY_DATA');

    const created = await service.createEntry(
      'New entry with photo',
      'data:image/jpeg;base64,NEW_PHOTO_DATA'
    );
    expect(created.photoUrl).toBe('data:image/jpeg;base64,NEW_PHOTO_DATA');
    const rawCreatedInKv = kvStore.get(`entry_${created.id}`) as JournalEntry;
    expect(rawCreatedInKv.photoUrl).toBe(`${PHOTO_REF_PREFIX}${created.id}`);
    expect(photoBlobs.get(created.id)).toBe('data:image/jpeg;base64,NEW_PHOTO_DATA');

    await service.updateEntry(created.id, { photoUrl: undefined });
    expect(photoBlobs.has(created.id)).toBe(false);

    await service.deleteEntry('legacy1');
    expect(photoBlobs.has('legacy1')).toBe(false);
  });

  it('getEntryByDate compares local calendar dates instead of UTC dates', async () => {
    const lateEvening = new Date(2026, 9, 22, 23, 30, 0);
    const morningSameDay = new Date(2026, 9, 22, 8, 15, 0);

    const storedEntry: JournalEntry = {
      id: 'local-date-1',
      date: lateEvening,
      content: 'Late evening gratitude',
      createdAt: lateEvening,
      updatedAt: lateEvening
    };

    const mockStorage: Partial<StorageService> = {
      keys: async () => ['entry_local-date-1'],
      get: async <T>() => storedEntry as unknown as T,
      set: async () => {},
      remove: async () => {}
    };

    const service = new JournalService(mockStorage as StorageService);
    const matched = await service.getEntryByDate(morningSameDay);
    expect(matched?.id).toBe('local-date-1');
  });

  it('updateEntry skips photo compression when photoUrl is not being updated', async () => {
    const bigPhoto = 'data:image/jpeg;base64,' + 'A'.repeat(350_000);
    let compressCalls = 0;

    const mockPhotoService: Partial<PhotoService> = {
      compressImage: async (dataUrl: string) => {
        compressCalls++;
        return dataUrl;
      }
    };

    const mockStorage: Partial<StorageService> = {
      keys: async () => [],
      get: async () => null,
      set: async () => {},
      remove: async () => {}
    };

    const service = new JournalService(
      mockStorage as StorageService,
      mockPhotoService as PhotoService
    );

    const created = await service.createEntry('Initial content', bigPhoto);
    expect(compressCalls).toBe(1);

    await service.updateEntry(created.id, { content: 'Updated text only' });
    await service.addAiReflection(created.id, 'Thoughtful reflection');
    expect(compressCalls).toBe(1);
  });
});
