import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationService } from './services/notification.service';
import { SettingsService } from './services/settings.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  constructor(
    private notificationService: NotificationService,
    private settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    this.settingsService.getSettings();
    this.notificationService.initialize();
  }
}
