const express = require('express');
const { body } = require('express-validator');
const { 
  createPaymentIntent,
  handleWebhook,
  getPaymentMethods,
  addPaymentMethod
} = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');

const router = express.Router();

// Webhook endpoint (no authentication needed for Stripe webhooks)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Apply authentication middleware to all other routes
router.use(authenticate);

// Create payment intent for subscription
router.post(
  '/create-payment-intent',
  [
    body('planId').not().isEmpty().withMessage('Plan ID is required'),
  ],
  validateRequest,
  createPaymentIntent
);

// Get payment methods
router.get('/payment-methods', getPaymentMethods);

// Add payment method
router.post(
  '/payment-methods',
  [
    body('paymentMethodId').not().isEmpty().withMessage('Payment method ID is required'),
  ],
  validateRequest,
  addPaymentMethod
);

module.exports = router;
