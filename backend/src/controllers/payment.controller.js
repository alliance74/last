const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { db } = require('../config/firebase.cjs');
const { AppError } = require('../utils/errors');
const PLANS = require('../config/plans.config');

/**
 * Create a payment intent for subscription
 */
const createPaymentIntent = async (req, res, next) => {
  try {
    const { planId } = req.body;
    
    // Validate plan exists
    const plan = PLANS[planId];
    if (!plan) {
      throw new AppError('Invalid plan selected', 400);
    }

    // Get or create Stripe customer
    let customer;
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    
    if (userDoc.data()?.stripeCustomerId) {
      customer = await stripe.customers.retrieve(userDoc.data().stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: req.user.email,
        metadata: { firebaseUID: req.user.uid }
      });
      await userRef.update({ stripeCustomerId: customer.id });
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: plan.stripePriceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        planId: plan.id,
        firebaseUID: req.user.uid
      }
    });

    // Return client secret for payment confirmation
    res.json({
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      subscriptionId: subscription.id
    });

  } catch (error) {
    console.error('Payment intent error:', error);
    next(new AppError(error.message || 'Failed to create payment intent', 500));
  }
};

/**
 * Handle Stripe webhook events
 */
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const subscription = event.data.object;
  const firebaseUID = subscription.metadata?.firebaseUID;
  const planId = subscription.metadata?.planId;

  if (!firebaseUID || !planId) {
    console.error('Missing metadata in webhook event');
    return res.status(400).json({ received: true });
  }

  const userRef = db.collection('users').doc(firebaseUID);
  const plan = PLANS[planId];

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await userRef.update({
          subscription: {
            status: subscription.status,
            planId: planId,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            stripeSubscriptionId: subscription.id
          },
          credits: admin.firestore.FieldValue.increment(plan.credits || 0)
        });
        break;

      case 'customer.subscription.deleted':
        await userRef.update({
          'subscription.status': 'canceled',
          'subscription.cancelAtPeriodEnd': true
        });
        break;

      case 'invoice.payment_succeeded':
        if (subscription.billing_reason === 'subscription_create') {
          await userRef.update({
            'subscription.status': 'active',
            credits: admin.firestore.FieldValue.increment(plan.credits || 0)
          });
        }
        break;

      case 'invoice.payment_failed':
        await userRef.update({
          'subscription.status': 'past_due'
        });
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

/**
 * Get payment methods for user
 */
const getPaymentMethods = async (req, res, next) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.data()?.stripeCustomerId) {
      return res.json({ paymentMethods: [] });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: userDoc.data().stripeCustomerId,
      type: 'card'
    });

    res.json({ paymentMethods: paymentMethods.data });
  } catch (error) {
    console.error('Get payment methods error:', error);
    next(new AppError('Failed to get payment methods', 500));
  }
};

/**
 * Add a payment method
 */
const addPaymentMethod = async (req, res, next) => {
  try {
    const { paymentMethodId } = req.body;
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.data()?.stripeCustomerId) {
      throw new AppError('User not found in Stripe', 404);
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: userDoc.data().stripeCustomerId
    });

    // Set as default payment method
    await stripe.customers.update(userDoc.data().stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Add payment method error:', error);
    next(new AppError(error.message || 'Failed to add payment method', 500));
  }
};

module.exports = {
  createPaymentIntent,
  handleWebhook,
  getPaymentMethods,
  addPaymentMethod
};
