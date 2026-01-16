# DailyGrats - Gratitude Journal App

A beautiful, feature-rich gratitude journal application built with Angular and Capacitor. Track your daily gratitude, attach photos, receive AI reflections, and stay motivated with daily reminders.

## Features

- **Daily Journal Entries**: Write and save your daily gratitude entries
- **Photo Attachments**: Capture or select photos to accompany your entries
- **AI Reflections**: Get thoughtful, AI-powered insights on your gratitude entries
- **Daily Reminders**: Set up custom notification schedules to remind you to journal
- **Cross-Platform**: Works on web, iOS, and Android
- **Offline Support**: All data stored locally using Capacitor Preferences
- **Beautiful UI**: Modern, responsive design with smooth animations

## Tech Stack

- **Angular 21**: Modern standalone components architecture
- **Capacitor**: Native mobile functionality
  - Camera API for photo capture
  - Local Notifications for reminders
  - Preferences API for data storage
- **TypeScript**: Type-safe development
- **SCSS**: Advanced styling with variables and mixins

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- (Optional) Android Studio for Android development
- (Optional) Xcode for iOS development

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd DailyGrats
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm start
```

The app will be available at `http://localhost:4200`

### Building for Production

#### Web

```bash
npm run build
npx cap copy web
```

#### Android

```bash
npm run build
npx cap sync android
npx cap open android
```

Then build and run from Android Studio.

#### iOS

```bash
npm run build
npx cap sync ios
npx cap open ios
```

Then build and run from Xcode.

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── entry-list/          # Home page with entry list
│   │   ├── entry-detail/        # Create/edit entry page
│   │   └── settings/            # Settings page
│   ├── models/                  # TypeScript interfaces
│   ├── services/
│   │   ├── journal.service.ts   # Entry management
│   │   ├── storage.service.ts   # Local storage
│   │   ├── photo.service.ts     # Camera/photo functionality
│   │   ├── notification.service.ts # Daily reminders
│   │   ├── ai-reflection.service.ts # AI reflections
│   │   └── settings.service.ts  # App settings
│   ├── app.routes.ts            # Application routing
│   └── app.config.ts            # App configuration
├── styles.scss                  # Global styles
└── index.html                   # Main HTML file
```

## Features in Detail

### Journal Entries

- Create new entries with rich text content
- Edit existing entries
- Delete entries with confirmation
- Automatic date tracking
- Entries sorted by date (newest first)

### Photo Attachments

- Take photos directly from camera
- Select photos from gallery
- Preview photos in entries
- Remove photos if needed
- Photos stored as base64 data URLs

### AI Reflections

- Generate thoughtful reflections on your entries
- Offline mode with built-in responses
- Optional: Configure custom AI API endpoint
- Encouraging, positive feedback

### Daily Reminders

- Enable/disable notifications
- Set custom reminder time
- Choose which days to receive reminders (Mon-Sun)
- Permission handling for notifications

### Settings

- Notification preferences
- AI reflection toggle
- Theme selection (Light/Dark/Auto)
- App information

## Customization

### Configuring AI Reflections

By default, the app uses built-in reflection responses. To use a custom AI API:

1. Modify `src/app/services/ai-reflection.service.ts`
2. Set your API endpoint and key using the `setApiConfig()` method
3. Update the `buildPrompt()` method to match your API's format

### Styling

All styles use SCSS and follow a consistent color scheme:
- Primary: `#667eea` to `#764ba2` (purple gradient)
- Background: White cards on gradient background
- Text: Dark gray on white backgrounds

Modify `src/styles.scss` for global styles or component-specific `.scss` files for local changes.

## Data Storage

All data is stored locally on the device using Capacitor Preferences API:
- Journal entries: `journal_entries` key
- App settings: `app_settings` key

Data persists across app restarts and is private to each installation.

## Permissions

The app requires the following permissions:

### Android
- CAMERA: For taking photos
- READ_EXTERNAL_STORAGE: For selecting photos from gallery
- POST_NOTIFICATIONS: For daily reminders (Android 13+)
- SCHEDULE_EXACT_ALARM: For precise notification timing

### iOS
- Camera usage permission
- Photo library usage permission
- Notification permission

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Notifications not working
- Ensure notification permissions are granted
- Check device notification settings
- Verify at least one day is selected for reminders

### Photos not loading
- Check camera/photo permissions
- Ensure device has sufficient storage
- Try taking a new photo instead of selecting from gallery

### Build errors
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Clear Angular cache: `npx ng cache clean`
- Update dependencies: `npm update`

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on web and mobile
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Icons from Lucide (embedded as SVG)
- Gradient inspiration from uiGradients
- Built with Angular and Capacitor

## Support

For issues, questions, or suggestions, please open an issue on the GitHub repository.

---

Made with gratitude 💜
