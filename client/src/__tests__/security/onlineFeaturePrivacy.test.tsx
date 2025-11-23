import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { resetDBForTests, ensureDBOpen } from '../../data/db';
import { useAuthStore } from '../../stores/authStore';
import { setOnlineLeaderboardEnabled } from '../../config/featureFlags';
import { linkAccount } from '../../services/onlineLinkService';
import LeaderboardPage from '../../pages/LeaderboardPage';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

describe('Online Feature Privacy & Gating', () => {
  beforeEach(async () => {
    await resetDBForTests();
    await ensureDBOpen();

    // Reset feature flag
    setOnlineLeaderboardEnabled(false);

    // Reset auth store to a local-only profile
    useAuthStore.setState({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    } as any);
    await useAuthStore.getState().initializeAuth();

    // Clear localStorage, but keep our feature flag reader logic consistent
    localStorage.clear();

    // Reset fetch spy
    vi.restoreAllMocks();
  });

  it('does not call /api when online features are disabled', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    render(<LeaderboardPage />, { wrapper: Wrapper });

    // Renders the disabled CTA; no network calls expected
    await waitFor(() => {
      expect(screen.getByText(/Online leaderboards are disabled/i)).toBeTruthy();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not call /api when enabled but not linked', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    // Enable the feature flag only
    setOnlineLeaderboardEnabled(true);

    render(<LeaderboardPage />, { wrapper: Wrapper });

    // Still gated because account is not linked
    await waitFor(() => {
      expect(screen.getByText(/Online leaderboards are disabled/i)).toBeTruthy();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('calls /api only when enabled and linked', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/leaderboard') && (!init || init.method === 'GET' || !init.method)) {
        return Promise.resolve(new Response(JSON.stringify({
          global: [],
          friends: [],
          weekly: [],
          monthly: []
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return Promise.resolve(new Response('ok', { status: 200 }));
    });

    // Enable and link
    setOnlineLeaderboardEnabled(true);
    const user = useAuthStore.getState().user!;
    await linkAccount({
      deviceUserId: user.id,
      provider: 'studymaster',
      serverUserId: 'srv-user',
      accessToken: 'tok-123'
    });

    render(<LeaderboardPage />, { wrapper: Wrapper });

    // When enabled+linked, list loads and network is used
    await waitFor(() => {
      expect(screen.getByText(/Leaderboard Category/i)).toBeTruthy();
    });

    expect(fetchSpy).toHaveBeenCalled();
  });
});

describe('Token storage policy', () => {
  beforeEach(async () => {
    await resetDBForTests();
    await ensureDBOpen();
    useAuthStore.setState({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    } as any);
    await useAuthStore.getState().initializeAuth();
    localStorage.clear();
  });

  it('stores tokens only in IndexedDB via userOnlineLinks; not in localStorage or cookies', async () => {
    // Link an account
    const user = useAuthStore.getState().user!;
    await (await import('../../services/onlineLinkService')).linkAccount({
      deviceUserId: user.id,
      provider: 'studymaster',
      serverUserId: 'srv-abc',
      accessToken: 'access-xyz',
      refreshToken: 'refresh-uvw'
    });

    // Verify localStorage contains only feature flag keys (if any)
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) keys.push(k);
    }

    // Allowed keys (feature flags)
    const allowedKeys = new Set(['sm.onlineLeaderboardEnabled', 'sm.encryptionEnabled']);

    // No token-like keys in localStorage
    const tokenLikeKeys = keys.filter(k => /token|access|refresh|auth/i.test(k)).filter(k => !allowedKeys.has(k));
    expect(tokenLikeKeys.length).toBe(0);

    // No token-like values in localStorage values either
    const tokenLikeValues = keys
      .map(k => localStorage.getItem(k) || '')
      .filter(v => /access|refresh|token|bearer/i.test(v));
    expect(tokenLikeValues.length).toBe(0);

    // Cookies should not contain tokens
    expect(document.cookie).not.toMatch(/token|access|refresh/i);

    // IndexedDB should hold the link (implicit verification through helper)
    const { repos } = await import('../../data');
    const rows = await repos.userOnlineLinks.listByDevice(user.id);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].accessToken).toBe('access-xyz');
  });
});