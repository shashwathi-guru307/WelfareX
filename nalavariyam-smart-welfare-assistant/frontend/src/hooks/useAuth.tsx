import { useState, useCallback, useEffect, createContext, useContext } from 'react';

interface AuthUser {
  id: number;
  name: string;
  email: string;
  username: string;
  role: 'ADMIN' | 'STAFF';
  profile_picture?: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (displayName: string) => Promise<{ success: boolean; error?: string; user?: any }>;
  uploadProfilePicture: (file: File) => Promise<{ success: boolean; error?: string; user?: any }>;
  deleteProfilePicture: () => Promise<{ success: boolean; error?: string; user?: any }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ isAuthenticated: false, user: null, loading: true });

  // Check existing session on mount
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          setAuth({
            isAuthenticated: true,
            user: {
              id: data.data.id,
              name: data.data.display_name,
              email: data.data.email,
              username: data.data.username,
              role: data.data.role,
            },
            loading: false,
          });
        } else {
          setAuth({ isAuthenticated: false, user: null, loading: false });
        }
      })
      .catch(() => {
        setAuth({ isAuthenticated: false, user: null, loading: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        setAuth({
          isAuthenticated: true,
          user: {
            id: data.data.id,
            name: data.data.name,
            email: data.data.email,
            username: data.data.username,
            role: data.data.role,
          },
          loading: false,
        });
        return { success: true };
      }

      return { success: false, error: data.error || 'Invalid credentials.' };
    } catch {
      return { success: false, error: 'Server unavailable. Please try again.' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }
    setAuth({ isAuthenticated: false, user: null, loading: false });
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string, confirmPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword }),
      });
      const data = await res.json();
      if (data.success) return { success: true };
      return { success: false, error: data.error || 'Failed to change password.' };
    } catch {
      return { success: false, error: 'Server unavailable.' };
    }
  }, []);

  const updateProfile = useCallback(async (displayName: string): Promise<{ success: boolean; error?: string; user?: any }> => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ display_name: displayName }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAuth(prev => ({ ...prev, user: prev.user ? { ...prev.user, name: data.data.display_name } : null }));
        return { success: true, user: data.data };
      }
      return { success: false, error: data.error || 'Failed to update profile.' };
    } catch {
      return { success: false, error: 'Server unavailable.' };
    }
  }, []);

  const uploadProfilePicture = useCallback(async (file: File): Promise<{ success: boolean; error?: string; user?: any }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/auth/profile/picture', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.data) {
        return { success: true, user: data.data };
      }
      return { success: false, error: data.error || 'Failed to upload picture.' };
    } catch {
      return { success: false, error: 'Server unavailable.' };
    }
  }, []);

  const deleteProfilePicture = useCallback(async (): Promise<{ success: boolean; error?: string; user?: any }> => {
    try {
      const res = await fetch('/api/auth/profile/picture', {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.data) {
        return { success: true, user: data.data };
      }
      return { success: false, error: data.error || 'Failed to remove picture.' };
    } catch {
      return { success: false, error: 'Server unavailable.' };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, changePassword, updateProfile, uploadProfilePicture, deleteProfilePicture }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export type { AuthContextType, AuthUser };
