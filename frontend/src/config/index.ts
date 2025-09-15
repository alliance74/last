// API Configuration
// Default to production API unless overridden by VITE_API_URL
export const API_URL = import.meta.env.VITE_API_URL || 'https://rizz-chatt.onrender.com/api';

// Stripe Configuration
export const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';

// Feature Flags
export const ENABLE_PAYMENTS = import.meta.env.VITE_ENABLE_PAYMENTS === 'true' || false;

// Default settings
export const DEFAULT_PAGE_SIZE = 10;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
  UNAUTHORIZED: 'You need to be logged in to perform this action.',
  FORBIDDEN: 'You do not have permission to access this resource.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  MESSAGE_LIMIT_REACHED: 'You have reached your message limit. Please upgrade to continue.',
} as const;

// Subscription related constants
export const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  PREMIUM: 'premium',
  PRO: 'pro',
} as const;

export type SubscriptionPlan = typeof SUBSCRIPTION_PLANS[keyof typeof SUBSCRIPTION_PLANS];

export const PLAN_DETAILS: Record<SubscriptionPlan, { name: string; description: string }> = {
  [SUBSCRIPTION_PLANS.FREE]: {
    name: 'Free',
    description: 'Basic access with limited features',
  },
  [SUBSCRIPTION_PLANS.PREMIUM]: {
    name: 'Premium',
    description: 'Enhanced features and higher limits',
  },
  [SUBSCRIPTION_PLANS.PRO]: {
    name: 'Pro',
    description: 'Full access with all features',
  },
};
