# Gemini Code Assistant Guide for DailyGrats

Welcome to DailyGrats! This document provides guidance on how Gemini can assist in the development of this gratitude journal application.

## Project Overview

**DailyGrats** is a cross-platform gratitude journal application built with Angular and Capacitor. It allows users to create and manage daily gratitude entries, attach photos, and receive AI-powered reflections. The app is designed to work on web, iOS, and Android, with a focus on a clean, modern user interface and offline-first functionality.

### Key Features

- **Gratitude Journaling**: Users can create, edit, and delete daily entries.
- **Photo Attachments**: Users can attach a photo to each entry from their device's camera or gallery.
- **AI Reflections**: The app provides AI-generated reflections on user entries to encourage mindfulness.
- **Local Notifications**: Users can set up daily reminders to write in their journal.
- **Local Data Storage**: All data is stored on the device using Capacitor's Preferences API, ensuring privacy and offline access.

### Technology Stack

- **Frontend Framework**: [Angular](https://angular.io/) (version 21)
- **Mobile Runtime**: [Capacitor](https://capacitorjs.com/) (version 8)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [SCSS](https://sass-lang.com/)
- **Core Libraries**:
  - [RxJS](https://rxjs.dev/) for reactive programming.
  - Capacitor APIs for native features (`@capacitor/camera`, `@capacitor/local-notifications`, `@capacitor/preferences`).

## How Gemini Can Help

Gemini is here to assist with various development tasks. Here’s how you can leverage its capabilities:

### 1. Understanding the Codebase

You can ask Gemini questions about the project's structure, functionality, and code.

**Example Prompts:**

- "Explain the role of the `JournalService`."
- "Where is the main routing configuration located?"
- "How does the application store data locally?"
- "Trace the flow of creating a new journal entry."

### 2. Adding New Features

Gemini can help you implement new features by generating code, suggesting approaches, and creating new files.

**Example Prompts:**

- "Add a feature to search for journal entries by keyword. This should include a search bar in `entry-list.component.html` and filtering logic in `entry-list.component.ts`."
- "Create a new component to display statistics about the user's journaling habits."
- "Implement a 'dark mode' theme toggle in the settings component."

### 3. Writing and Updating Tests

Gemini can assist in creating and maintaining tests for the application. The project uses `vitest` for unit testing.

**Example Prompts:**

- "Write a unit test for the `JournalService`'s `deleteEntry` method."
- "Add a test case to `entry-detail.component.spec.ts` that verifies the AI reflection is displayed correctly."
- "Update the tests for the `SettingsComponent` to account for a new theme setting."

### 4. Refactoring Code

You can ask Gemini to refactor existing code to improve its quality, performance, or readability.

**Example Prompts:**

- "Refactor the `formatDate` method in `entry-list.component.ts` to be more efficient."
- "Can you simplify the logic for creating a new entry in `journal.service.ts`?"
- "Analyze the `entry-detail.component.ts` for any potential improvements."

### 5. Debugging Issues

If you encounter a bug, Gemini can help you diagnose and fix it.

**Example Prompts:**

- "I'm getting a `TypeError` when trying to save a new journal entry. Can you help me debug `journal.service.ts`?"
- "The photo preview is not showing up in `entry-detail.component.html`. What could be the issue?"

## Project Structure Highlights

- **`src/app/components`**: Contains the main UI components of the application.
  - `entry-list`: Displays the list of journal entries.
  - `entry-detail`: For creating and editing a single entry.
  - `settings`: Manages application settings.
- **`src/app/services`**: Houses the core logic for the application.
  - `journal.service.ts`: Manages all CRUD operations for journal entries.
  - `storage.service.ts`: A wrapper around Capacitor's Preferences API for local storage.
  - `photo.service.ts`: Handles camera and photo gallery interactions.
  - `notification.service.ts`: Manages scheduling and handling of local notifications.
  - `ai-reflection.service.ts`: Responsible for generating AI-powered reflections.
- **`src/app/models`**: Defines the `JournalEntry` data structure.
- **`capacitor.config.ts`**: Main configuration file for Capacitor, defining the app ID, name, and web directory.
- **`angular.json`**: The main configuration file for the Angular CLI, defining build, serve, and test configurations.

By following this guide, you can effectively collaborate with Gemini to build, maintain, and enhance the DailyGrats application.
