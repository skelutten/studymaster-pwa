# Local Accounts Plan — Offline-First User Identity with Optional Server Link

Status: Draft (implementation-ready plan)

Objective
- Provide a robust local-only account system that requires no server.
- Allow users to optionally “Connect online” later for leaderboards and community features, without disrupting the local profile or making it a requirement.
- Preserve privacy by default; keep PII minimal and local unless the user explicitly opts in.

Scope
- Local profile creation and lifecycle (default path).
- Optional server link/unlink flow (opt-in).
- Storage, keys, privacy, and security best practices.
- UX, migration, testing, rollout.

Non-goals (for now)
- Multi-device real-time sync.
- External identity federation (OAuth) beyond simple token-based “connect online” for leaderboard.

Related files (current)
- Data layer and schema: [client/src/data/db.ts](client/src/data/db.ts), [client/src/data/repositories/index.ts](client/src/data/repositories/index.ts)
- Auth and user stores/hooks: [client/src/stores/authStore.ts](client/src/stores/authStore.ts), [client/src/hooks/useAuth.ts](client/src/hooks/useAuth.ts)
- Feature flags: [client/src/config/featureFlags.ts](client/src/config/featureFlags.ts)
- Readme and migration docs: [README.md](README.md), [docs/client-only-migration-plan.md](docs/client-only-migration-plan.md)
- Leaderboard provider (optional server): [client/src/services/leaderboard.ts](client/src/services/leaderboard.ts)

1) Goals and Requirements

1. Local-first identity
- Create a device-local user on first run, no network or server required.
- Use a stable deviceUserId (uuid v4) stored in IndexedDB, with a derived anonymizedId for public contexts (e.g., local analytics and optional future upload).
- Store only minimum PII locally (displayName, avatar optional).

2. Optional server link
- Users can opt in to connect to the server for leaderboards and community.
- Linking should store only the necessary tokens; unlinking removes them but keeps local data intact.
- Online features are non-blocking; app remains fully usable offline.

3. Privacy and security
- No PII is sent unless the user opts in.
- Store tokens and sensitive data in IndexedDB; allow optional local encryption-at-rest using WebCrypto with a user passphrase (optional feature).
- Adhere to least privilege and explicit disclosures (UX copy).

4. Portability
- Provide Export/Import for local profiles and data (encrypted export recommended).

2) Architecture Overview

- Local profile is the primary identity, persisted in IndexedDB. No server needed.
- Local profile schema extends users row in Dexie: deviceUserId, displayName, avatar, anonymizedId, createdAt, updatedAt, and optional keys (publicKeyJwk, encryptedPrivateKey).
- Optional server link stores online tokens and serverUserId in a separate secure record keyed to the local profile, enabling online features (e.g., leaderboard submit/fetch).
- Feature flags allow toggling online features globally and per-profile: [client/src/config/featureFlags.ts](client/src/config/featureFlags.ts)

3) Data Model (IndexedDB)

Existing users row (in [client/src/data/db.ts](client/src/data/db.ts)):
- deviceUserId (string)
- displayName (string?)
- avatarUrl (string?)
- anonymizedId (string?)
- createdAt, updatedAt
- publicKeyJwk (JsonWebKey? reserved)

Enhancements (backward-compatible):
- users table:
  - fields (optional, nullable):
    - publicKeyJwk: JsonWebKey (ECDSA P-256 public key) for future signature/backup features
    - encryptedPrivateKey: JWE-like blob for private key when encryption-at-rest is enabled
    - profileVersion: number (for migration)
- userOnlineLinks table (new store) – optional:
  - deviceUserId (string, FK to users)
  - serverUserId (string)
  - provider: 'studymaster' | 'custom'
  - accessToken: string (stored in IndexedDB, optionally wrapped)
  - refreshToken?: string (optional)
  - lastLinkedAt: number
  - scopes?: string[]
  - encryption: { wrapped: boolean } (metadata)

Schema extension suggestion:
- Add new table “userOnlineLinks”:
  - key: `${deviceUserId}:${provider}`
  - indexes: deviceUserId, provider

4) Identity, Keys, and Anonymization

- deviceUserId: uuid v4 generated on first run; persisted in IndexedDB users row.
- anonymizedId: Base64URL(SHA-256(deviceUserId || creationTimestamp || salt)); used in local caches and optional uploads to reduce PII leakage.
- Keys (optional, reserved):
  - Generate ECDSA (P-256) key pair using WebCrypto subtle.generateKey when the user enables encryption/backup features. Store publicKeyJwk; wrap private key with a KEK derived from passphrase (PBKDF2) and store as encryptedPrivateKey.
  - This is optional and staged for backup/signature workflows; not mandatory to ship initial local-only accounts.

Best practices:
- Prefer P-256 (widely supported) for signatures if needed later.
- Use AES-GCM for content encryption if local encryption is enabled.
- Salt and iteration counts for PBKDF2; store salt and parameters in settings.

5) Optional Server Link Flow

