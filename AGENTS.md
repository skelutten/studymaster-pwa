# AGENTS.md - StudyMaster PWA Development Guide

This document outlines essential information and guidelines for AI agents contributing to the StudyMaster PWA project.

## Core Mandates

- **Adhere to Project Conventions:** Always analyze existing code, tests, and configuration to match style, structure, and patterns.
- **Tool Usage:** Verify library/framework usage within the project before employing new ones. **Note:** The `replace` tool is highly sensitive to exact string matches (including whitespace, newlines, and indentation). For multi-line code modifications, it is often more reliable to read the entire file, perform string manipulation in memory, and then write the entire modified content back.
- **Code Comments:** Add comments sparingly, focusing on *why* something is done, not *what*.
- **Proactiveness:** Fulfill requests thoroughly, including implied follow-up actions.
- **Confirm Ambiguity:** Seek clarification for significant actions outside clear request scope.
- **Path Construction:** Always use absolute paths for file system tools.
- **No Reverts:** Do not revert changes unless explicitly asked or due to an error.

## Project Entry Points

- **Frontend:** `client/src/main.tsx`, `client/src/App.tsx`
- **Shared Types:** `client/src/types/index.ts`, `client/src/types/api.ts`
- **Documentation:** `README.md`, `docs/development/README.md`, `docs/deployment/README.md`
- **Troubleshooting:** `docs/development/troubleshooting.md`

## Key Commands

```bash
# Install
npm install
cd client && npm install
cd server && npm install

# Development Servers
npm run dev # (from root, starts both client and server)
# Or individually:
cd client && npm run dev
cd server && npm run dev

# Test and Lint
npm run lint # (from root, lints both client and server)
npm run lint:fix
cd client && npm test
cd server && npm test

# Build
npm run build # (from root, builds shared, client, and server)
# Or individually:
cd client && npm run build
cd server && npm run build
```

## Environment Configuration

- **Root:** `.env.example`, `.env.production.example`
- **Client:** `client/.env.example`, `client/.env.production.template`
- **Security:** Never commit real secrets. Verify `.gitignore` for `.env.production` and `client/.env.production`.

## Deployment (Vercel)

- **Client & Server:** `npm i -g vercel`, then `cd client && vercel --prod`, `cd server && vercel --prod`
- **Details:** Refer to `docs/deployment/README.md` for environment management.

## Project Conventions

- **Tech Stack:** React + TypeScript + Vite (client); Node/TypeScript (server); PocketBase (data).
- **Code Structure:** Keep feature logic small, typed. Colocate UI with component state. Extract reusable utilities to `client/src/utils/`.
- **Documentation:** Update `README.md` and relevant `docs/` files when adding features.
- **File Size:** Avoid oversized files; refactor long modules.

## Security and Quality

- Never commit secrets. Use environment variables.
- Scope dependency updates; run tests after upgrades.
- Follow local code style and naming conventions.

## References

- **Global Rules:** Your home `GEMINI.md`
- **Project Docs:** `README.md`, `docs/development/README.md`, `docs/deployment/README.md`, `docs/features/README.md`