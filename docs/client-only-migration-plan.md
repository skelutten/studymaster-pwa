# StudyMaster PWA — Client‑Only Migration Plan (Offline‑First with IndexedDB)

## Goals and scope

- Transform app to operate fully client-side and offline-first.
- Use IndexedDB (via Dexie) as the system of record for all data and media.
- Keep server optional; only used for leaderboard and explicit user-to-user interactions.
- Preserve all existing features offline: decks, study, scheduling, media import/render, achievements.
- Maintain security: safe HTML rendering and media validation.

## Success criteria

- All core flows run with network disabled.
- App installs and runs as a PWA with persistent data and media.
- Leaderboard reads/writes work when online; queue and retry when offline.
- No hard dependency on PocketBase in the client bundle.
- CI tests run without a server.

## Architecture overview

- Storage: IndexedDB with Dexie-based repositories.
- Media: content-hash blob store; object URL resolution; optional OPFS for large assets.
- Sync: background sync for queued leaderboard submissions; cached leaderboard with TTL.
- PWA: Workbox-based precaching and runtime caching with offline navigation.
- Security: strict sanitization and media validation pipeline.

## Key modules and files

- Data layer and repositories: [client/src/data/repositories/index.ts](client/src/data/repositories/index.ts)
- Media pipeline: [client/src/services/anki/MediaContextService.ts](client/src/services/anki/MediaContextService.ts), [client/src/services/anki/SecureRenderer.ts](client/src/services/anki/SecureRenderer.ts), [client/public/workers/enhancedMediaExtraction.js](client/public/workers/enhancedMediaExtraction.js), [client/public/workers/mediaSecurityValidator.js](client/public/workers/mediaSecurityValidator.js)
- Leaderboard provider (client-only default): [client/src/services/leaderboard.ts](client/src/services/leaderboard.ts)
- PWA config and SW: [client/vite.config.ts](client/vite.config.ts), client/dev-dist/sw.js (generated)
- UI pages to wire provider: [client/src/pages/LeaderboardPage.tsx](client/src/pages/LeaderboardPage.tsx), [client/src/pages/GlobalStatsPage.tsx](client/src/pages/GlobalStatsPage.tsx)
- Stores/settings: [client/src/stores/authStore.ts](client/src/stores/authStore.ts), [client/src/stores/gamificationStore.ts](client/src/stores/gamificationStore.ts), [client/src/stores/deckStore.ts](client/src/stores/deckStore.ts)
- Hooks: [client/src/hooks/useAuth.ts](client/src/hooks/useAuth.ts), [client/src/hooks/useRealTimeData.ts](client/src/hooks/useRealTimeData.ts)
- Types: [client/src/types](client/src/types)
- Logging and security: [client/src/utils/debugLogger.ts](client/src/utils/debugLogger.ts), [client/src/services/anki/MediaSecurityValidator.ts](client/src/services/anki/MediaSecurityValidator.ts), [client/src/services/errorTrackingService.tsx](client/src/services/errorTrackingService.tsx)

## Data model (IndexedDB)

Use Dexie to define stores:

- users: local profile (id, username, avatar, preferences)
- decks: deck metadata; owner local
- notes: note fields and templates
- cards: card instances with scheduling state
- reviews: review logs (timestamped)
- media: blobs by content hash; metadata and variants
- achievements: earned achievements and progress
- challenges: optional local challenges
- settings: app-wide config and feature flags
- leaderboardCache: per-scope cached rows with TTL
- syncQueue: queued operations (type, payload, attempts, queuedAt)

Recommended indices:

- cards by deckId and due
- reviews by cardId and ts
- media by hash and filename
- leaderboardCache by scope
- syncQueue by opType and queuedAt

## Media storage and rendering

- On import, compute a SHA-256 content hash for each file and store once.
- Store binary blobs in IndexedDB; create object URLs for rendering.
- Optionally, store large assets in OPFS and keep pointers in IndexedDB.
- Replace inline or remote media references in card HTML with local object URLs.
- Sanitize HTML and restrict allowed elements and attributes.
- Validate media headers and sizes; reject suspicious content.
- Revoke object URLs when unmounting to avoid leaks.

Related modules:

- Media context and mapping: [client/src/services/anki/MediaContextService.ts](client/src/services/anki/MediaContextService.ts)
- Secure rendering: [client/src/services/anki/SecureRenderer.ts](client/src/services/anki/SecureRenderer.ts)
- Security validation: [client/src/services/anki/MediaSecurityValidator.ts](client/src/services/anki/MediaSecurityValidator.ts), [client/public/workers/mediaSecurityValidator.js](client/public/workers/mediaSecurityValidator.js)

## Leaderboard: optional server

- Default provider is client-only with cached reads and queued writes: [client/src/services/leaderboard.ts](client/src/services/leaderboard.ts)
- Caching policy: scope-based TTL (e.g., 10 minutes); manual refresh in UI.
- Submission policy: enqueue when offline or on failure; background sync flush.
- Provider toggle (settings) to enable/disable remote participation.
- Anonymize cache entries using stable IDs; keep minimal personal info locally.

Required UI updates:

- Wire leaderboard page to provider abstraction.
- Show cache age and refresh control.
- Indicate queued submissions and last sync status.