Requirements:
- The app must work entirely offline without this step.
- Linking must be explicitly initiated by the user.

Flow:
1. User opens Profile or Settings, sees “Online features” card with a “Connect online” button.
2. Clicking prompts consent + privacy notice; user proceeds to login with server (email/password or magic link).
3. On success, app stores:
   - serverUserId
   - accessToken (and refreshToken if applicable)
   - provider='studymaster'
4. Feature flags are set/enabled for online features (e.g., online leaderboard). The UI refreshes to reflect connected state.

Unlink:
- From the same card, “Disconnect online account” removes tokens and serverUserId from userOnlineLinks.
- Local profile remains intact, with all decks, cards, progress, and media.

Fallback behavior:
- If the server is unreachable, UI shows online features as “Not connected” and keeps app functional offline.

6) UX and Settings

Settings UI changes:
- Profile page ([client/src/pages/ProfilePage.tsx](client/src/pages/ProfilePage.tsx)) or central settings panel:
  - Section: “Account”
    - Local Profile: deviceUserId (masked), displayName, avatar (optional), anonymizedId (read-only), Export/Import buttons.
    - Online features: “Connect online” (if not linked), “Disconnect” (if linked), status indicator (Connected as <username>).
  - Privacy note: “By default, StudyMaster keeps all your data on your device. Online features are optional.”
- Feature toggles:
  - Online leaderboards: show toggle (disabled until linked).
  - Encryption-at-rest: optional toggle that triggers passphrase creation and key generation (staged feature).

Consent copy (example):
- “Connecting online enables leaderboards and other community features. Your display name and anonymized identifier may be sent to our servers. You can disconnect anytime.”

7) Policy for Leaderboards with Local Accounts

- If not linked: hide or gray out leaderboard submission UI. Show a “Connect online to participate” CTA.
- If linked: use [client/src/services/leaderboard.ts](client/src/services/leaderboard.ts) with tokens stored in userOnlineLinks. Queued submissions work offline and flush later.
- Privacy: only send minimal fields (anonymizedId, displayName or username, score, scope); avoid sending emails.

8) Security & Privacy Best Practices

- Store tokens and sensitive data in IndexedDB, not localStorage or sessionStorage.
- Use same-origin and CSP. Avoid third-party iframes for auth in PWA.
- Provide an “Erase Online Tokens” button on unlink; consider a “wipe” function for local account if user wants fresh start.
- Optional encryption-at-rest:
  - If enabled, derive KEK from passphrase via PBKDF2 (SHA-256, ≥100k iterations; tune per perf budget).
  - Wrap access tokens if needed; primarily wrap private keys if used for backups.
- Avoid device fingerprinting; do not tie identity to hardware properties.

9) Export / Import (Portability)

- Export:
  - Export local profile + data (decks, cards, reviews, media manifests) as an encrypted archive (ZIP + content JSON; encrypt JSON and optionally media chunks).
  - Exclude online tokens by default; include only when user explicitly selects “Include online session tokens” and warn.

- Import:
  - Merge logic: if importing into an existing profile, offer to create a new local profile or merge data. Provide conflict UI if needed (advanced).
  - Validate data integrity; verify archive signature if keys are used.

10) Store & Service API Changes

New/updated services (proposed):
- localProfileService (new): create/load/update local profile.
  - Path: [client/src/services/localProfileService.ts](client/src/services/localProfileService.ts) (to be created)
  - Responsible for deviceUserId generation, anonymizedId derivation, displayName/avatar updates, and (optional) key generation.

- onlineLinkService (new): link/unlink server account for a given deviceUserId.
  - Path: [client/src/services/onlineLinkService.ts](client/src/services/onlineLinkService.ts) (to be created)
  - Stores/retrieves tokens from userOnlineLinks; provides linked status; manages refresh if supported by API.

- authStore updates:
  - [client/src/stores/authStore.ts](client/src/stores/authStore.ts)
  - Ensure store loads the local profile on boot; exposes linked status and tokens via selectors.

- hooks:
  - [client/src/hooks/useAuth.ts](client/src/hooks/useAuth.ts) extended with link/unlink helpers for UI.

11) Feature Flags and Config

- Feature flags module exists: [client/src/config/featureFlags.ts](client/src/config/featureFlags.ts)
- Add getters/setters for:
  - Online leaderboards enablement (already available).
  - Future encryption-at-rest enablement.

12) Testing Strategy

Unit tests:
- localProfileService: creation, load, update; anonymizedId derivation.
- onlineLinkService: link/unlink, token persistence; no network dependency for unlink.

Integration tests:
- First run -> local profile created -> study offline.
- Connect online -> submit leaderboard -> disconnect -> app still works offline.
- Export local data -> import into fresh profile.

Security tests:
- Ensure tokens are not exposed in localStorage.
- Verify no PII is sent unless linked (mock fetch asserts payload fields).

13) Migration

