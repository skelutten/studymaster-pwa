import { describe, it, expect, beforeEach } from 'vitest';
import { resetDBForTests } from '../../data/db';
import {
  ensureLocalProfile,
  getLocalProfile,
  updateLocalProfile,
  getAnonymizedId,
  deriveAnonymizedId,
  type LocalProfile,
} from '../localProfileService';

describe('localProfileService', () => {
  beforeEach(async () => {
    await resetDBForTests();
  });

  it('creates a local profile once and returns the same profile subsequently', async () => {
    const p1 = await ensureLocalProfile();
    const p2 = await ensureLocalProfile();

    expect(p1.deviceUserId).toBeTruthy();
    expect(p2.deviceUserId).toBe(p1.deviceUserId);
    expect(p1.anonymizedId).toBeTruthy();
    expect(typeof p1.createdAt).toBe('number');
    expect(typeof p1.updatedAt).toBe('number');
  });

  it('getLocalProfile returns the existing profile or null when none created', async () => {
    let existing = await getLocalProfile();
    // After reset there is no profile
    expect(existing).toBeNull();

    await ensureLocalProfile();
    existing = await getLocalProfile();
    expect(existing).not.toBeNull();
    expect(existing?.deviceUserId).toBeTruthy();
  });

  it('updateLocalProfile modifies displayName and avatarUrl and updates updatedAt', async () => {
    const p1 = await ensureLocalProfile();
    const updated = await updateLocalProfile({ displayName: 'Alice', avatarUrl: 'https://example.com/a.png' });

    expect(updated.deviceUserId).toBe(p1.deviceUserId);
    expect(updated.displayName).toBe('Alice');
    expect(updated.avatarUrl).toBe('https://example.com/a.png');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(p1.updatedAt);
  });

  it('anonymizedId is stable for the same deviceUserId and createdAt', async () => {
    const p = await ensureLocalProfile();
    // Re-derive
    const rederived = await deriveAnonymizedId(p.deviceUserId, p.createdAt);
    expect(rederived).toBe(p.anonymizedId);
  });

  it('getAnonymizedId returns the same value as the profile anonymizedId', async () => {
    const p = await ensureLocalProfile();
    const anon = await getAnonymizedId();
    expect(anon).toBe(p.anonymizedId);
  });
});