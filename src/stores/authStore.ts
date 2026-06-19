import { create } from 'zustand';
import type { User } from '@/types';
import { supabase } from '@/lib/supabaseClient';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('Error logging in:', error);
        set({ isLoading: false });
        return false;
      }

      if (data) {
        const session = { id: data.id, email: data.email, role: data.role, name: data.name };
        localStorage.setItem('pos_session', JSON.stringify(session));
        localStorage.setItem('pos_session_time', Date.now().toString());
        set({ user: data as User, isAuthenticated: true, isLoading: false });
        return true;
      }
    } catch (err) {
      console.error('Login error:', err);
    }
    set({ isLoading: false });
    return false;
  },

  logout: () => {
    localStorage.removeItem('pos_session');
    localStorage.removeItem('pos_session_time');
    set({ user: null, isAuthenticated: false, isLoading: false });
    window.location.reload();
  },

  checkAuth: async () => {
    const sessionStr = localStorage.getItem('pos_session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        // Validate UUID format before querying Postgres to avoid invalid syntax (400) errors
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(session.id)) {
          throw new Error('Invalid UUID format');
        }

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.id)
          .eq('status', 'active')
          .maybeSingle();

        if (data && !error) {
          set({ user: data as User, isAuthenticated: true, isLoading: false });
          return;
        }
      } catch {
        // Invalid session, clear it
        localStorage.removeItem('pos_session');
        localStorage.removeItem('pos_session_time');
      }
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  updateProfile: async (data: Partial<User>) => {
    const { user } = get();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update(data)
        .eq('id', user.id);

      if (!error) {
        set({ user: { ...user, ...data } });
      }
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  },
}));
