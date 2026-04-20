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
- Language selector (EN / 中文 / BM / தமிழ்)
- Large "Ask a Question" button → AI chat screen
- 2×3 quick actions grid: Call Family, WhatsApp, Calendar, YouTube, SingPass, (spare)
- Emergency "Call 999" button fixed at bottom
- Contacts button (top-right) → Emergency Contacts screen

### AI Chat Screen (app/assistant.tsx)
- Conversation history (last 10 messages sent to API)
- Text input with Send button
- Voice input: tap mic → record audio → auto-transcribed via `/api/transcribe` (OpenAI Whisper) → sent as chat message
- Text-to-speech: AI responses read aloud via expo-speech
- Language-aware TTS voice selection

### Emergency Contacts Screen (app/contacts.tsx)
- Reads device contacts via expo-contacts permission
- Stores up to N contacts in AsyncStorage
- Call (tel:) and WhatsApp (whatsapp://) deep links per contact

### Check-In System (context/AppContext.tsx)
- 3-hour local timer; triggers CheckInModal when elapsed
- expo-notifications schedules foreground/background notification
- "I'm okay" → resets 3-hour timer
- "Need help" → opens WhatsApp/call to first emergency contact, then calls 999

### Deep Links Supported
- tel:999 (emergency), tel:<phone> (contacts)
- whatsapp://send?phone=<number>
- calshow:// / content://com.android.calendar (Calendar)
- youtube:// / https://www.youtube.com
- singpass:// / https://app.singpass.sg

## API Endpoints

- `GET /api/` — Health check
- `POST /api/chat` — AI chat (body: `{ message, history[], language }`) → `{ reply }`
- `POST /api/transcribe` — Audio transcription (multipart: `audio` file) → `{ text }`

## Key Files

- `artifacts/companion-app/app/index.tsx` — Home screen
- `artifacts/companion-app/app/assistant.tsx` — Chat screen
- `artifacts/companion-app/app/contacts.tsx` — Emergency contacts
- `artifacts/companion-app/context/AppContext.tsx` — Global state (language, contacts, check-in)
- `artifacts/companion-app/components/CheckInModal.tsx` — Check-in overlay
- `artifacts/companion-app/constants/translations.ts` — All 4 languages
- `artifacts/companion-app/constants/colors.ts` — Warm beige/orange design tokens
- `artifacts/api-server/src/routes/chat.ts` — AI chat route
- `artifacts/api-server/src/routes/transcribe.ts` — Whisper transcription route

## Design

- Warm cream background: `#FFF8F0`
- Primary orange: `#E07B2A`
- Emergency red: `#D42B2B`
- Font: Inter (400/500/600/700)
- Minimum font size: 15pt (labels), 18-32pt (major UI elements)

## Environment Variables

- `OPENAI_API_KEY` — Required for chat and transcription endpoints
- `SESSION_SECRET` — Session secret (legacy)
- `PORT` — Assigned dynamically by Replit per artifact
- `EXPO_PUBLIC_DOMAIN` — Injected at dev start time; used by Expo app to call `/api/`

## Key Commands

- `pnpm --filter @workspace/companion-app run dev` — Start Expo app
- `pnpm --filter @workspace/api-server run dev` — Start API server
- `pnpm run typecheck` — Full typecheck across all packages
