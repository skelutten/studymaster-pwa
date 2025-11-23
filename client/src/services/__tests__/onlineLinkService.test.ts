import { describe, it, expect, beforeEach } from 'vitest';
import { resetDBForTests } from '../../data/db';
import {
  linkAccount,
  unlinkAccount,
  getLink,
  listLinks,
  isLinked,
  getAccessToken,
  getRefreshToken,
  type Provider,
} from '../onlineLinkService';

describe('onlineLinkService', () => {
  const deviceUserId = 'test-device-user';
  const provider: Provider = 'studymaster';
  const serverUserId = 'srv-12345';
  const accessToken = 'access-abc';
  const refreshToken = 'refresh-xyz';

  beforeEach(async () => {
    await resetDBForTests();
  });

  it('links an online account and can read it back', async () => {
    const row = await linkAccount({
      deviceUserId,
      provider,
      serverUserId,
      accessToken,
      refreshToken,
      scopes: ['leaderboard:read', 'leaderboard:write'],
      meta: { env: 'test' },
    });

    expect(row.linkKey).toBe(`${deviceUserId}:${provider}`);
    expect(row.deviceUserId).toBe(deviceUserId);
    expect(row.provider).toBe(provider);
    expect(row.serverUserId).toBe(serverUserId);
    expect(row.accessToken).toBe(accessToken);
    expect(row.refreshToken).toBe(refreshToken);

    const fetched = await getLink(deviceUserId, provider);
    expect(fetched).not.toBeNull();
    expect(fetched?.accessToken).toBe(accessToken);
  });

  it('reports isLinked true only when link exists and has tokens', async () => {
    expect(await isLinked(deviceUserId, provider)).toBe(false);

    await linkAccount({
      deviceUserId,
      provider,
      serverUserId,
      accessToken,
    });

    expect(await isLinked(deviceUserId, provider)).toBe(true);
  });

  it('lists links per device user', async () => {
    await linkAccount({
      deviceUserId,
      provider: 'studymaster',
      serverUserId: 'srv-a',
      accessToken: 'tok-a',
    });
    await linkAccount({
      deviceUserId,
      provider: 'custom',
      serverUserId: 'srv-b',
      accessToken: 'tok-b',
      scopes: ['read'],
    });

    const all = await listLinks(deviceUserId);
    const providers = all.map((l) => l.provider).sort();
    expect(all.length).toBe(2);
    expect(providers).toEqual(['custom', 'studymaster']);
  });

  it('returns access/refresh tokens helpers', async () => {
    await linkAccount({
      deviceUserId,
      provider,
      serverUserId,
      accessToken,
      refreshToken,
    });

    expect(await getAccessToken(deviceUserId, provider)).toBe(accessToken);
    expect(await getRefreshToken(deviceUserId, provider)).toBe(refreshToken);
  });

  it('unlinks an account', async () => {
    await linkAccount({
      deviceUserId,
      provider,
      serverUserId,
      accessToken,
    });

    expect(await isLinked(deviceUserId, provider)).toBe(true);

    await unlinkAccount(deviceUserId, provider);

    expect(await isLinked(deviceUserId, provider)).toBe(false);
    const row = await getLink(deviceUserId, provider);
    expect(row).toBeNull();
  });
});