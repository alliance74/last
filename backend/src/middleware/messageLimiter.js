const { db } = require('../config/firebase.cjs');
const { AppError } = require('../utils/errors');

/**
 * Middleware to check and enforce message limits for free users
 */
const messageLimiter = async (req, res, next) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return next(new AppError('Authentication required', 401));
    }

    // Get user document
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return next(new AppError('User not found', 404));
    }

    const userData = userDoc.data();
    
    // Skip check for paid users
    if (userData.plan && userData.plan !== 'free') {
      return next();
    }

    // Check message count for free users
    const messageCount = userData.messageCount || 0;
    const maxFreeMessages = 10;

    if (messageCount >= maxFreeMessages) {
      return res.status(403).json({
        success: false,
        message: 'You have reached your free message limit. Please upgrade to continue.',
        code: 'MESSAGE_LIMIT_REACHED',
        upgradeRequired: true
      });
    }

    // Increment message count for the next request
    await userRef.update({
      messageCount: admin.firestore.FieldValue.increment(1),
      lastMessageAt: new Date().toISOString()
    });

    // Add remaining messages to response headers
    res.set('X-Remaining-Messages', (maxFreeMessages - messageCount - 1).toString());
    res.set('X-Message-Limit', maxFreeMessages.toString());
    
    next();
  } catch (error) {
    console.error('Message limiter error:', error);
    next(error);
  }
};

module.exports = { messageLimiter };
