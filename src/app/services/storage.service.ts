import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

export const PHOTO_REF_PREFIX = 'idb://photo/';
const PHOTO_DB_NAME = 'dailygrats_media_db';
const PHOTO_DB_VERSION = 1;
const PHOTO_STORE_NAME = 'photos';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private fallbackPhotoStore = new Map<string, string>();

  async get<T>(key: string): Promise<T | null> {
    try {
      const { value } = await Preferences.get({ key });
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error getting from storage:', error);
      return null;
    }
  }

  async set(key: string, value: any): Promise<void> {
    const serialized = JSON.stringify(value);
    try {
      await Preferences.set({
        key,
        value: serialized
      });
    } catch (error: any) {
      // If updating an existing key hit localStorage quota because old+new briefly coexist,
      // remove the old value first and retry.
      if (error?.name === 'QuotaExceededError' || String(error).includes('QuotaExceededError')) {
        try {
          await Preferences.remove({ key });
          await Preferences.set({
            key,
            value: serialized
          });
          return;
        } catch (retryError) {
          console.error('Error setting to storage after retry:', retryError);
          throw retryError;
        }
      }
      console.error('Error setting to storage:', error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await Preferences.remove({ key });
    } catch (error) {
      console.error('Error removing from storage:', error);
      throw error;
    }
  }

  async keys(): Promise<string[] | null> {
    try {
      const { keys } = await Preferences.keys();
      return keys;
    } catch (error) {
      console.error('Error getting keys from storage:', error);
      return null;
    }
  }

  async clear(): Promise<void> {
    try {
      await Preferences.clear();
      await this.clearPhotos();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  async setPhoto(entryId: string, dataUrl: string): Promise<string> {
    const db = await this.getPhotoDb();
    if (!db) {
      this.fallbackPhotoStore.set(entryId, dataUrl);
      return `${PHOTO_REF_PREFIX}${entryId}`;
    }

    return new Promise(resolve => {
      try {
        const tx = db.transaction(PHOTO_STORE_NAME, 'readwrite');
        const store = tx.objectStore(PHOTO_STORE_NAME);
        store.put(dataUrl, entryId);
        tx.oncomplete = () => resolve(`${PHOTO_REF_PREFIX}${entryId}`);
        tx.onerror = () => {
          this.fallbackPhotoStore.set(entryId, dataUrl);
          resolve(`${PHOTO_REF_PREFIX}${entryId}`);
        };
      } catch {
        this.fallbackPhotoStore.set(entryId, dataUrl);
        resolve(`${PHOTO_REF_PREFIX}${entryId}`);
      }
    });
  }

  async getPhoto(entryId: string): Promise<string | undefined> {
    const db = await this.getPhotoDb();
    if (!db) {
      return this.fallbackPhotoStore.get(entryId);
    }

    return new Promise(resolve => {
      try {
        const tx = db.transaction(PHOTO_STORE_NAME, 'readonly');
        const store = tx.objectStore(PHOTO_STORE_NAME);
        const req = store.get(entryId);
        req.onsuccess = () => {
          const result = typeof req.result === 'string' ? req.result : undefined;
          resolve(result ?? this.fallbackPhotoStore.get(entryId));
        };
        req.onerror = () => resolve(this.fallbackPhotoStore.get(entryId));
      } catch {
        resolve(this.fallbackPhotoStore.get(entryId));
      }
    });
  }

  async removePhoto(entryId: string): Promise<void> {
    this.fallbackPhotoStore.delete(entryId);
    const db = await this.getPhotoDb();
    if (!db) {
      return;
    }

    return new Promise(resolve => {
      try {
        const tx = db.transaction(PHOTO_STORE_NAME, 'readwrite');
        const store = tx.objectStore(PHOTO_STORE_NAME);
        store.delete(entryId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async clearPhotos(): Promise<void> {
    this.fallbackPhotoStore.clear();
    const db = await this.getPhotoDb();
    if (!db) {
      return;
    }

    return new Promise(resolve => {
      try {
        const tx = db.transaction(PHOTO_STORE_NAME, 'readwrite');
        const store = tx.objectStore(PHOTO_STORE_NAME);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  private getPhotoDb(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') {
      return Promise.resolve(null);
    }
    if (!this.dbPromise) {
      this.dbPromise = new Promise(resolve => {
        try {
          const request = indexedDB.open(PHOTO_DB_NAME, PHOTO_DB_VERSION);
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(PHOTO_STORE_NAME)) {
              db.createObjectStore(PHOTO_STORE_NAME);
            }
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }
    return this.dbPromise;
  }
}
