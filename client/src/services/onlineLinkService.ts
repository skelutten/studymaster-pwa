/**
 * onlineLinkService
 * - Manages optional server link for a local profile (deviceUserId)
 * - Stores tokens and serverUserId in IndexedDB (userOnlineLinks)
 * - No network dependency for unlink operations
 *
 * Repos: repos.userOnlineLinks
 */

import { repos } from '../data';

export type Provider = 'studymaster' | 'custom';

export interface LinkInput {
  deviceUserId: string;
  provider: Provider;
  serverUserId: string;
  accessToken: string;
  refreshToken?: string;
  scopes?: string[];
  meta?: Record<string, unknown>;
  lastLinkedAt?: number;
}

export interface OnlineLinkInfo {
  linkKey: string;
  deviceUserId: string;
  provider: Provider;
  serverUserId: string;
  accessToken: string;
  refreshToken?: string;
  scopes?: string[];
  lastLinkedAt: number;
  meta?: Record<string, unknown>;
}

function toLinkKey(deviceUserId: string, provider: Provider): string {
  return `${deviceUserId}:${provider}`;
}

/**
 * Create or update a link for a local profile
 */
export async function linkAccount(input: LinkInput): Promise<OnlineLinkInfo> {
  const row = await repos.userOnlineLinks.upsert({
    deviceUserId: input.deviceUserId,
    provider: input.provider,
    serverUserId: input.serverUserId,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    scopes: input.scopes,
    meta: input.meta,
    lastLinkedAt: input.lastLinkedAt,
  });
  return row;
}

/**
 * Remove link for a local profile (by deviceUserId + provider)
 */
export async function unlinkAccount(deviceUserId: string, provider: Provider): Promise<void> {
  const linkKey = toLinkKey(deviceUserId, provider);
  await repos.userOnlineLinks.remove(linkKey);
}

/**
 * Get link info for a local profile (by deviceUserId + provider)
 */
export async function getLink(deviceUserId: string, provider: Provider): Promise<OnlineLinkInfo | null> {
  const linkKey = toLinkKey(deviceUserId, provider);
  return repos.userOnlineLinks.get(linkKey);
}

/**
 * List all links for a local profile (multi-provider support)
 */
export async function listLinks(deviceUserId: string): Promise<OnlineLinkInfo[]> {
  return repos.userOnlineLinks.listByDevice(deviceUserId);
}

/**
 * Returns true if the profile is linked with the given provider
 */
export async function isLinked(deviceUserId: string, provider: Provider): Promise<boolean> {
  const row = await getLink(deviceUserId, provider);
  return !!row?.accessToken && !!row?.serverUserId;
}

/**
 * Access token helper
 */
export async function getAccessToken(deviceUserId: string, provider: Provider): Promise<string | null> {
  const row = await getLink(deviceUserId, provider);
  return row?.accessToken ?? null;
}

/**
 * Refresh token helper (for future extension)
 */
export async function getRefreshToken(deviceUserId: string, provider: Provider): Promise<string | null> {
  const row = await getLink(deviceUserId, provider);
  return row?.refreshToken ?? null;
}