import { create } from 'zustand';
import { API_URL } from '../config';

interface User {
  id: string;
  email: string;
  name: string | null;
  is_verified: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: true,

  login: async (email, password) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: "" }), // name is required by UserCreate model but not used for login
    });

    if (!response.ok) {
      const error = await response.json();
      const err = new Error(error.detail || 'Login failed');
      (err as any).status = response.status;
      throw err;
    }

    const data = await response.json();
    localStorage.setItem('token', data.access_token);
    set({ token: data.access_token, isAuthenticated: true });
    
    // Fetch user profile after login
    const userResponse = await fetch(`${API_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${data.access_token}` },
    });
    if (userResponse.ok) {
      const userData = await userResponse.json();
      set({ user: userData });
    }
  },

  signup: async (email, password, name) => {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, origin: window.location.origin }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Signup failed');
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false, user: null });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const userData = await response.json();
        set({ user: userData, isAuthenticated: true, isLoading: false });
      } else {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
    }
  },

  verifyEmail: async (token: string) => {
    const response = await fetch(`${API_URL}/api/auth/verify?token=${token}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Verification failed');
    }
    
    // If we have a local token, re-fetch user to update verification status
    const localToken = get().token;
    if (localToken) {
      const userResponse = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${localToken}` },
      });
      if (userResponse.ok) {
        const userData = await userResponse.json();
        set({ user: userData, isAuthenticated: true });
      }
    }
  },

  resendVerification: async (email: string) => {
    const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, origin: window.location.origin }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to resend verification');
    }
  },

  forgotPassword: async (email: string) => {
    const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, origin: window.location.origin }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to send reset link');
    }
  },

  resetPassword: async (token: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password: password }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to reset password');
    }
  },
}));
