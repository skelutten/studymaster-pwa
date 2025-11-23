/**
* ESM-friendly TS shim for tests importing '../../stores/authStore' relative to services/anki/__tests__
* Provides a minimal mockable interface compatible with Vitest. Tests can vi.mock this module path.
* Default state is authenticated to avoid unrelated tests failing due to auth gating.
*/
export const useAuthStore = {
 getState: () => ({
   isAuthenticated: true,
   user: { id: 'user-123', username: 'testuser' },
 }),
};