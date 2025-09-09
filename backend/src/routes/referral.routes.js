const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { getReferralStats } = require('../controllers/referral.controller');

// Protected routes (require authentication)
router.use(authenticateToken);

// Get referral statistics
router.get('/stats', getReferralStats);

module.exports = router;
