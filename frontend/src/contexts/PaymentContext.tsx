import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { paymentService } from '@/services/payment.service';
import { getSubscriptionPlans, SubscriptionPlan, CurrentSubscription } from '@/services/subscription.service';
import { PaymentMethod, Invoice } from '@/services/payment.service';

type PaymentContextType = {
  paymentMethods: PaymentMethod[];
  currentSubscription: CurrentSubscription | null;
  subscriptionPlans: SubscriptionPlan[];
  loading: boolean;
  error: string | null;
  fetchPaymentMethods: () => Promise<void>;
  fetchSubscriptionPlans: () => Promise<void>;
  addPaymentMethod: (paymentMethodId: string) => Promise<PaymentMethod>;
  removePaymentMethod: (paymentMethodId: string) => Promise<void>;
  updateSubscription: (planId: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
};

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      setLoading(true);
      const methods = await paymentService.getPaymentMethods();
      setPaymentMethods(methods);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch payment methods:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch payment methods');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubscriptionPlans = useCallback(async () => {
    try {
      setLoading(true);
      const { plans, currentPlan } = await getSubscriptionPlans();
      setSubscriptionPlans(plans);
      if (currentPlan) {
        setCurrentSubscription(currentPlan);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to fetch subscription plans:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription plans');
    } finally {
      setLoading(false);
    }
  }, []);

  const addPaymentMethod = async (paymentMethodId: string, makeDefault: boolean = false): Promise<PaymentMethod> => {
    try {
      setLoading(true);
      const newMethod = await paymentService.addPaymentMethod(paymentMethodId);
      if (makeDefault) {
        await paymentService.setDefaultPaymentMethod(newMethod.id);
      }
      await fetchPaymentMethods(); // Refresh the payment methods list
      setError(null);
      return newMethod;
    } catch (err) {
      console.error('Failed to add payment method:', err);
      setError(err instanceof Error ? err.message : 'Failed to add payment method');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removePaymentMethod = async (paymentMethodId: string): Promise<void> => {
    try {
      setLoading(true);
      await paymentService.removePaymentMethod(paymentMethodId);
      setPaymentMethods(prev => prev.filter(method => method.id !== paymentMethodId));
      setError(null);
    } catch (err) {
      console.error('Failed to remove payment method:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove payment method');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSubscription = async (planId: string, paymentMethodId?: string): Promise<void> => {
    try {
      setLoading(true);
      if (paymentMethodId) {
        await paymentService.setDefaultPaymentMethod(paymentMethodId);
      }
      await paymentService.createSubscription(planId, paymentMethodId);
      await fetchSubscriptionPlans(); // Refresh the subscription data
      setError(null);
    } catch (err) {
      console.error('Failed to update subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to update subscription');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async (): Promise<void> => {
    try {
      if (!currentSubscription) {
        throw new Error('No active subscription to cancel');
      }
      setLoading(true);
      // Use the planId from the current subscription to cancel
      await paymentService.cancelSubscription(currentSubscription.planId);
      await fetchSubscriptionPlans(); // Refresh the subscription data
      setError(null);
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
    fetchSubscriptionPlans();
  }, [fetchPaymentMethods, fetchSubscriptionPlans]);

  return (
    <PaymentContext.Provider
      value={{
        paymentMethods,
        currentSubscription,
        subscriptionPlans,
        loading,
        error,
        fetchPaymentMethods,
        fetchSubscriptionPlans,
        addPaymentMethod,
        removePaymentMethod,
        updateSubscription,
        cancelSubscription,
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = (): PaymentContextType => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};
