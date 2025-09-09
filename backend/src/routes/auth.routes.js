const express = require('express');
const { body } = require('express-validator');
const { login, register, refreshToken, getToken, forgotPassword, resetPassword, logout, me, refreshAccessToken } = require('../controllers/auth.controller');
const { validateRequest } = require('../middleware/validateRequest');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Register a new user
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('displayName').not().isEmpty().trim().escape(),
    body('referredBy').optional().trim()
  ],
  validateRequest,
  register
);

// Login user
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').not().isEmpty()
  ],
  validateRequest,
  login
);

// Get current user's token (requires authentication)
router.get('/token', authenticateToken, getToken);

// Get current user using custom JWT (requires authentication)
router.get('/me', authenticateToken, me);

// Refresh access token using refreshToken httpOnly cookie
router.post('/refresh', refreshAccessToken);

// Refresh access token (legacy)
router.post('/refresh-token', refreshToken);

// Forgot password
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  validateRequest,
  forgotPassword
);

// Logout user
router.post('/logout', authenticateToken, logout);

// Reset password
router.post(
  '/reset-password',
  [
    body('token').not().isEmpty(),
    body('password').isLength({ min: 6 })
  ],
  validateRequest,
  resetPassword
);

module.exports = router;
