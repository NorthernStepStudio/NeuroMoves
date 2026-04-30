# RealLife Steps - OT Companion App

An Occupational Therapy companion application designed for young children, featuring:
- **Errorless Learning**: No failure states, only gentle redirection.
- **Futuristic "Holo-Play" Theme**: Neon visuals, dark space backgrounds, and glowing interactions.
- **Text-to-Speech**: Audio instructions guide kids through each activity.
- **Haptic Feedback**: Tactile responses on touch.
- **AI Companion** (Optional): Talk to the app using Ollama.

## Getting Started

### Frontend (Static Files)
```bash
cd frontend
python -m http.server 8085
```
Open [http://localhost:8085](http://localhost:8085) in your browser.

### Mobile (Expo)
```bash
cd apps/mobile
npm install
npm run start
```

`SyncService` uses:
- `http://10.0.2.2:5000/api` on Android emulator
- `http://localhost:5000/api` on iOS simulator/web

For a physical phone, set `EXPO_PUBLIC_API_BASE_URL` to your computer's LAN IP before starting Expo (PowerShell example):
```powershell
$env:EXPO_PUBLIC_API_BASE_URL="http://192.168.1.42:5000/api"
$env:EXPO_PUBLIC_APP_ENV="development" # development | staging | production
$env:EXPO_PUBLIC_API_BASE_URL_DEV="http://192.168.1.42:5000/api"
$env:EXPO_PUBLIC_API_BASE_URL_STAGING="https://staging-api.example.com/api"
$env:EXPO_PUBLIC_API_BASE_URL_PROD="https://api.example.com/api"
$env:EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
$env:EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID="your-android-client-id.apps.googleusercontent.com"
$env:EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID="your-ios-client-id.apps.googleusercontent.com"
$env:EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="your-web-client-id.apps.googleusercontent.com"
npm run start
```

### Backend (Flask API + Ollama)
```bash
cd backend
pip install flask flask-cors requests google-auth
python app.py
```
API will run at [http://127.0.0.1:5000](http://127.0.0.1:5000).

Set your Google OAuth client ID for backend token verification:
```powershell
$env:GOOGLE_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
python app.py
```
If you use different Google client IDs per platform, set `GOOGLE_CLIENT_IDS` as comma-separated values instead.

### Authentication + Multi-User
- Parent auth flow: `Signup`, `Login`, `Password Reset`
- Session-token API auth (`Authorization: Bearer <token>`)
- Child profile management: add/select/edit/delete multiple child profiles per parent
- First-run onboarding flow: child profile setup, focus area selection, and baseline assessment
- Sync now uses the selected child profile instead of hardcoded `userId=1`
- Google sign-in is supported when Google OAuth environment variables are configured

Note: password reset email sending is not configured yet. In `DEBUG=True`, the backend returns a `debug_code` for testing.

### OT Companion Tools + Engagement
- **PDF Progress Report Export**: Generate and share a clinical summary (for OT/SLP collaboration) from the `Progress` screen.
- **Email Template Sharing**: After PDF export, share a prefilled subject/body note for OT/SLP follow-up.
- **Daily Journal**: Parent notes + optional photo entries for real-life wins.
- **Achievement Stickers**: Automatic milestone badges (streaks, attempts, successes, journal consistency).
- **Avatar Studio**: Unlockable companion customization rewards tied to achievements.
- **Error Boundary**: App-level crash containment with a recovery UI.

### Monetization Scaffold
- **Paywall Screen**: Added `Paywall` route and upgrade UI.
- **Entitlement Gating**: Free tier allows core starter games; Pro unlocks all games.
- Current implementation uses local entitlement storage; swap to RevenueCat SDK wiring for production billing.

### Ollama Integration
Ensure Ollama is running locally on port `11434`. The backend will call `/api/chat` to generate encouraging AI responses.

## Games & Modules
- **Magic Fingers**: Count 1-5 by tapping fingers.
- **Point It Out**: Find hidden objects.
- **Baby Signs**: Tap along to the beat.
- **Yes/No**: Swipe to answer questions.
- **Shape Sorting, Stacking, Tracing, Color Match, Bubbles, Emotions, Body Parts, Sound Detective, Size Matters**.

## Localization
Supports English, Spanish, and Italian.

## License
Educational use only.
