// Client-side feature flags with localStorage persistence
// Defaults: offline-first (online leaderboard disabled), encryption disabled, remote auth disabled

type BoolFlag =
  | 'sm.onlineLeaderboardEnabled'
  | 'sm.encryptionEnabled'
  | 'sm.remoteAuthEnabled';

function readBool(key: BoolFlag, defaultValue: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return defaultValue;
    return v === 'true';
  } catch {
    return defaultValue;
  }
}

function writeBool(key: BoolFlag, value: boolean): void {
  try {
    localStorage.setItem(key, value ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export function isOnlineLeaderboardEnabled(): boolean {
  // Default to false (offline-first)
  return readBool('sm.onlineLeaderboardEnabled', false);
}

export function setOnlineLeaderboardEnabled(enabled: boolean): void {
  writeBool('sm.onlineLeaderboardEnabled', enabled);
  // Expose a global for non-React consumers (e.g., providers)
  (window as any).__LEADERBOARD_ONLINE_ENABLED = enabled;
}

export function isEncryptionEnabled(): boolean {
  // Default to false
  return readBool('sm.encryptionEnabled', false);
}

export function setEncryptionEnabled(enabled: boolean): void {
  writeBool('sm.encryptionEnabled', enabled);
}

// Remote auth flag: when false (default), login/register should be local-only
export function isRemoteAuthEnabled(): boolean {
  // Gate with env first: if VITE_REMOTE_AUTH_ENABLED !== 'true', force disabled regardless of localStorage
  const envFlag = String((import.meta as any).env?.VITE_REMOTE_AUTH_ENABLED ?? 'false') === 'true';
  if (!envFlag) return false;
  return readBool('sm.remoteAuthEnabled', false);
}

export function setRemoteAuthEnabled(enabled: boolean): void {
  writeBool('sm.remoteAuthEnabled', enabled);
  (window as any).__REMOTE_AUTH_ENABLED = enabled;
}

// Initialize globals at module import
(function bootstrapGlobals() {
  (window as any).__LEADERBOARD_ONLINE_ENABLED = isOnlineLeaderboardEnabled();
  (window as any).__REMOTE_AUTH_ENABLED = isRemoteAuthEnabled();
})();