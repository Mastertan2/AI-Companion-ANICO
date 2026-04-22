# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a web app (React + Vite), a native mobile app (Expo), and an Express API server.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 with esbuild bundling
- **AI model**: OpenAI gpt-4o-mini via user's own OPENAI_API_KEY secret
- **Mobile**: Expo SDK 54 (React Native 0.81)

## Artifacts

| Artifact | Path | Description |
|---|---|---|
| `artifacts/ai-companion` | `/` | React + Vite web version of the AI Companion |
| `artifacts/companion-app` | `/companion-app/` | Expo (iOS/Android) native mobile app |
| `artifacts/api-server` | `/api/` | Express backend (chat + transcription) |

## AI Companion App — Features

Designed for elderly users. Available in 4 languages: English, Chinese, Malay, Tamil.

### Home Screen
- Time-based greeting (Good morning/afternoon/evening)
- **Check-In Card** (prominent, color-coded): shows last check-in time, status badge (green/yellow/red), "Check In Now" button, "Alert Children" WhatsApp button (appears when overdue/warning)
- Language selector (EN / 中文 / BM / தமிழ்)
- Large "Ask a Question" button → AI chat screen
- Quick actions grid: Call Family, WhatsApp, Calendar, YouTube, SingPass, Maps, Reminders, Alarm, Caregiver — all labels translated per active language
- Alarm card opens device Clock app via Android intent / iOS clock-alarm scheme
- Emergency "Call 999" button fixed at bottom
- Contacts and Settings buttons (top-right)

### AI Chat Screen (app/assistant.tsx)
- Conversation history (last 10 messages sent to API)
- Text input with Send button
- Voice input: tap mic → record audio → auto-transcribed via `/api/transcribe` (OpenAI Whisper) → sent as chat message
- Text-to-speech: AI responses read aloud via expo-speech
- Language-aware TTS voice selection
- Supports AI action routing for maps (navigate_maps / open_maps), YouTube, Spotify, Google search, calling/messaging contacts by name or role, creating reminders (with optional date), and setting alarms (set_alarm action opens device Clock app)
- Android SingPass: uses intent URL `intent://sg.ndi.sp/#Intent;scheme=singpass;package=sg.ndi.sp;end` with web fallback

### Contacts & Roles Screen (app/contacts.tsx)
- Reads device contacts via expo-contacts permission
- Stores contacts in AsyncStorage with role labels: child, friend, doctor
- Call (tel:) and WhatsApp (whatsapp://) deep links per contact
- Only contacts marked `child` receive automatic care alerts

### Settings, Reminders, and Caregiver Dashboard
- `app/settings.tsx`: elderly user name and privacy controls for shared alert data
- `app/reminders.tsx`: add, list, and complete local reminders with notifications
- `app/caregiver.tsx`: caregiver status view showing last check-in, child contacts, and alert history

### Check-In System (context/AppContext.tsx)
- 3-hour local timer; triggers CheckInModal when elapsed
- Rotating check-in prompts such as wellbeing, eating, hydration, and walking
- expo-notifications schedules foreground/background notification
- Yes/check-in response resets 3-hour timer
- No response after 6 hours triggers automatic child-only care alert
- Need Help sends a child-only alert and falls back to WhatsApp/SMS deep links on device

### Deep Links Supported
- tel:999 (emergency), tel:<phone> (contacts)
- whatsapp://send?phone=<number>
- calshow:// / content://com.android.calendar (Calendar)
- youtube:// / https://www.youtube.com
- singpass:// / https://app.singpass.sg

## API Endpoints

- `GET /api/` — Health check
- `POST /api/chat` — AI chat (body: `{ message, history[], language, contacts[] }`) → `{ reply, action }`
- `POST /api/transcribe` — Audio transcription (multipart: `audio` file) → `{ text }`
- `POST /api/alert` — Sends child-only SMS alerts through Twilio when configured; returns 503 if SMS secrets are missing

## Key Files

- `artifacts/companion-app/app/index.tsx` — Home screen
- `artifacts/companion-app/app/assistant.tsx` — Chat screen
- `artifacts/companion-app/app/contacts.tsx` — Contacts and roles
- `artifacts/companion-app/app/settings.tsx` — Privacy and profile settings
- `artifacts/companion-app/app/reminders.tsx` — Reminder management
- `artifacts/companion-app/app/caregiver.tsx` — Caregiver dashboard
- `artifacts/companion-app/context/AppContext.tsx` — Global state (language, contacts, check-in, reminders, alerts, privacy)
- `artifacts/companion-app/components/CheckInModal.tsx` — Check-in overlay
- `artifacts/companion-app/constants/translations.ts` — All 4 languages
- `artifacts/companion-app/constants/colors.ts` — Warm beige/orange design tokens
- `artifacts/api-server/src/routes/chat.ts` — AI chat route
- `artifacts/api-server/src/routes/alert.ts` — SMS alert route
- `artifacts/api-server/src/routes/transcribe.ts` — Whisper transcription route

## Design

- Warm cream background: `#FFF8F0`
- Primary orange: `#E07B2A`
- Emergency red: `#D42B2B`
- Font: Inter (400/500/600/700)
- Minimum font size: 15pt (labels), 18-32pt (major UI elements)

## Environment Variables

- `OPENAI_API_KEY` — Required for chat and transcription endpoints
- `TWILIO_ACCOUNT_SID` — Required for automatic SMS alerts
- `TWILIO_AUTH_TOKEN` — Required for automatic SMS alerts
- `TWILIO_FROM_PHONE` — Required for automatic SMS alerts
- `SESSION_SECRET` — Session secret (legacy)
- `PORT` — Assigned dynamically by Replit per artifact
- `EXPO_PUBLIC_DOMAIN` — Injected at dev start time; used by Expo app to call `/api/`

Twilio is currently implemented through environment secrets rather than a connected integration because the Twilio connector was dismissed. Without the three Twilio secrets, `/api/alert` returns a clear 503 and the mobile app falls back to opening WhatsApp/SMS deep links on the device.

## Key Commands

- `pnpm --filter @workspace/companion-app run dev` — Start Expo app
- `pnpm --filter @workspace/api-server run dev` — Start API server
- `pnpm run typecheck` — Full typecheck across all packages
