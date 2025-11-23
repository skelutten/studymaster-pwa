import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetDBForTests } from '../../data/db';
import { useAuthStore } from '../authStore';
import pb from '../../lib/pocketbase';

describe('authStore - local bootstrap without remote session', () => {
  beforeEach(async () => {
    await resetDBForTests();
    // Reset zustand store to a clean state
    useAuthStore.setState({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      // Methods exist on the store, no need to mock here
    } as any);

    // Ensure PocketBase authStore appears invalid/no session
    // @ts-expect-error test override
    pb.authStore.isValid = false;
    // @ts-expect-error test override
    pb.authStore.model = undefined;
  });

  it('initializeAuth() creates a local-only profile and authenticates without a server', async () => {
    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.session).toBeNull();
    expect(state.user).not.toBeNull();

    // Local profile defaults
    expect(state.user?.email).toBe('local@device');
    expect(typeof state.user?.id).toBe('string');
    expect(state.user?.username).toBeTruthy();
    expect(state.user?.preferences?.theme).toBeTruthy();
  });
});