const { db } = require('../config/firebase.cjs');
const admin = require('firebase-admin');
const Stripe = require('stripe');
const { AppError } = require('../utils/errors');
const PLANS = require('../config/plans.config');
const { getUserPlanInfo, canSendMessage, recordMessageUsage } = require('../utils/subscriptionUtils');

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Get available subscription plans
 */
const getSubscriptionPlans = async (req, res, next) => {
  try {
    // Get user's current plan if authenticated
    let userPlan = null;
    if (req.user) {
      try {
        userPlan = await getUserPlanInfo(req.user.uid);
      } catch (error) {
        console.error('Error getting user plan:', error);
        // Continue without user plan info
      }
    }

    // Return plans with sensitive data removed (hide 'pro' for now)
    const publicPlans = Object.values(PLANS)
      .filter(plan => plan.id !== 'pro')
      .map(plan => ({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      billingCycle: plan.billingCycle,
      features: plan.features,
      credits: plan.credits,
      limits: plan.limits,
      isCurrentPlan: userPlan ? plan.id === userPlan.planId : false,
      isUpgrade: userPlan ? 
        Object.keys(PLANS).indexOf(plan.id) > Object.keys(PLANS).indexOf(userPlan.planId) : 
        false
    }));
    
    res.json({
      plans: publicPlans,
      currentPlan: userPlan
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Stripe Checkout session
 * Confirms payment and activates the user's subscription
 */
const verifySession = async (req, res, next) => {
  try {
    const { session_id } = req.query;
    const authedUserId = req.user?.uid;

    if (!session_id) {
      return res.status(400).json({ success: false, message: 'Missing session_id' });
    }

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription']
    });

    // Basic validation
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Determine success; for subscriptions, session.status is typically 'complete'
    const paid = session.payment_status === 'paid' || session.status === 'complete';
    if (!paid) {
      return res.status(400).json({ success: false, message: 'Payment not completed' });
    }

    // Extract metadata we set when creating the session
    const planId = session.metadata?.planId || 'premium';
    const metaUserId = session.metadata?.userId;
    console.log('[verifySession] session_id=', session_id, 'metadata=', session.metadata);
    // Resolve target userId: prefer authenticated user, otherwise use metadata userId from session
    const userId = authedUserId || metaUserId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: No user context' });
    }
    // If both exist and mismatch, reject
    if (authedUserId && metaUserId && authedUserId !== metaUserId) {
      return res.status(403).json({ success: false, message: 'Session does not belong to this user' });
    }

    // Get Stripe subscription/customer ids
    const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

    // Update user's subscription status in Firestore
    const userRef = db.collection('users').doc(userId);
    await userRef.set({
      plan: planId,
      subscriptionStatus: 'active',
      stripeSubscriptionId: stripeSubscriptionId || null,
      stripeCustomerId: stripeCustomerId || null,
      subscriptionStartDate: new Date().toISOString(),
      messageCount: 0,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // If there is a referrer associated, reward them once (idempotent)
    let referralCredited = false;
    let resolvedReferrerId = null;
    try {
      let referrerId = session.metadata?.referrerId;
      if (!referrerId) {
        // Fallback: read user's referredBy in case metadata was missing when session was created
        const udoc = await userRef.get();
        if (udoc.exists) {
          referrerId = udoc.data()?.referredBy || null;
        }
      }
      resolvedReferrerId = referrerId || null;
      if (referrerId) {
        // Use a referral document to ensure idempotency
        const referralDocId = `${referrerId}_${userId}`;
        const referralRef = db.collection('referrals').doc(referralDocId);
        const existing = await referralRef.get();
        if (!existing.exists || existing.data()?.status !== 'completed') {
          await referralRef.set({
            referrerId,
            referredUserId: userId,
            status: 'completed',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            planId,
          }, { merge: true });

          // Increment referrer's counters/earnings
          const refUserRef = db.collection('users').doc(referrerId);
          await db.runTransaction(async (tx) => {
            const doc = await tx.get(refUserRef);
            const data = doc.exists ? doc.data() : {};
            const referralCount = (data.referralCount || 0) + 1;
            const referralEarnings = (data.referralEarnings || 0) + 2; // $2 reward
            tx.set(refUserRef, { referralCount, referralEarnings, updatedAt: new Date().toISOString() }, { merge: true });
          });
          referralCredited = true;
          console.log('[verifySession] referral credited for', { referrerId, userId });
        } else {
          console.log('[verifySession] referral already completed for', { referrerId, userId });
        }
      }
    } catch (e) {
      console.warn('Referral reward failed (non-fatal):', e);
    }

    // Issue fresh access and refresh tokens to ensure the user remains logged in after redirect
    try {
      const jwt = require('jsonwebtoken');
      const accessToken = jwt.sign({ uid: userId }, process.env.JWT_SECRET, { expiresIn: '24h' });

      // Set access token cookie
      res.cookie('token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000,
        domain: process.env.COOKIE_DOMAIN || undefined,
      });

      // Create/rotate refresh token
      const refreshToken = jwt.sign({ uid: userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });
      const crypto = require('crypto');
      const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await userRef.set({ refreshTokenHash: refreshHash }, { merge: true });
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        domain: process.env.COOKIE_DOMAIN || undefined,
      });

      console.log('[verifySession] subscription verified for', { userId, planId, referralCredited, referrerId: resolvedReferrerId });
      return res.json({ success: true, message: 'Subscription verified', plan: planId, token: accessToken, referralCredited, referrerId: resolvedReferrerId });
    } catch (e) {
      console.error('Failed to issue tokens after verification:', e);
      console.log('[verifySession] subscription verified for', { userId, planId, referralCredited, referrerId: resolvedReferrerId });
      return res.json({ success: true, message: 'Subscription verified', plan: planId, referralCredited, referrerId: resolvedReferrerId });
    }
  } catch (error) {
    console.error('Verify session error:', error);
    next(error);
  }
};

