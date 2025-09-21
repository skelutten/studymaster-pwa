/**
 * ESM-friendly shim for tests requiring('../../stores/authStore') relative to services/anki/__tests__
 * Provides a minimal mockable interface compatible with Vite/Vitest ESM environment ("type": "module").
 * Vitest vi.mock(...) in tests will override this when provided.
 */
const defaultState = {
  isAuthenticated: true,
  user: { id: 'user-123', username: 'testuser' },
};

// Mimic Zustand-like API used in tests
export const useAuthStore = {
  getState: () => defaultState,
};