- On first launch after upgrade:
  - If no local profile exists: create one (deviceUserId + anonymizedId).
  - If prior server-only identity existed in client: migrate to local profile; store server tokens in userOnlineLinks.
- Schema migration:
  - Add “userOnlineLinks” Dexie table in [client/src/data/db.ts](client/src/data/db.ts) v3 (if needed; or reuse existing structures if appropriate).

14) Rollout

- Phase A (Local identity):
  - Implement localProfileService + authStore wiring.
  - Add Profile/Settings UI entries for local account.
  - Add export/import prototype (JSON export first).

- Phase B (Optional link):
  - Implement onlineLinkService and UI flows.
  - Wire leaderboard to use linked credentials when present; keep queue when offline.

- Phase C (Hardening):
  - Add encryption-at-rest (optional).
  - Add complete export (ZIP + optional encryption).
  - Finalize docs and tests.

15) UX Copy (Examples)

- Local profile created: “You’re set! Your StudyMaster profile is stored securely on this device.”
- Online features CTA: “Connect online to join leaderboards. You can disconnect anytime.”
- Disconnect confirm: “Disconnecting removes online access but keeps your local data and progress.”

16) Risks and Mitigations

- Token leakage: Keep in IndexedDB; optional local encryption; never log tokens.
- Identity confusion: Always show current status (Local only vs Connected).
- User confusion exporting/importing: Provide clear guidance; default to safe behavior (no tokens).

17) Deliverables Checklist

- [x] Define/extend Dexie schema for userOnlineLinks in [client/src/data/db.ts](client/src/data/db.ts)
- [x] Implement localProfileService in [client/src/services/localProfileService.ts](client/src/services/localProfileService.ts)
- [x] Implement onlineLinkService in [client/src/services/onlineLinkService.ts](client/src/services/onlineLinkService.ts)
- [ ] Update [client/src/stores/authStore.ts](client/src/stores/authStore.ts) to load local profile by default
- [ ] Extend [client/src/hooks/useAuth.ts](client/src/hooks/useAuth.ts) with link/unlink helpers
- [ ] Add “Account” section to Profile/Settings page (local info + connect/disconnect)
- [ ] Leaderboard integration respects linked/unlinked state (already supported via provider)
- [ ] Export/Import MVP (JSON export, import merge/new profile)
- [ ] Unit and integration tests per testing strategy
- [ ] Documentation updates: add summary to [README.md](README.md), link to this plan

---

## 18) Execution Tasks & Status

- [x] Add Dexie v3 migration for userOnlineLinks table and types in [client/src/data/db.ts](client/src/data/db.ts)
- [x] Add repositories for userOnlineLinks in [client/src/data/repositories/index.ts](client/src/data/repositories/index.ts)
- [x] Implement localProfileService (create/load/update device user; anonymizedId derivation) in [client/src/services/localProfileService.ts](client/src/services/localProfileService.ts)
- [x] Implement onlineLinkService (link/unlink; token persistence) in [client/src/services/onlineLinkService.ts](client/src/services/onlineLinkService.ts)
- [ ] Update [client/src/stores/authStore.ts](client/src/stores/authStore.ts) to bootstrap local profile on app start
- [ ] Extend [client/src/hooks/useAuth.ts](client/src/hooks/useAuth.ts) with connectOnline/disconnectOnline helpers
- [ ] UI: Add Account section to Settings/Profile with connect/disconnect, status, and privacy copy
- [ ] Ensure leaderboard provider respects linked/unlinked state (CTA when unlinked)
- [ ] Export/Import MVP (JSON export/import) for local profile and data
- [ ] Tests:
  - [ ] Unit: localProfileService, onlineLinkService
  - [ ] Integration: first-run creates local profile; connect→submit→disconnect flow; export/import roundtrip
  - [ ] Security: tokens never in localStorage; no PII sent unless linked
- [ ] Docs: Update README with local accounts summary and link to this plan

Next action (current step): Update authStore to bootstrap local profile on app start, then extend useAuth with connectOnline/disconnectOnline helpers and add Account UI section.

References and Best Practices
- Offline-first identity: local UUID + anonymizedId; avoid hardware fingerprinting
- Sensitive data storage: IndexedDB; WebCrypto for optional encryption (AES-GCM + PBKDF2)
- Clear consent and reversibility for online features (unlink path)
- Data portability: encrypted export/import
- Zero-trust defaults: no PII sent unless user opts in; minimize payloads for online calls

Appendix: Minimal Data Examples (Conceptual)
- Local user (users row): 
  - { deviceUserId: 'uuid-v4', displayName: 'You', avatarUrl?: 'blob:', anonymizedId: 'b64url_hash', createdAt, updatedAt, publicKeyJwk?, encryptedPrivateKey? }
- Online link (userOnlineLinks row):
  - { deviceUserId: 'uuid-v4', provider: 'studymaster', serverUserId: 'srv-123', accessToken: '...', refreshToken?: '...', lastLinkedAt: 1712345678901, scopes?: ['leaderboard:write'] }
