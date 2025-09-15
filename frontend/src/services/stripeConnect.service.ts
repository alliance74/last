import { API_URL } from '@/config';

type PayoutStatus = 'pending' | 'completed' | 'failed' | 'processing';

export interface Payout {
  id: string;
  amount: number;
  status: PayoutStatus;
  createdAt: string;
  completedAt?: string;
  currency: string;
  destination: string;
  transferId?: string;
  fee?: number;
  netAmount?: number;
  error?: string;
}

export interface StripeConnectAccount {
  id: string;
  status: 'not_connected' | 'pending' | 'complete' | 'incomplete';
  payoutsEnabled: boolean;
  requirements?: {
    currently_due: string[];
    pending_verification: string[];
  };
}

export const getStripeConnectStatus = async (): Promise<{
  success: boolean;
  account?: StripeConnectAccount;
  error?: string;
}> => {
  try {
    const response = await fetch(`${API_URL}/stripe/status`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch Stripe Connect status');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching Stripe Connect status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch payment account status'
    };
  }
};

export const initStripeOnboarding = async (email: string, returnUrl?: string) => {
  try {
    const response = await fetch(`${API_URL}/stripe/onboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ 
        email,
        return_url: returnUrl || `${window.location.origin}/referrals`
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to initialize Stripe onboarding');
    }
    
    return data;
  } catch (error) {
    console.error('Error initializing Stripe onboarding:', error);
    throw error;
  }
};

export const requestPayout = async (amount: number, options?: { instant?: boolean }): Promise<{
  success: boolean;
  payout?: Payout;
  availableBalance?: number;
  error?: string;
}> => {
  try {
    const response = await fetch(`${API_URL}/stripe/payouts/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ amount, instant: options?.instant === true }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Prefer backend-provided detailed error when available
      throw new Error(data.error || data.message || 'Failed to request payout');
    }
    
    return data;
  } catch (error) {
    console.error('Error requesting payout:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to request payout'
    };
  }
};

export const getPayouts = async (): Promise<{
  success: boolean;
  payouts?: Payout[];
  availableBalance?: number;
  minimumPayoutAmount?: number;
  error?: string;
}> => {
  try {
    const response = await fetch(`${API_URL}/stripe/payouts`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch payouts');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch payout history'
    };
  }
};
