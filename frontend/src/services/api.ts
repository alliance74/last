import { API_URL } from '../config';

// Create a custom fetch wrapper that includes credentials by default
const apiFetch = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Request failed');
  }

  // Don't try to parse empty responses
  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export interface User {
  uid: string;
  email: string;
  displayName: string;
  // Add other user properties as needed
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    return apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (email: string, password: string, displayName: string, referredBy?: string): Promise<AuthResponse> => {
    return apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        displayName,
        ...(referredBy && { referredBy }),
      }),
    });
  },

  logout: async (): Promise<void> => {
    await apiFetch('/auth/logout', {
      method: 'POST',
    });
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const data = await apiFetch('/auth/me');
      return data?.user || null;
    } catch (error) {
      return null;
    }
  },
};

export default {
  auth: authService,
};
