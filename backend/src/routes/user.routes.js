const express = require('express');
const { body } = require('express-validator');
const { 
  getUserProfile,
  updateProfile,
  updatePassword,
  deleteAccount,
  getUserReferrals,
  addCredits
} = require('../controllers/user.controller.js');
const { authenticate } = require('../middleware/auth.js');
const { validateRequest } = require('../middleware/validateRequest.js');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get current user profile
router.get('/me', getUserProfile);

// Update user profile
router.put(
  '/profile',
  [
    body('displayName').optional().trim().escape(),
    body('photoURL').optional().isURL(),
  ],
  validateRequest,
  updateProfile
);

// Update password
router.put(
  '/password',
  [
    body('currentPassword').not().isEmpty(),
    body('newPassword').isLength({ min: 6 }),
  ],
  validateRequest,
  updatePassword
);

// Delete account
router.delete('/', deleteAccount);

// Get user's referrals
router.get('/referrals', getUserReferrals);

// Add credits (admin only)
router.post(
  '/credits',
  [
    body('userId').not().isEmpty(),
    body('amount').isInt({ min: 1 }),
  ],
  validateRequest,
  addCredits
);

module.exports = router;
