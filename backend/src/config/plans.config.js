/**
 * Subscription plans configuration
 * Each plan defines the features and limits for different subscription tiers
 */
module.exports = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    credits: 10, // 10 free messages
    features: [
      '10 free messages',
      'Basic support',
      'Access to free features'
    ],
    limits: {
      messages: 10,
      history: 24, // hours
      responseLength: 500 // characters
    }
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 9.99,
    billingCycle: 'monthly',
    credits: 100, // 100 messages/month
    features: [
      '100 messages/month',
      'Priority support',
      'Access to all premium features',
      'Cancel anytime'
    ],
    limits: {
      messages: 100,
      history: 168, // 1 week
      responseLength: 1000
    },
    stripe: {
      // Preferred: set a Price ID directly (kept as optional env override)
      priceId: process.env.STRIPE_PREMIUM_PRICE_ID || null,
      // Hardcoded Product ID provided by user; we'll resolve its default price at runtime
      productId: 'prod_T1CsGdiSNCRV9L'
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29.99,
    billingCycle: 'monthly',
    credits: 500, // 500 messages/month
    features: [
      '500 messages/month',
      '24/7 priority support',
      'All premium features',
      'Cancel anytime',
      'Dedicated account manager'
    ],
    limits: {
      messages: 500,
      history: 720, // 1 month
      responseLength: 2000
    },
    stripe: {
      priceId: process.env.STRIPE_PRO_PRICE_ID
    }
  }
};
