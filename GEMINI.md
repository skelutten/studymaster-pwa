# GEMINI.md - StudyMaster PWA (Project-local Addendum)

This document provides project-specific guidelines for Gemini, supplementing the global rules.

## Scope and Precedence

1.  **Global Rules:** Refer to your home `GEMINI.md` for non-negotiables (git protocol, testing policy, reasoning/output discipline).
2.  **Project Standards:** Refer to `AGENTS.md` for workflow, coding standards, security, and AI behavior.
3.  **StudyMaster Specifics:** This file outlines project-specific details. In case of conflict, global rules take precedence.

## Repository Entry Points

-   **Frontend:** `client/src/main.tsx`, `client/src/App.tsx`
-   **Shared Types:** `client/src/types/index.ts`, `client/src/types/api.ts`
-   **Documentation:** `README.md`, `docs/development/README.md`, `docs/deployment/README.md`
-   **Troubleshooting:** `docs/development/troubleshooting.md`

## Quickstart Commands

Refer to the root `package.json` for a comprehensive list of scripts. Key commands include:

```bash
# Install all dependencies (root, client, server, shared)
npm run install:all

# Start development servers (client and server)
npm run dev

# Run tests (client and server)
npm test

# Run linters (client and server)
npm run lint

# Build all (shared, client, server)
npm run build
```

## PocketBase (Local Development)

```bash
cd pocketbase
./pocketbase.exe serve --http 0.0.0.0:8090
# Admin UI: http://localhost:8090/_/
# Database and auth handled automatically
```

## Environment Configuration

-   **Root:** `.env.example`, `.env.production.example`
-   **Client:** `client/.env.example`, `client/.env.production.template`
-   **Security:** Do not commit real secrets. Ensure `.gitignore` correctly ignores `.env.production` files.

## Deployment

-   **Preferred Host:** Vercel (client and optionally server).
-   **Details:** See `docs/deployment/README.md` for specific commands and environment management.

## Project Conventions

-   **Tech Stack:** React + TypeScript + Vite (client); Node/TypeScript (server); PocketBase (data).
-   **Code Structure:** Keep feature logic small and typed. Colocate UI with component state. Extract reusable utilities to `client/src/utils/`.
-   **Documentation:** Update `README.md` and relevant `docs/` when adding features.
-   **File Size:** Avoid oversized files; refactor long modules into smaller units.

## Security and Quality Reminders

-   Never commit secrets; prefer environment variables or secret managers.
-   Keep dependency updates scoped; run tests after upgrades.
-   Follow local code style and naming conventions.