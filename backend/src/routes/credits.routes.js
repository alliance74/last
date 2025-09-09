const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { addCredits } = require('../controllers/auth.controller');

/**
 * @route   POST /api/credits/add
 * @desc    Add credits to user's account
 * @access  Private (Admin only)
 */
router.post('/add', authenticate, async (req, res, next) => {
  try {
    // Check if user is admin
    if (!req.user.customClaims?.admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { userId, amount } = req.body;
    
    if (!userId || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ 
        message: 'Invalid request. userId and positive amount are required.' 
      });
    }

    await addCredits(userId, amount);
    
    res.status(200).json({
      success: true,
      message: `Successfully added ${amount} credits to user ${userId}`
    });
  } catch (error) {
    console.error('Add credits error:', error);
    next(error);
  }
});

/**
 * @route   GET /api/credits/balance
 * @desc    Get current user's credit balance
 * @access  Private
 */
router.get('/balance', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const userDoc = await firestore.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    res.status(200).json({
      success: true,
      balance: userData.credits || 0
    });
  } catch (error) {
    console.error('Get balance error:', error);
    next(error);
  }
});

module.exports = router;
