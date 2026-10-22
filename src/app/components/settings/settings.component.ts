import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SettingsService } from '../../services/settings.service';
import { NotificationService } from '../../services/notification.service';
import { JournalService } from '../../services/journal.service';
import { AppSettings } from '../../models/journal-entry.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
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

  constructor(
    private settingsService: SettingsService,
    private notificationService: NotificationService,
    private journalService: JournalService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.settings = await this.settingsService.getSettings();
    this.permissionGranted = await this.notificationService.checkPermissions();
    this.cdr.markForCheck();
  }

  async toggleNotifications(): Promise<void> {
    if (this.settings.notifications.enabled) {
      // Enabling notifications - check permissions
      if (!this.permissionGranted) {
        this.permissionGranted = await this.notificationService.requestPermissions();
        if (!this.permissionGranted) {
          alert('Notification permissions are required to enable reminders.');
          // Revert the toggle since permission was denied
          this.settings.notifications.enabled = false;
          this.cdr.markForCheck();
          return;
        }
      }
    }

    await this.saveSettings();
    this.cdr.markForCheck();
  }

  async updateNotificationTime(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    this.settings.notifications.time = target.value;
    await this.saveSettings();
  }

  async toggleDay(day: number): Promise<void> {
    const index = this.settings.notifications.days.indexOf(day);
    if (index > -1) {
      // Remove day if already selected
      if (this.settings.notifications.days.length > 1) {
        this.settings.notifications.days = this.settings.notifications.days.filter(d => d !== day);
      } else {
        alert('At least one day must be selected.');
        return;
      }
    } else {
      // Add day
      this.settings.notifications.days.push(day);
      this.settings.notifications.days.sort();
    }

    await this.saveSettings();
  }

  isDaySelected(day: number): boolean {
    return this.settings.notifications.days.includes(day);
  }

  async toggleAiReflection(): Promise<void> {
    this.settings.aiReflectionEnabled = !this.settings.aiReflectionEnabled;
    await this.saveSettings();
  }

  async updateAiConfig(): Promise<void> {
    await this.saveSettings();
  }

  async updateTheme(theme: 'light' | 'dark' | 'auto'): Promise<void> {
    this.settings.theme = theme;
    await this.saveSettings();
  }

  async exportEntries(): Promise<void> {
    this.isProcessingData = true;
    this.importExportMessage = '';
    this.importExportError = false;
    this.cdr.markForCheck();

    try {
      const entries = await this.journalService.getEntries();
      const jsonData = await this.journalService.exportEntries();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStamp = new Date().toISOString().split('T')[0];

      const link = document.createElement('a');
      link.href = url;
      link.download = `dailygrats-entries-${dateStamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const count = entries.length;
      this.importExportMessage = `Exported ${count} ${count === 1 ? 'entry' : 'entries'} successfully.`;
    } catch (error: unknown) {
      this.importExportError = true;
      this.importExportMessage =
        error instanceof Error ? error.message : 'Failed to export entries.';
    } finally {
      this.isProcessingData = false;
      this.cdr.markForCheck();
    }
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
    if (
      !confirm(
        'Are you sure you want to delete all gratitude entries? This action cannot be undone.'
      )
    ) {
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

  private async saveSettings(): Promise<void> {
    await this.settingsService.updateSettings(this.settings);

    // Update notifications schedule
    if (this.settings.notifications.enabled) {
      await this.notificationService.scheduleNotifications();
    } else {
      await this.notificationService.cancelNotifications();
    }
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
