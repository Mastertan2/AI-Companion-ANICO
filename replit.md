# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: Replit AI Integrations (OpenAI) — no user API key needed

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## AI Companion Features

The API server exposes an AI companion chat endpoint for elderly users:

- `GET /api/` — Returns `{ "message": "Backend running" }` health check
- `POST /api/chat` — Accepts `{ "message": "..." }`, returns `{ "reply": "..." }`
  - Uses `gpt-5-mini` model via Replit AI Integrations proxy
  - System prompt tuned for elderly users: simple language, short answers, patient and encouraging tone
  - Error handling returns 400 if message field is missing/invalid

### Environment Variables (auto-configured via Replit AI Integrations)

- `AI_INTEGRATIONS_OPENAI_BASE_URL` — Replit proxy base URL
- `AI_INTEGRATIONS_OPENAI_API_KEY` — Replit-managed dummy key for SDK compatibility
