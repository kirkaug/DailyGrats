export interface JournalEntry {
  id: string;
  date: Date;
  content: string;
  photoUrl?: string;
  aiReflection?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalExportData {
  version: number;
  exportedAt: string;
  entries: JournalEntry[];
}

export interface ImportResult {
  added: number;
  updated: number;
}


export interface NotificationSettings {
  enabled: boolean;
  time: string; // Format: "HH:MM"
  days: number[]; // 0-6, where 0 is Sunday
}

export interface AppSettings {
  notifications: NotificationSettings;
  aiReflectionEnabled: boolean;
  aiApiEndpoint?: string;
  aiApiKey?: string;
  theme: 'light' | 'dark' | 'auto';
}
