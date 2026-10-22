import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  async alert(message: string, title = 'DailyGrats'): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      const dialogPlugin = this.getNativeDialogPlugin();
      if (dialogPlugin?.['alert']) {
        await dialogPlugin['alert']({ title, message });
        return;
      }
    }

    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(message);
    }
  }

  async confirm(message: string, title = 'Confirm'): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      const dialogPlugin = this.getNativeDialogPlugin();
      if (dialogPlugin?.['confirm']) {
        const result = (await dialogPlugin['confirm']({ title, message })) as { value?: boolean };
        return !!result?.value;
      }
    }

    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      return window.confirm(message);
    }
    return false;
  }

  private getNativeDialogPlugin(): Record<string, (...args: unknown[]) => Promise<unknown>> | undefined {
    const plugins = (Capacitor as unknown as {
      Plugins?: Record<string, Record<string, (...args: unknown[]) => Promise<unknown>>>;
    }).Plugins;
    return plugins?.['Dialog'];
  }
}
