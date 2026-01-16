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
    try {
      await Preferences.set({
        key,
        value: JSON.stringify(value)
      });
    } catch (error) {
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

  async clear(): Promise<void> {
    try {
      await Preferences.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }
}
