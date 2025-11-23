import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { resetDBForTests, ensureDBOpen } from '../../data/db';
import { useAuthStore } from '../../stores/authStore';
import { setOnlineLeaderboardEnabled } from '../../config/featureFlags';
import { linkAccount, unlinkAccount, isLinked } from '../../services/onlineLinkService';
import LeaderboardPage from '../../pages/LeaderboardPage';
import { getLeaderboardService } from '../../services/leaderboard';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

describe('Online link: connect → submit → disconnect', () => {
  beforeEach(async () => {
    await resetDBForTests();
    await ensureDBOpen();
    setOnlineLeaderboardEnabled(false);

    useAuthStore.setState({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    } as any);
    await useAuthStore.getState().initializeAuth();

    vi.restoreAllMocks();
  });

  it('enables online, links account, submits score, then disconnects', async () => {
    // Enable online leaderboards
    setOnlineLeaderboardEnabled(true);

    // Link account
    const user = useAuthStore.getState().user!;
    await linkAccount({
      deviceUserId: user.id,
      provider: 'studymaster',
      serverUserId: 'srv-user-conn',
      accessToken: 'access-123'
    });

    // Verify linked
    expect(await isLinked(user.id, 'studymaster')).toBe(true);

    // Mock GET /api/leaderboard and POST /api/leaderboard/submit
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/leaderboard/submit') && init?.method === 'POST') {
        return Promise.resolve(new Response('ok', { status: 200 }));
      }
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

    render(<LeaderboardPage />, { wrapper: Wrapper });

    // When enabled+linked, the category header renders
    await waitFor(() => {
      expect(screen.getByText(/Leaderboard Category/i)).toBeTruthy();
    });

    // Submit a score via the provider
    const svc = getLeaderboardService();
    await svc.submit({ ...(user as any), token: 'access-123', tokenType: 'real' }, 'global', 456);

    // Assert a POST was made to submit endpoint
    const submitCalls = fetchSpy.mock.calls.filter(([req, init]) =>
      String(req).includes('/api/leaderboard/submit') && (init as RequestInit)?.method === 'POST'
    );
    expect(submitCalls.length).toBeGreaterThan(0);

    // Disconnect
    await unlinkAccount(user.id, 'studymaster');
    expect(await isLinked(user.id, 'studymaster')).toBe(false);
  });
});