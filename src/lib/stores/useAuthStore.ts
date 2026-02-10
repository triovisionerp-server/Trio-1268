import { create } from 'zustand';
import type { UserSession } from '@/types/dashboard';

// Helper to get user from localStorage
const getStoredUser = (): UserSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      return JSON.parse(storedUser);
    }
  } catch (error) {
    console.error('Error reading user from localStorage:', error);
  }
  return null;
};

interface AuthState {
  user: UserSession | null;
  loading: boolean;
  setUser: (user: UserSession | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  initializeUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  logout: () => {
    set({ user: null });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('currentUserName');
      localStorage.removeItem('currentUserRole');
    }
  },
  initializeUser: () => {
    const user = getStoredUser();
    set({ user, loading: false });
  },
}));