/**
 * Subscribe to a plan
 */
const subscribeToPlan = async (req, res, next) => {
  try {
    const { planId, paymentMethodId } = req.body;
    const userId = req.user.uid;

    // Validate plan exists
    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid plan',
        code: 'INVALID_PLAN'
      });
    }

    // Get user data
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    const user = userDoc.data();
    
    // For free plan, just update the user's plan
    if (planId === 'free') {
      await userRef.update({
        plan: 'free',
        subscriptionStatus: 'active',
        updatedAt: new Date().toISOString(),
        // Reset message count but keep track of when they downgraded
        downgradedAt: new Date().toISOString()
      });

      return res.json({ 
        success: true,
        message: 'Subscribed to free plan',
        plan: planId,
        // Reset remaining messages to full quota
        remainingMessages: plan.credits
      });
    }

    // For paid plans, create a Stripe subscription
    let customer;
    
    // Validate Stripe configuration
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(400).json({
        success: false,
        message: 'Payment is not configured. Please try again later.',
        code: 'STRIPE_NOT_CONFIGURED'
      });
    }

    // Resolve a usable priceId. Prefer explicit priceId; otherwise, if a productId is provided,
    // look up the product's default price in Stripe.
    let priceId = plan?.stripe?.priceId;
    if (!priceId && plan?.stripe?.productId) {
      try {
        const product = await stripe.products.retrieve(plan.stripe.productId, { expand: ['default_price'] });
        // default_price may be an ID or an expanded object depending on API version/expand
        priceId = (product.default_price && product.default_price.id) || product.default_price || null;
      } catch (e) {
        console.error('Failed to resolve price from product:', e);
      }
    }

    if (!priceId) {
      return res.status(400).json({
        success: false,
        message: 'This plan is not available for purchase yet.',
        code: 'PLAN_NOT_AVAILABLE'
      });
    }

    // Create or get Stripe customer
    if (user.stripeCustomerId) {
      try {
        customer = await stripe.customers.retrieve(user.stripeCustomerId);
        // Update payment method if provided
        if (paymentMethodId) {
          await stripe.paymentMethods.attach(paymentMethodId, {
            customer: customer.id,
          });
          
          await stripe.customers.update(customer.id, {
            invoice_settings: {
              default_payment_method: paymentMethodId,
            },
          });
        }
      } catch (error) {
        // If customer not found in Stripe, create a new one
        if (error.code === 'resource_missing') {
          customer = await createStripeCustomer(user, paymentMethodId);
          await userRef.update({ stripeCustomerId: customer.id });
        } else {
          throw error;
        }
      }
    } else {
      customer = await createStripeCustomer(user, paymentMethodId);
      await userRef.update({ stripeCustomerId: customer.id });
    }

    try {
      // Determine referrerId from user data if present
      const referrerId = user?.referredBy || null;
      if (!paymentMethodId) {
        // No payment method provided: create a Checkout Session for subscription
        const successUrl = (process.env.FRONTEND_URL || 'http://localhost:8080') + '/pricing?session_id={CHECKOUT_SESSION_ID}';
        const cancelUrl = (process.env.FRONTEND_URL || 'http://localhost:8080') + '/pricing?canceled=true';

        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          customer: customer.id,
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: { userId, planId, ...(referrerId ? { referrerId } : {}) },
          allow_promotion_codes: true,
        });

        return res.json({ success: true, sessionId: session.id });
      }

      // Payment method provided: create subscription directly
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        expand: ['latest_invoice.payment_intent'],
        metadata: { userId, planId, ...(referrerId ? { referrerId } : {}) }
      });

      // Update user with subscription info
      await userRef.update({
        plan: planId,
        subscriptionStatus: subscription.status,
        stripeSubscriptionId: subscription.id,
        subscriptionStartDate: new Date().toISOString(),
        // Reset message count when upgrading
        messageCount: 0,
        updatedAt: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Subscription successful',
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        plan: planId,
        remainingMessages: plan.credits
      });
    } catch (error) {
      console.error('Stripe subscription error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Subscription error:', error);
    next(error);
  }
};

