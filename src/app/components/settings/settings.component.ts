import { ChangeDetectorRef, Component, OnDestroy, OnInit, Optional } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { SettingsService } from '../../services/settings.service';
import { NotificationService } from '../../services/notification.service';
import { JournalService } from '../../services/journal.service';
import { DialogService } from '../../services/dialog.service';
import { AppSettings } from '../../models/journal-entry.model';

const AI_CONFIG_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit, OnDestroy {
  settings: AppSettings = {
    notifications: {
      enabled: false,
      time: '20:00',
      days: [0, 1, 2, 3, 4, 5, 6]
    },
    aiReflectionEnabled: true,
    aiApiEndpoint: '',
    aiApiKey: '',
    theme: 'auto'
  };

  daysOfWeek = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' }
  ];

  permissionGranted = false;
  importExportMessage = '';
  importExportError = false;
  isProcessingData = false;
  private aiConfigDebounceTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private settingsService: SettingsService,
    private notificationService: NotificationService,
    private journalService: JournalService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Optional() private dialogService?: DialogService
  ) {}

  async ngOnInit(): Promise<void> {
    this.settings = await this.settingsService.getSettings();
    this.permissionGranted = await this.notificationService.checkPermissions();
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    if (this.aiConfigDebounceTimer !== undefined) {
      clearTimeout(this.aiConfigDebounceTimer);
      this.aiConfigDebounceTimer = undefined;
      void this.settingsService.updateSettings(this.settings);
    }
  }

  async toggleNotifications(): Promise<void> {
    if (this.settings.notifications.enabled) {
      // Enabling notifications - check permissions
      if (!this.permissionGranted) {
        this.permissionGranted = await this.notificationService.requestPermissions();
        if (!this.permissionGranted) {
          await (this.dialogService ?? new DialogService()).alert(
            'Notification permissions are required to enable reminders.'
          );
          // Revert the toggle since permission was denied
          this.settings.notifications.enabled = false;
          this.cdr.markForCheck();
          return;
        }
      }
    }

    await this.saveSettings(true);
    this.cdr.markForCheck();
  }

  async updateNotificationTime(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    this.settings.notifications.time = target.value;
    await this.saveSettings(true);
  }

  async toggleDay(day: number): Promise<void> {
    const index = this.settings.notifications.days.indexOf(day);
    if (index > -1) {
      // Remove day if already selected
      if (this.settings.notifications.days.length > 1) {
        this.settings.notifications.days = this.settings.notifications.days.filter(d => d !== day);
      } else {
        await (this.dialogService ?? new DialogService()).alert(
          'At least one day must be selected.'
        );
        return;
      }
    } else {
      // Add day
      this.settings.notifications.days.push(day);
      this.settings.notifications.days.sort();
    }

    await this.saveSettings(true);
  }

  isDaySelected(day: number): boolean {
    return this.settings.notifications.days.includes(day);
  }

  async toggleAiReflection(): Promise<void> {
    this.settings.aiReflectionEnabled = !this.settings.aiReflectionEnabled;
    await this.saveSettings(false);
  }

  onAiConfigInput(): void {
    if (this.aiConfigDebounceTimer !== undefined) {
      clearTimeout(this.aiConfigDebounceTimer);
    }
    this.aiConfigDebounceTimer = setTimeout(() => {
      this.aiConfigDebounceTimer = undefined;
      void this.updateAiConfig();
    }, AI_CONFIG_DEBOUNCE_MS);
  }

  async updateAiConfig(): Promise<void> {
    if (this.aiConfigDebounceTimer !== undefined) {
      clearTimeout(this.aiConfigDebounceTimer);
      this.aiConfigDebounceTimer = undefined;
    }
    await this.saveSettings(false);
  }

  async updateTheme(theme: 'light' | 'dark' | 'auto'): Promise<void> {
    this.settings.theme = theme;
    await this.saveSettings(false);
  }

  async exportEntries(): Promise<void> {
    this.isProcessingData = true;
    this.importExportMessage = '';
    this.importExportError = false;
    this.cdr.markForCheck();

    try {
      const entries = await this.journalService.getEntries();
      const jsonData = await this.journalService.exportEntries();
      const dateStamp = this.getLocalDateStamp(new Date());
      const fileName = `dailygrats-entries-${dateStamp}.json`;

      await this.saveOrShareExportFile(fileName, jsonData);

      const count = entries.length;
      this.importExportMessage = `Exported ${count} ${count === 1 ? 'entry' : 'entries'} successfully.`;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        // User dismissed native share sheet
        return;
      }
      this.importExportError = true;
      this.importExportMessage =
        error instanceof Error ? error.message : 'Failed to export entries.';
    } finally {
      this.isProcessingData = false;
      this.cdr.markForCheck();
    }
  }

  private async saveOrShareExportFile(fileName: string, jsonData: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      const plugins = (Capacitor as unknown as {
        Plugins?: Record<string, Record<string, (...args: unknown[]) => Promise<unknown>>>;
      }).Plugins;

      const filesystem = plugins?.['Filesystem'];
      const share = plugins?.['Share'];

      if (filesystem?.['writeFile'] && share?.['share']) {
        const writeResult = (await filesystem['writeFile']({
          path: fileName,
          data: jsonData,
          directory: 'CACHE',
          encoding: 'utf8'
        })) as { uri?: string };

        if (writeResult?.uri) {
          await share['share']({
            title: 'DailyGrats Backup',
            url: writeResult.uri,
            dialogTitle: 'Export Gratitude Entries'
          });
          return;
        }
      }

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof File !== 'undefined') {
        const file = new File([jsonData], fileName, { type: 'application/json' });
        if (typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'DailyGrats Backup',
            files: [file]
          });
          return;
        }
      }
    }

    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  triggerImport(fileInput: HTMLInputElement): void {
    fileInput.value = '';
    fileInput.click();
  }

  async onImportFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.isProcessingData = true;
    this.importExportMessage = '';
    this.importExportError = false;
    this.cdr.markForCheck();

    try {
      const text = await file.text();
      const result = await this.journalService.importEntries(text);
      this.importExportMessage = `Import complete: ${result.added} added, ${result.updated} updated.`;
    } catch (error: unknown) {
      this.importExportError = true;
      this.importExportMessage =
        error instanceof Error ? error.message : 'Failed to import entries.';
    } finally {
      this.isProcessingData = false;
      input.value = '';
      this.cdr.markForCheck();
    }
  }

  async clearData(): Promise<void> {
    const confirmed = await (this.dialogService ?? new DialogService()).confirm(
      'Are you sure you want to delete all gratitude entries? This action cannot be undone.'
    );
    if (!confirmed) {
      return;
    }

    this.isProcessingData = true;
    this.importExportMessage = '';
    this.importExportError = false;
    this.cdr.markForCheck();

    try {
      const removedCount = await this.journalService.clearEntries();
      this.importExportMessage = `Cleared ${removedCount} ${removedCount === 1 ? 'entry' : 'entries'}.`;
    } catch (error: unknown) {
      this.importExportError = true;
      this.importExportMessage =
        error instanceof Error ? error.message : 'Failed to clear entries.';
    } finally {
      this.isProcessingData = false;
      this.cdr.markForCheck();
    }
  }

  private async saveSettings(updateNotifications = false): Promise<void> {
    await this.settingsService.updateSettings(this.settings);

    if (updateNotifications) {
      if (this.settings.notifications.enabled) {
        await this.notificationService.scheduleNotifications();
      } else {
        await this.notificationService.cancelNotifications();
      }
    }
  }

  private getLocalDateStamp(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
