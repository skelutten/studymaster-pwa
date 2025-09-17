# Transform Plan: Make StudyMaster a Client-side Only Offline-first PWA

Date: 2025-09-17

Summary
Transform the app to run entirely on the client using IndexedDB (and OPFS where available) as the source of truth for all data and media. The server becomes optional and limited to leaderboard and future community interactions. The app must be fully usable offline: import, study, scheduling, achievements, media handling, and settings.

Objectives and scope
- Fully functional offline with IndexedDB as primary storage for data and media.
- Preserve performance, UX, and security (secure media rendering and validation).
- Server is optional and used only for:
  - Global/community leaderboards (submit/fetch).
  - Optional user interactions (community challenges/sharing).
  - Optional encrypted backup/restore in the future.
- Default identity is device-local and anonymous; online identity is opt-in.

Out of scope (initial release)
- Real-time multi-device sync.
- Complex server-side account flows or moderation pipelines.

Current state references (client focus)
- Client application: client/
  - Pages/components: client/src/pages/, client/src/components/
  - Stores (Zustand): client/src/stores/
  - Hooks: client/src/hooks/
  - Types: client/src/types/
  - Media workers: client/public/workers/enhancedMediaExtraction.js, client/public/workers/mediaSecurityValidator.js
  - PWA config: client/vite.config.ts, service worker outputs in client/dev-dist/
- Server (to be optional): server/, pocketbase/
- Current server binding in client: client/src/lib/pocketbase.ts

Target architecture overview
- Offline-first storage:
  - IndexedDB is the system of record for settings, decks, cards, reviews, schedules, gamification, and media blobs.
  - Use OPFS for very large media when supported; fallback to IndexedDB blobs.
- Provider abstraction:
  - UI and stores use a repository layer which targets IndexedDB by default.
  - Optional providers: leaderboard (online), future sync/backup.
- Background work:
  - Service Worker handles app-shell caching, runtime caching, and background/periodic sync to flush queued leaderboard submissions and refresh cached leaderboards.

IndexedDB storage design
- Library: Dexie (typed, migrations, transactions). Alternative: localForage if Dexie constraints arise.
- Object stores and keys:
  - settings: key 'settings'; values: theme, shortcuts, feature flags.
  - users: key deviceUserId; values: displayName, avatar, anonymizedId, optional publicKey.
  - decks: key deckId; values: metadata, counts, updatedAt.
  - cards: key cardId; indexes: deckId, dueAt; values: fields, mediaRefs[], scheduling, updatedAt.
  - reviews: key reviewId; indexes: cardId, reviewedAt; values: rating, interval, ease, lapses, elapsed.
  - media: key mediaHash; values: blob|opfsPointer, mimeType, byteLength, validationMeta, securityFlags.
  - achievements: key achievementId; index: userId; values: unlockedAt, progress.
  - challenges: key challengeId; values: config, progress.
  - leaderboardCache: key scope (e.g., 'monthly:global'); values: entries[], fetchedAt, ttlMs.
  - syncQueue: key queueId; values: opType, payload, createdAt, attemptCount, lastError.
- Media strategy:
  - Deduplicate by content hash (SHA-256). Store blob once, reference by hash from cards.
  - Generate object URLs on demand and revoke after use.
  - Prefer OPFS for files > X MB; keep pointer in media store.
- Security:
  - Optional encryption-at-rest via WebCrypto AES-GCM. User may enable passphrase-based key derivation (PBKDF2/Argon2) for the key.

Repository abstraction (storage provider layer)
- New data layer: client/src/data/
  - db.ts — Dexie DB init and versioned migrations.
  - providers/indexeddb/ — concrete IndexedDB operations (CRUD, queries).
  - repositories/ — deckRepo, cardRepo, reviewRepo, mediaRepo, gamificationRepo, leaderboardRepo (cache + optional network).
- Stores (Zustand) depend on repositories rather than server code:
  - deckStore.ts, authStore.ts, gamificationStore.ts, etc.

