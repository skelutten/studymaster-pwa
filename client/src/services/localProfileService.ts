/**
 * Local Profile Service
 * - Creates/loads/updates a device-local user profile (no server required)
 * - Derives an anonymizedId for public contexts
 * - Stores profile in IndexedDB (Dexie users table)
 *
 * Schema source: client/src/data/db.ts (UserRow)
 */

import db, { ensureDBOpen, type UserRow } from '../data/db';

export type LocalProfile = {
  deviceUserId: string;
  displayName?: string;
  avatarUrl?: string;
  anonymizedId: string;
  createdAt: number;
  updatedAt: number;
};

function hasSubtleCrypto(): boolean {
  try {
    return typeof crypto !== 'undefined' && !!(crypto as any).subtle?.digest;
  } catch {
    return false;
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  // btoa is available in browsers; in tests it might be polyfilled
  const b64 = typeof btoa !== 'undefined' ? btoa(str) : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Derive a stable anonymizedId from deviceUserId and createdAt
 * - Uses SHA-256 when available; falls back to a simple base64url of the input
 */
export async function deriveAnonymizedId(deviceUserId: string, createdAt: number): Promise<string> {
  const input = new TextEncoder().encode(`${deviceUserId}:${createdAt}`);
  if (hasSubtleCrypto()) {
    try {
      const digest = await (crypto as any).subtle.digest('SHA-256', input);
      return toBase64Url(new Uint8Array(digest));
    } catch {
      // fallthrough to fallback
    }
  }
  // Fallback: base64url of the input (non-cryptographic)
  return toBase64Url(input);
}

function uuidv4(): string {
  if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }
  // RFC4122-ish fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Create a new local profile
 */
async function createLocalProfileInternal(displayName?: string, avatarUrl?: string): Promise<LocalProfile> {
  await ensureDBOpen();
  const deviceUserId = uuidv4();
  const now = Date.now();
  const anonymizedId = await deriveAnonymizedId(deviceUserId, now);

  const row: UserRow = {
    deviceUserId,
    displayName,
    avatarUrl,
    anonymizedId,
    createdAt: now,
    updatedAt: now,
  };
  await db.users.add(row);
  return {
    deviceUserId: row.deviceUserId,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    anonymizedId: row.anonymizedId || anonymizedId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Get the first local profile if present (single profile model), else null
 */
export async function getLocalProfile(): Promise<LocalProfile | null> {
  await ensureDBOpen();
  const any = await db.users.toCollection().first();
  if (!any) return null;
  return {
    deviceUserId: any.deviceUserId,
    displayName: any.displayName,
    avatarUrl: any.avatarUrl,
    anonymizedId: any.anonymizedId || (await deriveAnonymizedId(any.deviceUserId, any.createdAt)),
    createdAt: any.createdAt,
    updatedAt: any.updatedAt,
  };
}

/**
 * Ensure a local profile exists and return it
 */
export async function ensureLocalProfile(displayName?: string, avatarUrl?: string): Promise<LocalProfile> {
  const existing = await getLocalProfile();
  if (existing) return existing;
  return createLocalProfileInternal(displayName, avatarUrl);
}

/**
 * Update local profile fields
 */
export async function updateLocalProfile(patch: Partial<Pick<LocalProfile, 'displayName' | 'avatarUrl'>>): Promise<LocalProfile> {
  await ensureDBOpen();
  const existing = await db.users.toCollection().first();
  if (!existing) {
    // If no profile exists, create one with requested fields
    return createLocalProfileInternal(patch.displayName, patch.avatarUrl);
  }
  const updated: UserRow = {
    ...existing,
    displayName: patch.displayName ?? existing.displayName,
    avatarUrl: patch.avatarUrl ?? existing.avatarUrl,
    updatedAt: Date.now(),
  };
  await db.users.put(updated);
  return {
    deviceUserId: updated.deviceUserId,
    displayName: updated.displayName,
    avatarUrl: updated.avatarUrl,
    anonymizedId: updated.anonymizedId || (await deriveAnonymizedId(updated.deviceUserId, updated.createdAt)),
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Utility to read just the anonymizedId (derives it if missing)
 */
export async function getAnonymizedId(): Promise<string> {
  const profile = await ensureLocalProfile();
  return profile.anonymizedId || (await deriveAnonymizedId(profile.deviceUserId, profile.createdAt));
}