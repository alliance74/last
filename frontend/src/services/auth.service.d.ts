// Type declarations for auth.service
import { AuthResponse } from './auth.service';

export declare function getAuthToken(): Promise<string | null>;
export declare function login(email: string, password: string): Promise<AuthResponse>;
export declare function register(
  email: string,
  password: string,
  displayName: string,
  referredBy?: string
): Promise<AuthResponse>;
export declare function logout(): Promise<void>;
export declare function forgotPassword(email: string): Promise<void>;
export declare function resetPassword(token: string, newPassword: string): Promise<void>;