PWA and Service Worker updates
- Precache app shell and critical routes.
- Runtime caching strategies:
  - Static assets: cache-first or stale-while-revalidate.
  - External API (leaderboard): network-first with fallback to cache; cache with TTL.
- Background Sync:
  - Use syncQueue in IndexedDB; flush when online or via Background Sync/Periodic Sync where supported.
- VitePWA configuration extended in client/vite.config.ts; ensure service worker has handlers for leaderboard endpoints.

Optional online features
- Leaderboard:
  - Submit anonymized deviceUserId, score, time window; queue when offline.
  - Fetch leaderboards; cache results in leaderboardCache with TTL and manual refresh.
- Community interactions (future):
  - Optional challenges/sharing built similarly with local cache and queued submissions.
- Optional encrypted backup/restore (future):
  - Export/import encrypted bundles with merge rules.

App flows (offline-first)
- Import:
  - Use existing Anki pipeline, write decks/cards/media to IndexedDB/OPFS.
- Study and scheduling:
  - Use existing schedulers (FSRS/Anki/adaptive). Persist results via repositories.
- Gamification:
  - Local XP, streaks, achievements; optional submission to leaderboard when enabled.
- Authentication:
  - Default device-local profile; online identity only if user opts in.

Data migration and schema evolution
- First-run bootstrap initializes DB schema and settings.
- Versioned migrations in db.ts with deterministic transformations and test coverage.
- Migration path from any prior server-coupled state: optional one-time import from server, then switch to offline-first.

Media pipeline and quotas
- Continue to validate/sanitize media via existing workers.
- Track storage usage; warn near quota; offer purge and re-derive tools.
- Deduplicate media and lazy-load in UI; keep virtualization.

Security and privacy
- Maintain strict secure rendering/validation.
- Keep all data local unless user opts into online features.
- Provide clear disclosures in settings when enabling online features.

Configuration and feature flags
- Env flags default to offline-only; toggle to enable online features (leaderboard, community).
- Settings UI exposes these toggles and encryption-at-rest option.

Testing strategy
- Unit tests: repositories (CRUD, queries, migrations), crypto utilities, media helpers.
- Integration: import -> storage -> study -> review persistence offline; media pipeline E2E; background sync queue flush.
- Replace server-coupled tests with offline-first specs and mock leaderboard provider.
- Performance tests: study views render throughput and memory.

Telemetry and logging
- Structured logging for DB open/migrations, transaction failures, quota events.
- Media read/write timings; syncQueue lifecycle.
- Logs remain local by default; optional anonymous telemetry opt-in.

Rollout plan (phases)
- Phase 0: Foundation
  - Add data layer and Dexie DB; implement deck/card/review/media repositories.
  - Wire deck and study flows to repositories; keep behavior parity.
  - Basic tests for DB init and CRUD; add logging.
- Phase 1: Media storage + pipeline
  - Store media blobs; add OPFS fallback/selection; dedup by hash.
  - Integrate workers; add storage management UI (usage, purge, re-derive).
  - Tests: large deck import, media render, quota handling.
- Phase 2: PWA + background sync
  - Enhance service worker caching; implement syncQueue and flush logic.
  - Add leaderboardCache with TTL; tests for offline navigation and queued submits.
- Phase 3: Optional online features (leaderboard)
  - Implement leaderboard provider; settings toggles; wire UI.
  - Ensure best-effort submissions; cached fetch with fallback.
- Phase 4: Cleanup, docs, migration
  - Remove/isolate direct server usage in client; update docs; finalize tests.

Risks and mitigations
- Storage quotas: dedup, OPFS, storage management UI, streaming import.
- Low-end performance: batch writes, indexes, lazy media, virtualization.
- Partial writes: transactions, idempotent operations, journaling.
- Security regressions: strict validation and secure renderer blocks unsanitized content.

Acceptance criteria
- App fully usable offline; automated tests pass with network disabled.
- All data and media stored locally with dedup; storage management UI present.
- Leaderboard/community features optional and non-blocking.
- Service worker supports offline navigation and queued online ops.
- Performance remains within targets; docs updated.

