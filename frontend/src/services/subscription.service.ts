import axios from 'axios';
import { API_URL } from '@/config';
import { getAuthToken } from './auth.service';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { toast } from '@/components/ui/use-toast';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  credits: number | null; // null = unlimited
  limits: {
    messages: number | null; // null = unlimited
    [key: string]: any;
  };
  stripe: {
    priceId: string;
  };
}

export interface CurrentSubscription {
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'incomplete' | 'incomplete_expired';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  usedMessages: number;
  maxMessages: number;
  remainingMessages: number;
  planName?: string;
  price?: number;
  billingCycle?: string;
}

// Initialize Stripe
let stripePromise: Promise<any> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    if (!key || typeof key !== 'string' || key.trim() === '') {
      // Provide a clearer error to the caller than Stripe's generic message
      throw new Error('Stripe publishable key is missing. Set VITE_STRIPE_PUBLIC_KEY in frontend/.env and restart the dev server.');
    }
    stripePromise = loadStripe(key.trim());
  }
  return stripePromise;
};

export const getSubscriptionPlans = async (): Promise<{
  plans: SubscriptionPlan[];
  currentPlan?: CurrentSubscription;
}> => {
  const token = await getAuthToken();
  
  try {
    const response = await fetch(`${API_URL}/subscriptions/plans`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to fetch subscription plans');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch subscription plans:', error);
    throw error;
  }
};

// Check if the current URL has a success or canceled parameter from Stripe
export const checkStripeRedirect = async (): Promise<boolean> => {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  const canceled = urlParams.get('canceled');

  if (sessionId) {
    try {
      // Verify the session with the backend
      const response = await axios.get(
        `${API_URL}/subscriptions/verify-session?session_id=${sessionId}`,
        {
          // Route is public; include credentials for cookies
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.data.success) {
        // If backend returned a fresh access token, persist it
        const newToken = response.data?.token || response.data?.data?.token;
        if (newToken) {
          localStorage.setItem('token', newToken);
        }
        // Remove the session_id from URL without page reload
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Show appropriate message based on referral status
        if (response.data.referralUpdated) {
          toast({
            title: '🎉 Subscription & Referral Bonus Applied!',
            description: 'Thank you for subscribing! Your referrer has been credited with $2.',
            variant: 'default',
          });
        } else {
          toast({
            title: 'Subscription Successful!',
            description: 'Thank you for subscribing to our premium plan!',
            variant: 'default',
          });
        }
        
        // Refresh user data to reflect new subscription and credits
        try {
          const auth = await import('./auth.service');
          await auth.getCurrentUser(true); // Force refresh user data
        } catch (err) {
          console.error('Failed to refresh user data:', err);
        }
        
        return true;
      }
    } catch (error) {
      console.error('Error verifying Stripe session:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify your subscription. Please contact support.',
        variant: 'destructive',
      });
    }
  } else if (canceled) {
    toast({
      title: 'Checkout Canceled',
      description: 'Your subscription was not completed. You can try again anytime.',
      variant: 'destructive',
    });
    
    // Remove the canceled parameter from URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return false;
  }
  
  return false;
};

export const subscribeToPlan = async (planId: string, paymentMethodId?: string) => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    const response = await axios.post(`${API_URL}/subscriptions/subscribe`, {
      planId,
      paymentMethodId,
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // If we get a session ID, redirect to Stripe Checkout
    if (response.data.sessionId) {
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Failed to initialize payment processor');
      }
      
      const { error } = await stripe.redirectToCheckout({
        sessionId: response.data.sessionId,
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to redirect to payment');
      }
    }

    return response.data;
  } catch (error: any) {
    console.error('Subscription error:', error);
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      'Failed to process subscription. Please try again.'
    );
  }
};

export const cancelSubscription = async (): Promise<void> => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    await axios.post(`${API_URL}/subscriptions/cancel`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });
    
    toast({
      title: 'Subscription Cancelled',
      description: 'Your subscription has been cancelled. You will have access until the end of your billing period.',
    });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      'Failed to cancel subscription. Please try again.'
    );
  }
};

export const updatePaymentMethod = async (paymentMethodId: string): Promise<void> => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  await axios.put(
    `${API_URL}/subscriptions/payment-method`,
    { paymentMethodId },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    }
  );
};

export const getPaymentMethods = async (): Promise<any[]> => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await axios.get(`${API_URL}/subscriptions/payment-methods`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  });

  return response.data.paymentMethods || [];
};

export const createSetupIntent = async (): Promise<{ clientSecret: string }> => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await axios.post(
    `${API_URL}/subscriptions/setup-intent`,
    {},
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    }
  );

  return response.data;
};

export const attachPaymentMethod = async (paymentMethodId: string): Promise<void> => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  await axios.post(
    `${API_URL}/subscriptions/attach-payment-method`,
    { paymentMethodId },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    }
  );
};

export const detachPaymentMethod = async (paymentMethodId: string): Promise<void> => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  await axios.post(
    `${API_URL}/subscriptions/detach-payment-method`,
    { paymentMethodId },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    }
  );
};

export const getBillingHistory = async (): Promise<any[]> => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await axios.get(`${API_URL}/subscriptions/billing-history`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  });

  return response.data.invoices || [];
};

export const updateSubscription = async (planId: string): Promise<void> => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  await axios.put(
    `${API_URL}/subscriptions/update`,
    { planId },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    }
  );
};

export const initStripe = async () => {
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
  if (!stripeKey) {
    throw new Error('Stripe public key not found');
  }
  return loadStripe(stripeKey);
};
