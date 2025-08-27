# Gemini Guide — StudyMaster PWA (Project-local Addendum)

Purpose: Keep this as a lean, project-specific layer. Your home GEMINI.md and [AGENTS.md](AGENTS.md:1) are the sources of truth for global rules.

Scope and precedence
- Follow your home GEMINI.md first (non‑negotiables, git protocol, testing policy, reasoning/output discipline).
- Then follow [AGENTS.md](AGENTS.md:1) for workflow, coding standards, security, and AI behavior.
- This file only adds StudyMaster specifics. If anything conflicts, prefer the home GEMINI.md.

Repo entry points
- Frontend: React + TypeScript + Vite — [client/src/main.tsx](client/src/main.tsx:1), [client/src/App.tsx](client/src/App.tsx:1)
- Shared types (frontend): [client/src/types/index.ts](client/src/types/index.ts:1), [client/src/types/api.ts](client/src/types/api.ts:1)
- Documentation: [README.md](README.md:1), [docs/development/README.md](docs/development/README.md:1), [docs/deployment/README.md](docs/deployment/README.md:1)
- Troubleshooting: [docs/development/troubleshooting.md](docs/development/troubleshooting.md:1)

Quickstart (day-to-day)
- Install once per package, then run dev servers
- Keep changes small; update docs when behavior changes
- Run typecheck, lint, and tests before committing

Commands
```bash
# Install
npm install
cd client && npm install
cd ../server && npm install

# Dev (root scripts start both where available)
npm run dev
# Or individually
cd client && npm run dev
cd server && npm run dev

# Test and lint
cd client && npm test
cd server && npm test
npm run lint
npm run lint:fix

# Build
cd client && npm run build
cd server && npm run build
```

Supabase (local optional)
```bash
npx supabase start
npx supabase db reset
# If types are generated for client
npx supabase gen types typescript --local > client/src/types/supabase.ts
```

Environment configuration
- Root env examples: [.env.example](.env.example:1), [.env.production.example](.env.production.example:1)
- Client env examples: [client/.env.example](client/.env.example:1), [client/.env.production.example](client/.env.production.example:1)
- Do not commit real secrets. Verify ignores:
```bash
git check-ignore .env.production
git check-ignore client/.env.production
```

Deployment
- Preferred host: Vercel (client and optionally server)
```bash
npm i -g vercel
cd client && vercel --prod
cd ../server && vercel --prod
```
- See [docs/deployment/README.md](docs/deployment/README.md:1) for details and env management.

Project conventions (delta from global)
- Tech stack: React + TypeScript + Vite on the client; Node/TypeScript on the server; Supabase for data
- Keep feature logic small and typed; colocate UI with component state; extract reusable utilities to [client/src/utils/](client/src/utils/debugLogger.ts:1)
- Update documentation when adding features: [README.md](README.md:1) and relevant docs under [docs/](docs/features/README.md:1)
- Avoid oversized files; refactor long modules into smaller units

Common tasks (high level)
- Add feature
  - Define/extend types under [client/src/types/](client/src/types/index.ts:1)
  - Add API/backend logic in server (follow local patterns)
  - Implement UI in [client/src/components/](client/src/components/UAMSComponent.tsx:1)
  - Update state where applicable (e.g., [client/src/stores/](client/src/stores/deckStore.ts:1))
  - Add tests near the change (e.g., [client/src/components/study/__tests__/](client/src/components/study/__tests__/SecureCardRenderer.test.tsx:1))
- Debug
  - Verify env vars and network requests in browser devtools
  - Check local server logs and console output
  - See [docs/development/troubleshooting.md](docs/development/troubleshooting.md:1)

Security and quality reminders
- Never commit secrets; prefer env vars or secret managers
- Keep dependency updates scoped; run tests after upgrades
- Follow local code style and naming as seen in [client/src/components/](client/src/components/study/CardRenderer.tsx:1)

References
- Global rules: your home GEMINI.md
- Project standards: [AGENTS.md](AGENTS.md:1)
- Project docs: [README.md](README.md:1), [docs/development/README.md](docs/development/README.md:1), [docs/deployment/README.md](docs/deployment/README.md:1), [docs/features/README.md](docs/features/README.md:1)
