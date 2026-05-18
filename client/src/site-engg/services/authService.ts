import type { User } from '../types';

export interface AuthResponse {
  user: User | null;
  error: string | null;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'engineer' | 'hr' | 'client';
  phone?: string;
}

const STORAGE_KEY = 'auth_user';
const authStateChangeCallbacks: ((user: User | null) => void)[] = [];

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`/api/site-engg${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  
  return data;
}

export const authService = {
  async signUp(data: SignUpData): Promise<AuthResponse> {
    try {
      const result = await apiRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          role: data.role,
          phone: data.phone,
        }),
      });

      const user = result.user;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      authStateChangeCallbacks.forEach(cb => cb(user));
      
      return { user, error: null };
    } catch (error: any) {
      return { user: null, error: error.message || 'Sign up failed' };
    }
  },

  async signIn(email: string, password?: string): Promise<AuthResponse> {
    try {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: password || 'password' }),
      });

      const user = result.user;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      authStateChangeCallbacks.forEach(cb => cb(user));
      
      return { user, error: null };
    } catch (error: any) {
      return { user: null, error: error.message || 'Sign in failed' };
    }
  },

  async signOut(): Promise<{ error: string | null }> {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
      localStorage.removeItem(STORAGE_KEY);
      authStateChangeCallbacks.forEach(cb => cb(null));
      return { error: null };
    } catch (error: any) {
      localStorage.removeItem(STORAGE_KEY);
      authStateChangeCallbacks.forEach(cb => cb(null));
      return { error: null };
    }
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const user = await apiRequest('/auth/me');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return user;
    } catch {
      const userJson = localStorage.getItem(STORAGE_KEY);
      return userJson ? JSON.parse(userJson) : null;
    }
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    authStateChangeCallbacks.push(callback);
    return { data: { subscription: { unsubscribe: () => {
      const index = authStateChangeCallbacks.indexOf(callback);
      if (index > -1) authStateChangeCallbacks.splice(index, 1);
    }}}};
  },

  isAdmin(): boolean {
    const userJson = localStorage.getItem(STORAGE_KEY);
    if (!userJson) return false;
    const user = JSON.parse(userJson);
    return user.role === 'admin';
  }
};
