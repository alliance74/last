import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getSubscriptionPlans, CurrentSubscription, SubscriptionPlan } from '@/services/subscription.service';

interface SubscriptionInfo extends Omit<CurrentSubscription, 'status'> {
  planName: string;
  isFree: boolean;
  isActive: boolean;
  features: string[];
  price: number;
  billingCycle: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'incomplete' | 'incomplete_expired';
  hasEverSubscribed?: boolean;
}

interface CanSendMessageResult {
  canSend: boolean;
  remaining?: number;
  limit?: number;
}

interface SubscriptionContextType {
  subscription: SubscriptionInfo | null;
  isLoading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
  canSendMessage: () => CanSendMessageResult;
  recordMessageSent: () => void;
  shouldAutoRedirectToPricing: () => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!currentUser) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getSubscriptionPlans();
      
      if (!response) {
        throw new Error('Failed to fetch subscription plans');
      }

      const { plans = [], currentPlan } = response;
      
      if (!currentPlan) {
        // Default to free plan if no current plan
        const freePlan = plans.find((plan: SubscriptionPlan) => plan.id === 'free') || {
          id: 'free',
          name: 'Free',
          description: 'Free plan',
          price: 0,
          billingCycle: 'monthly' as const,
          features: ['10 messages per month'],
          credits: 10,
          limits: { messages: 10 },
          stripe: { priceId: '' }
        };
        
        const newSubscription: SubscriptionInfo = {
          planId: freePlan.id,
          planName: freePlan.name,
          price: freePlan.price,
          billingCycle: freePlan.billingCycle,
          features: freePlan.features,
          maxMessages: freePlan.limits.messages,
          usedMessages: 0,
          remainingMessages: freePlan.limits.messages,
          isFree: true,
          isActive: true,
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false,
          hasEverSubscribed: false,
        };
        
        setSubscription(newSubscription);
      } else {
        const planDetails = plans.find((plan: SubscriptionPlan) => plan.id === currentPlan.planId) || {
          id: currentPlan.planId,
          name: currentPlan.planId,
          description: currentPlan.planId,
          price: 0,
          billingCycle: 'monthly' as const,
          features: [],
          credits: 0,
          limits: { messages: 0 },
          stripe: { priceId: '' }
        };
        
        const updatedSubscription: SubscriptionInfo = {
          ...currentPlan,
          planName: planDetails.name,
          price: planDetails.price,
          billingCycle: planDetails.billingCycle,
          features: planDetails.features,
          isFree: currentPlan.planId === 'free',
          isActive: currentPlan.status === 'active' || currentPlan.status === 'trialing',
          status: currentPlan.status as SubscriptionInfo['status']
        };
        
        setSubscription(updatedSubscription);
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError('Failed to load subscription info');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  const canSendMessage = (): CanSendMessageResult => {
    if (!subscription) return { canSend: false };
    
    if (subscription.isFree) {
      return {
        canSend: subscription.remainingMessages > 0,
        remaining: subscription.remainingMessages,
        limit: subscription.maxMessages
      };
    }
    
    return {
      canSend: subscription.isActive,
      remaining: subscription.remainingMessages,
      limit: subscription.maxMessages
    };
  };

  const recordMessageSent = () => {
    setSubscription(prev => {
      if (!prev) return null;
      
      const usedMessages = (prev.usedMessages || 0) + 1;
      // For paid/unlimited plans, remainingMessages may be null. Do not decrement in that case.
      const remainingMessages = prev.remainingMessages == null
        ? null
        : Math.max(0, (prev.remainingMessages || 0) - 1);
      
      return {
        ...prev,
        usedMessages,
        remainingMessages
      };
    });
  };

  // Only auto-redirect to pricing for first-time Free users
  const shouldAutoRedirectToPricing = (): boolean => {
    if (!subscription) return false;
    return subscription.isFree && subscription.hasEverSubscribed !== true;
  };

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isLoading,
        error,
        refreshSubscription: fetchSubscription,
        canSendMessage,
        recordMessageSent,
        shouldAutoRedirectToPricing,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