Implementation notes (standards)
- Add tests for new features.
- Add structured logging in DB, media, sync paths.
- Keep README.md updated with offline-first usage and limits.

Detailed TODO checklists

Master checklist
- [x] Create client/src/data/ with db.ts and repositories.
- [-] Replace direct server calls in stores with repository calls.
- [-] Implement media blob storage with dedup and OPFS support.
- [ ] Enhance service worker and background sync queue.
- [ ] Implement optional leaderboard provider and cache.
- [ ] Add settings UI for online features and encryption.
- [-] Update tests to cover offline-first behavior.
- [-] Add structured logging and storage management UI.
- [ ] Update documentation (README, docs/*).

Phase 0: Foundation — TODO
- [x] Add Dexie and initialize DB (db.ts) with typed schema and version 1.
- [x] Implement repositories: deckRepo, cardRepo, reviewRepo, mediaRepo, gamificationRepo.
- [x] Add repository unit tests (CRUD, transactions, error cases).
- [-] Refactor deckStore.ts and study flows to use repositories.
- [-] Add logging for DB open/migration failures and transaction errors.

Phase 1: Media storage + pipeline — TODO
- [-] Implement content-hash dedup (SHA-256) for media.
- [-] Store blobs in IndexedDB; use OPFS for large files; maintain pointers.
- [ ] Integrate workers with new storage (read/write paths).
- [ ] Build storage management UI: usage meter, purge, re-derive.
- [ ] Add tests: large deck import, render, quota/eviction paths.

Phase 2: PWA + background sync — TODO
- [ ] Extend VitePWA config; ensure app-shell and runtime caching strategies.
- [ ] Implement syncQueue in IndexedDB; enqueue leaderboard submits when offline.
- [ ] Add Background Sync/Periodic Sync handlers to flush queue.
- [ ] Implement leaderboardCache with TTL and manual refresh.
- [ ] Tests: offline navigation; queued submits flushed on reconnect; cache fallback works.

Phase 3: Optional online features (leaderboard) — TODO
- [ ] Implement leaderboard provider (fetch/submit) with graceful failure handling.
- [ ] Add settings toggles to enable online features; persist choice.
- [ ] Wire LeaderboardPage and CommunityLeaderboard to provider + cache.
- [ ] Add tests: submit while offline -> queued -> flush; cache TTL invalidation.

Phase 4: Cleanup, docs, migration — TODO
- [ ] Isolate/remove client/src/lib/pocketbase.ts usage; keep adapter for legacy if needed.
- [ ] Migrate/disable server-dependent tests; remove fragile CI steps.
- [ ] Update README and docs with offline-first behavior, storage limits, privacy.
- [ ] Final performance and security review; sign-off.

File map (to create or modify)
- Create:
  - client/src/data/db.ts
  - client/src/data/providers/indexeddb/*
  - client/src/data/repositories/*
- Modify:
  - client/vite.config.ts (PWA settings)
  - client/src/stores/*.ts (wire repositories)
  - client/src/pages/* and client/src/components/* where persistence is touched
  - client/src/hooks/useAuth.ts (offline-first UX)
- Optional new:
  - client/src/components/settings/StorageManagement.tsx
  - client/src/components/settings/OnlineFeaturesToggle.tsx

Notes for developers
- Keep APIs pure and promise-based; wrap Dexie transactions in repos.
- Design repos to be easily swappable/mocked in tests.
- Never block the UI on network; show optimistic local state and background retries.
- Keep media rendering paths strictly using the secure renderer.

Appendix: Example Dexie schema (pseudo)
- db.version(1).stores({
  settings: 'id',
  users: 'deviceUserId',
  decks: 'deckId, updatedAt',
  cards: 'cardId, deckId, dueAt, updatedAt',
  reviews: 'reviewId, cardId, reviewedAt',
  media: 'mediaHash',
  achievements: 'achievementId, userId',
  challenges: 'challengeId',
  leaderboardCache: 'scope, fetchedAt',
  syncQueue: 'queueId, createdAt'
});