const express = require('express');
const { body } = require('express-validator');
const { 
  getSubscriptionPlans,
  subscribeToPlan,
  getCurrentSubscription,
  cancelSubscription,
  updatePaymentMethod,
  getBillingHistory,
  verifySession
} = require('../controllers/subscription.controller.js');
const { authenticateToken } = require('../middleware/auth.middleware.js');
const { validateRequest } = require('../middleware/validateRequest.js');

const router = express.Router();

// Public endpoint to verify Stripe Checkout session after redirect
router.get('/verify-session', verifySession);

// Apply authentication middleware to all other routes
router.use(authenticateToken);

// Get available subscription plans
router.get('/plans', getSubscriptionPlans);

// Subscribe to a plan
router.post(
  '/subscribe',
  [
    body('planId').not().isEmpty(),
    // paymentMethodId is optional; when not provided we create a Stripe Checkout Session
    body('paymentMethodId').optional().isString(),
  ],
  validateRequest,
  subscribeToPlan
);

// Get current subscription
router.get('/me', getCurrentSubscription);

// Cancel subscription
router.post('/cancel', cancelSubscription);

// Update payment method
router.put(
  '/payment-method',
  [
    body('paymentMethodId').not().isEmpty(),
  ],
  validateRequest,
  updatePaymentMethod
);

// Get billing history
router.get('/billing-history', getBillingHistory);

module.exports = router;
