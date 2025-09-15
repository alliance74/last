import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { paymentService, PaymentMethod, PaymentIntentResponse } from '@/services/payment.service';

export interface PaymentContextType {
  paymentMethods: PaymentMethod[];
  loading: boolean;
  error: string | null;
  addPaymentMethod: (paymentMethodId: string) => Promise<PaymentMethod>;
  createPaymentIntent: (planId: string) => Promise<PaymentIntentResponse>;
  getPaymentMethods: () => Promise<void>;
  isProcessing: boolean;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

interface PaymentProviderProps {
  children: React.ReactNode;
  stripeKey: string;
}

export const PaymentProvider: React.FC<PaymentProviderProps> = ({ children, stripeKey }) => {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Stripe
  useEffect(() => {
    const initializeStripe = async () => {
      try {
        const stripeInstance = await loadStripe(stripeKey);
        setStripe(stripeInstance);
      } catch (err) {
        console.error('Failed to load Stripe', err);
        setError('Failed to initialize payment processor');
      } finally {
        setLoading(false);
      }
    };

    initializeStripe();
  }, [stripeKey]);

  // Fetch payment methods on mount
  const getPaymentMethods = useCallback(async () => {
    try {
      setLoading(true);
      const methods = await paymentService.getPaymentMethods();
      setPaymentMethods(methods);
    } catch (err) {
      console.error('Failed to fetch payment methods', err);
      setError('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  }, []);

  // Add a new payment method
  const addPaymentMethod = useCallback(async (paymentMethodId: string) => {
    try {
      setIsProcessing(true);
      const newMethod = await paymentService.addPaymentMethod(paymentMethodId);
      setPaymentMethods(prev => [...prev, newMethod]);
      return newMethod;
    } catch (err) {
      console.error('Failed to add payment method', err);
      setError('Failed to add payment method');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Create a payment intent
  const createPaymentIntent = useCallback(async (planId: string) => {
    try {
      setIsProcessing(true);
      const intent = await paymentService.createPaymentIntent(planId);
      return intent;
    } catch (err) {
      console.error('Failed to create payment intent', err);
      setError('Failed to create payment intent');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Initial fetch of payment methods
  useEffect(() => {
    if (stripe) {
      getPaymentMethods();
    }
  }, [stripe, getPaymentMethods]);

  const value = {
    paymentMethods,
    loading,
    error,
    addPaymentMethod,
    createPaymentIntent,
    getPaymentMethods,
    isProcessing,
  };

  if (loading || !stripe) {
    return <div>Loading payment system...</div>;
  }

  return (
    <PaymentContext.Provider value={value}>
      <Elements stripe={stripe}>
        {children}
      </Elements>
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