## PWA and service worker

- Precache the app shell with Workbox via vite-plugin-pwa.
- Runtime caching:
  - Static assets: CacheFirst with versioning.
  - Images/fonts: StaleWhileRevalidate.
  - Leaderboard API: NetworkFirst with backgroundSync queue.
- Offline navigation fallback to index.html.
- Periodic sync (if available) to refresh leaderboard cache.

Files to touch:

- PWA config: [client/vite.config.ts](client/vite.config.ts)
- Generated SW: client/dev-dist/sw.js
- Manifest: [client/public/manifest.json](client/public/manifest.json)

## Authentication and identity

- Support a local guest profile stored in IndexedDB for offline use.
- When user opts in to online features (leaderboard), allow login and store token locally.
- Do not block offline flows if login is unavailable.
- Avoid exposing personal details in cached leaderboard data.

Files to review:

- Auth hook and store: [client/src/hooks/useAuth.ts](client/src/hooks/useAuth.ts), [client/src/stores/authStore.ts](client/src/stores/authStore.ts)
- UI: [client/src/components/layout/AuthModal.tsx](client/src/components/layout/AuthModal.tsx), [client/src/pages/ProfilePage.tsx](client/src/pages/ProfilePage.tsx)

## Security posture

- Sanitize all HTML before rendering.
- Only allow data:, blob: and same-origin URLs for media.
- Validate media types and reject untrusted formats or oversized payloads.
- Apply CSP via meta headers where applicable in index.html, and ensure runtime checks.
- Keep validation and sanitization in workers where possible.

Relevant files:

- [client/src/services/anki/MediaSecurityValidator.ts](client/src/services/anki/MediaSecurityValidator.ts)
- [client/src/services/anki/SecureRenderer.ts](client/src/services/anki/SecureRenderer.ts)
- [client/src/index.css](client/src/index.css) and [client/index.html](client/index.html) for CSP/meta

## Migration strategy

Phase 0 — Inventory and flags

- Identify all imports of server code. Grep for “pocketbase”, “/api/”, and “userDataService”.
- Add a feature flag for "offlineOnly" in settings.
- Ensure builds work with server code tree-shaken when offlineOnly is true.

Phase 1 — Data and media

- Implement/confirm Dexie schema and repositories in [client/src/data/repositories/index.ts](client/src/data/repositories/index.ts).
- Migrate data loading and saving in deck and study flows to use repositories.
- Finalize media dedup, storage, and URL resolution.
- Stabilize media import pipeline with tests and worker validations.

Phase 2 — PWA and sync

- Configure Workbox runtime caching and offline navigation in [client/vite.config.ts](client/vite.config.ts).
- Implement background sync queue for leaderboard submissions.
- Implement cached leaderboard provider and wire to UI.
- Add manual refresh and TTL display.

Phase 3 — Remove server coupling

- Replace direct uses of [client/src/lib/pocketbase.ts](client/src/lib/pocketbase.ts) with provider abstractions or local stubs.
- Make real-time hooks no-ops or local for offline mode.
- Ensure all pages function without network (Profile, Decks, Study, Challenges).

Phase 4 — Hardening and docs

- Performance review (memory/object URL lifecycle).
- Security review (sanitization gates, media scanning).
- Documentation updates and migration notes.
- Telemetry/logging improvements (client-only).

## Testing plan

- Unit tests for repositories using fake-indexeddb.
- Integration tests: APKG import → media → render offline.
- PWA offline navigation tests (mock SW).
- Leaderboard queue: enqueue offline, flush on reconnection.
- Cache TTL behavior with manual refresh.
- Security tests: malicious HTML/media detection.

Files of interest:

- [client/vitest.setup.ts](client/vitest.setup.ts)
- [client/src/__tests__/integration/mediaImportPipeline.test.ts](client/src/__tests__/integration/mediaImportPipeline.test.ts)
- [client/src/__tests__/integration/pocketbase.test.ts](client/src/__tests__/integration/pocketbase.test.ts) (to be deprecated or refactored)
- [client/src/components/study/__tests__/SecureCardRenderer.test.tsx](client/src/components/study/__tests__/SecureCardRenderer.test.tsx)

## Rollout and risk management

- Feature flag to toggle server participation.
- Back up user data locally before changing schemas.
- Provide “Export/Import” of local data for safety.
- Monitor performance and storage quotas; prompt users to manage media if near limits.

## Deliverables checklist

- [x] Dexie schemas and repositories finalized
- [x] Media pipeline fully local, with validation workers
- [x] PWA config with offline routing and caching
- [x] Leaderboard provider, cache, and queue with background sync
- [x] UI wired to provider with refresh and status
- [x] Tests green for offline-first scenarios
- [x] Server code optional and tree-shaken
- [x] Documentation updated (README and security)

## References

- Core config: [client/vite.config.ts](client/vite.config.ts), [client/public/manifest.json](client/public/manifest.json)
- Offline queue and cache: [client/src/services/leaderboard.ts](client/src/services/leaderboard.ts), [client/src/data/repositories/index.ts](client/src/data/repositories/index.ts)
- Security: [docs/security/README.md](docs/security/README.md)
- Development: [docs/development/README.md](docs/development/README.md)