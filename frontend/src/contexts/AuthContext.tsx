import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

export interface User {
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
  // Add other user properties as needed
}

interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<AuthResponse>;
  signup: (email: string, password: string, displayName: string, referredBy?: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
  loading: boolean;
  initialAuthCheckComplete: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialAuthCheckComplete, setInitialAuthCheckComplete] = useState(false);
  const navigate = useNavigate();

  // Helper to update auth state
  const updateAuthState = useCallback(async (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      // Store minimal user data in localStorage
      const { uid, email, displayName } = user;
      localStorage.setItem('currentUser', JSON.stringify({ uid, email, displayName }));
    } else {
      // Remove user from localStorage on logout
      localStorage.removeItem('currentUser');
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, displayName: string, referredBy?: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          displayName,
          ...(referredBy && { referredBy }),
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Registration failed');
      }

      // Handle the successful response format
      if (responseData.data && responseData.data.user) {
        const { user, token } = responseData.data;
        
        // Store the token in localStorage for API requests
        if (token) {
          localStorage.setItem('token', token);
        }
        
        await updateAuthState(user);
        return {
          user,
          token,
          message: responseData.message || 'Registration successful',
        };
      }

      throw new Error('Invalid response format from server');
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }, [updateAuthState]);

  const login = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Important for cookies
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Login failed');
      }

      // Handle the successful response format
      if (!responseData.data || !responseData.data.user) {
        throw new Error('Invalid response format from server');
      }

      const { user, token } = responseData.data;
      
      // Store the token in localStorage for API requests
      if (token) {
        localStorage.setItem('token', token);
      }
      
      await updateAuthState(user);
      
      return {
        user,
        token,
        message: responseData.message || 'Login successful',
      };
    } catch (error) {
      console.error('Login error:', error);
      // Clear any invalid auth state on error
      localStorage.removeItem('token');
      setCurrentUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [updateAuthState]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Call backend logout endpoint to clear the HTTP-only cookie
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
        });
      } catch (error) {
        console.error('Error during logout API call:', error);
        // Continue with client-side cleanup even if API call fails
      }
      
      // Clear all client-side auth state
      setCurrentUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      
      // Clear any cookies that might be set
      document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      // Navigate to home page
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [navigate, updateAuthState]);

  const getToken = useCallback(async (): Promise<string | null> => {
    // Check if we have a token in localStorage
    const token = localStorage.getItem('token');
    
    // If no token, return null
    if (!token) {
      return null;
    }
    
    try {
      // In a real app, you would decode the JWT to check expiration
      // and potentially refresh it if needed
      // For now, we'll just return the token if it exists
      return token;
    } catch (error) {
      console.error('Error getting/validating token:', error);
      // If there's an error validating the token, clear it
      localStorage.removeItem('token');
      return null;
    }
  }, []);

  const checkAuth = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const token = await getToken();
      
      if (!token) {
        setCurrentUser(null);
        return;
      }

      // Verify token and get current user data
      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        credentials: 'include', // Important for cookies
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const responseData = await response.json();
        const serverUser = responseData?.data?.user;
        
        if (serverUser) {
          // Update auth state with user data from the server
          await updateAuthState(serverUser);
        } else {
          // If no user data but response is OK, clear auth state
          console.warn('No user data in response');
          setCurrentUser(null);
          localStorage.removeItem('token');
        }
      } else if (response.status === 401) {
        // Attempt silent refresh using httpOnly refresh cookie
        try {
          const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Accept': 'application/json' },
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const newToken = refreshData?.data?.token;
            if (newToken) {
              localStorage.setItem('token', newToken);
              // Retry /auth/me with the new token
              const retryRes = await fetch(`${API_URL}/auth/me`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                  'Accept': 'application/json',
                  'Authorization': `Bearer ${newToken}`,
                },
              });
              if (retryRes.ok) {
                const retryData = await retryRes.json();
                const userAfterRefresh = retryData?.data?.user;
                if (userAfterRefresh) {
                  await updateAuthState(userAfterRefresh);
                  return; // success path
                }
              }
            }
          }
        } catch (e) {
          console.warn('Silent refresh failed:', e);
        }

        // If we reached here, refresh failed — clear auth state
        console.warn('Session expired or invalid token');
        setCurrentUser(null);
        localStorage.removeItem('token');
      } else {
        // Handle other HTTP errors
        console.error('Auth check failed with status:', response.status);
        throw new Error(`Authentication check failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setCurrentUser(null);
      localStorage.removeItem('token');
      throw error; // Re-throw to be caught by the caller
    } finally {
      setLoading(false);
      setInitialAuthCheckComplete(true);
    }
  }, [getToken, updateAuthState]);

  // Check auth state on mount
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('Auth check error:', error);
        // Don't clear localStorage token here to prevent race conditions
        // The server will handle invalid tokens
      } finally {
        setInitialAuthCheckComplete(true);
        setLoading(false);
      }
    };

    verifyAuth();
  }, [checkAuth]);

  // Context value with all required properties
  const value = {
    currentUser,
    login,
    signup,
    logout,
    getToken,
    loading,
    initialAuthCheckComplete,
  } as const;

  // Debug log for auth state changes
  useEffect(() => {
    console.log('Auth state updated:', {
      currentUser: currentUser ? 'Authenticated' : 'Not authenticated',
      loading,
      initialAuthCheckComplete,
    });
  }, [currentUser, loading, initialAuthCheckComplete]);

  // Always render children, but pass loading state in context
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

