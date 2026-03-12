import { create } from 'zustand';

export interface AuthUser {
  id: string;
  githubLogin: string;
  displayName: string;
  avatarUrl: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  /** true when no valid JWT is present */
  isGuest: boolean;

  /** Navigate to backend GitHub OAuth entry point */
  login: () => void;
  /** Clear token, update state, redirect to /login */
  logout: () => void;
  /**
   * Check localStorage for a JWT and validate it against /api/me.
   * Sets isGuest=true (without redirect) if no token or token is invalid.
   */
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isGuest: true,

  login: () => {
    window.location.href = '/auth/github';
  },

  logout: () => {
    const token = localStorage.getItem('jwt');
    if (token) {
      // Fire-and-forget — backend may be stateless
      fetch('/api/me/session', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem('jwt');
    set({ user: null, token: null, isGuest: true });
    window.location.href = '/login';
  },

  restoreSession: async () => {
    set({ isLoading: true });
    const token = localStorage.getItem('jwt');
    if (!token) {
      set({ user: null, token: null, isGuest: true, isLoading: false });
      return;
    }
    try {
      // Use native fetch to avoid the axios 401 interceptor redirecting
      // during the initial session restore — we want silent guest fallback here.
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const user = (await res.json()) as AuthUser;
        set({ user, token, isGuest: false, isLoading: false });
      } else {
        localStorage.removeItem('jwt');
        set({ user: null, token: null, isGuest: true, isLoading: false });
      }
    } catch (err) {
      console.warn('[restoreSession] Network error:', err);
      // Network error — backend unreachable. Don't log the user out; keep
      // whatever state we had before so a transient failure doesn't kick the
      // user back to /login.
      set({ isLoading: false });
    }
  },
}));
