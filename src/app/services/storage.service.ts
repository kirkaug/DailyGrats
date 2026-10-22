import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

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
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }
}