/**
 * Get current subscription
 */
const getCurrentSubscription = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists()) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = userDoc.data();
    const plan = PLANS[userData.plan] || PLANS.free;

    res.json({
      plan: {
        ...plan,
        isActive: userData.subscriptionStatus === 'active',
        currentPeriodEnd: userData.currentPeriodEnd,
        status: userData.subscriptionStatus || 'active',
      },
      credits: userData.credits || 0,
    });
  } catch (error) {
    console.error('Get current subscription error:', error);
    next(error);
  }
};

/**
 * Cancel subscription
 */
const cancelSubscription = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists()) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = userDoc.data();
    
    // If no active subscription
    if (!userData.subscriptionId || userData.plan === 'free') {
      return res.status(400).json({ message: 'No active subscription to cancel' });
    }

    // Cancel the subscription at the end of the current billing period
    const subscription = await stripe.subscriptions.update(userData.subscriptionId, {
      cancel_at_period_end: true,
    });

    // Update user's subscription status
    await userRef.update({
      subscriptionStatus: 'canceled',
      plan: 'free', // Downgrade to free plan
      updatedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Subscription will be canceled at the end of the current billing period',
      canceledAt: subscription.cancel_at,
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    next(error);
  }
};

/**
 * Update payment method
 */
const updatePaymentMethod = async (req, res, next) => {
  try {
    const { paymentMethodId } = req.body;
    const userId = req.user.uid;
    
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists() || !userDoc.data().stripeCustomerId) {
      return res.status(400).json({ message: 'No subscription found' });
    }

    const customerId = userDoc.data().stripeCustomerId;
    
    // Attach the payment method to the customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    res.json({
      success: true,
      message: 'Payment method updated successfully',
    });
  } catch (error) {
    console.error('Update payment method error:', error);
    next(error);
  }
};

/**
 * Get billing history
 */
const getBillingHistory = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists() || !userDoc.data().stripeCustomerId) {
      return res.json([]);
    }

    const customerId = userDoc.data().stripeCustomerId;
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 12,
    });

    const history = invoices.data.map(invoice => ({
      id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      date: new Date(invoice.created * 1000).toISOString(),
      status: invoice.status,
      invoiceUrl: invoice.invoice_pdf,
    }));

    res.json(history);
  } catch (error) {
    console.error('Get billing history error:', error);
    next(error);
  }
};

/**
 * Helper: Create a Stripe customer
 */
async function createStripeCustomer(userData, paymentMethodId) {
  const customerData = {
    email: userData.email,
    name: userData.displayName || ''
  };
  
  if (paymentMethodId) {
    customerData.payment_method = paymentMethodId;
    customerData.invoice_settings = {
      default_payment_method: paymentMethodId
    };
  }
  
  const customer = await stripe.customers.create(customerData);

  return customer; // Return full customer object so caller can use customer.id
}

module.exports = {
  getSubscriptionPlans,
  subscribeToPlan,
  getCurrentSubscription,
  cancelSubscription,
  updatePaymentMethod,
  getBillingHistory,
  verifySession
};
