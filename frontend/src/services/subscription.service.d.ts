// Type declarations for subscription.service
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  credits: number;
  limits: {
    messages: number;
    [key: string]: any;
  };
  stripe: {
    priceId: string;
    productId?: string;
  };
  productId?: string;
}

export interface CurrentSubscription {
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'incomplete' | 'incomplete_expired';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  usedMessages: number;
  maxMessages: number;
  remainingMessages: number;
}

export declare function getSubscriptionPlans(): Promise<{
  plans: SubscriptionPlan[];
  currentPlan?: CurrentSubscription;
}>;

export declare function subscribeToPlan(
  planId: string, 
  paymentMethodId?: string
): Promise<{
  subscriptionId: string;
  clientSecret?: string;
  requiresAction: boolean;
}>;

export declare function cancelSubscription(): Promise<void>;

export declare function updatePaymentMethod(paymentMethodId: string): Promise<void>;
