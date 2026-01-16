import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { JournalService } from '../../services/journal.service';
import { PhotoService } from '../../services/photo.service';
import { AiReflectionService } from '../../services/ai-reflection.service';
import { SettingsService } from '../../services/settings.service';
import { JournalEntry } from '../../models/journal-entry.model';

@Component({
  selector: 'app-entry-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './entry-detail.component.html',
  styleUrls: ['./entry-detail.component.scss']
})
export class EntryDetailComponent implements OnInit {
  entry?: JournalEntry;
  isNew = false;
  content = '';
  photoUrl?: string;
  isGeneratingReflection = false;
  showPhotoOptions = false;
  aiReflectionEnabled = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private journalService: JournalService,
    private photoService: PhotoService,
    private aiReflectionService: AiReflectionService,
    private settingsService: SettingsService
  ) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');

    // Check AI reflection settings
    const settings = await this.settingsService.getSettings();
    this.aiReflectionEnabled = settings.aiReflectionEnabled;

    if (id === 'new') {
      this.isNew = true;
    } else if (id) {
      this.entry = await this.journalService.getEntryById(id);
      if (this.entry) {
        this.content = this.entry.content;
        this.photoUrl = this.entry.photoUrl;
      } else {
        this.router.navigate(['/']);
      }
    }
  }

  async save(): Promise<void> {
    if (!this.content.trim()) {
      return;
    }

    try {
      if (this.isNew) {
        this.entry = await this.journalService.createEntry(this.content, this.photoUrl);
      } else if (this.entry) {
        await this.journalService.updateEntry(this.entry.id, {
          content: this.content,
          photoUrl: this.photoUrl
        });
      }

      this.router.navigate(['/']);
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Failed to save entry. Please try again.');
    }
  }

  async takePhoto(): Promise<void> {
    this.showPhotoOptions = false;
    const photo = await this.photoService.takePhoto();
    if (photo) {
      this.photoUrl = photo;
    }
  }

  async selectPhoto(): Promise<void> {
    this.showPhotoOptions = false;
    const photo = await this.photoService.selectPhoto();
    if (photo) {
      this.photoUrl = photo;
    }
  }

  removePhoto(): void {
    this.photoUrl = undefined;
  }

  togglePhotoOptions(): void {
    this.showPhotoOptions = !this.showPhotoOptions;
  }

  async generateReflection(): Promise<void> {
    if (!this.entry || !this.content.trim()) {
      return;
    }

    this.isGeneratingReflection = true;

    try {
      const reflection = await this.aiReflectionService.generateReflection(this.content);
      const updatedEntry = await this.journalService.addAiReflection(this.entry.id, reflection);
      if (updatedEntry) {
        this.entry = updatedEntry;
      }
    } catch (error) {
      console.error('Error generating reflection:', error);
      alert('Failed to generate AI reflection. Using offline mode.');
      // Fallback to mock reflection
      const reflection = await this.aiReflectionService.generateReflection(this.content);
      const updatedEntry = await this.journalService.addAiReflection(this.entry.id, reflection);
      if (updatedEntry) {
        this.entry = updatedEntry;
      }
    } finally {
      this.isGeneratingReflection = false;
    }
  }

  async deleteEntry(): Promise<void> {
    if (!this.entry) {
      return;
    }

    if (confirm('Are you sure you want to delete this entry?')) {
      await this.journalService.deleteEntry(this.entry.id);
      this.router.navigate(['/']);
    }
  }

  cancel(): void {
    this.router.navigate(['/']);
  }
}
