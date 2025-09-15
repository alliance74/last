import { API_URL } from '@/config';
import { getAuthToken } from './auth.service';

export interface ReferralItem {
  email: string;
  date: string; // ISO
  status: 'pending' | 'completed' | 'failed';
  earned: number;
  name?: string;
  userId?: string;
}

export interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;
  totalEarned: number;
  availableBalance: number;
  referralCount: number; // Legacy
  creditsEarned?: number; // Legacy
  referralEarnings?: number; // Legacy
  recentReferrals: ReferralItem[];
}

export const getReferralStats = async (): Promise<ReferralStats> => {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_URL}/referrals/stats`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to load referral stats');
  }

  return res.json();
};

export interface PayoutRequest {
  amount: number;
  currency?: string;
  destination?: string;
}

export interface PayoutResponse {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  currency: string;
  destination: string;
}

export const requestPayout = async (data: PayoutRequest): Promise<PayoutResponse> => {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_URL}/referrals/payouts/request`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: data.amount,
      currency: data.currency || 'usd',
      destination: data.destination || 'default',
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to request payout');
  }

  return res.json();
};

export const getPayouts = async (): Promise<{
  payouts: PayoutResponse[];
  availableBalance: number;
}> => {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_URL}/referrals/payouts`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to load payouts');
  }

  return res.json();
};
