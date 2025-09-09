const { db } = require('../config/firebase.cjs');
const PLANS = require('../config/plans.config.js');

/**
 * Get user's current plan and message limits
 */
const getUserPlanInfo = async (userId) => {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    const planId = userData.plan || 'free';
    const plan = PLANS[planId] || PLANS.free;
    
    return {
      planId,
      planName: plan.name,
      maxMessages: plan.credits,
      usedMessages: userData.messageCount || 0,
      remainingMessages: Math.max(0, plan.credits - (userData.messageCount || 0)),
      isFree: planId === 'free',
      isActive: !userData.subscriptionStatus || userData.subscriptionStatus === 'active'
    };
  } catch (error) {
    console.error('Error getting user plan info:', error);
    throw error;
  }
};

/**
 * Check if user can send a message
 */
const canSendMessage = async (userId) => {
  try {
    const planInfo = await getUserPlanInfo(userId);
    
    // Paid users with active subscription can always send messages
    if (!planInfo.isFree && planInfo.isActive) {
      return { canSend: true };
    }
    
    // Free users have limited messages
    const canSend = planInfo.remainingMessages > 0;
    
    return {
      canSend,
      remaining: planInfo.remainingMessages,
      limit: planInfo.maxMessages,
      needsUpgrade: !canSend
    };
  } catch (error) {
    console.error('Error checking message allowance:', error);
    throw error;
  }
};

/**
 * Record a message usage
 */
const recordMessageUsage = async (userId) => {
  try {
    const userRef = db.collection('users').doc(userId);
    
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const messageCount = (userData.messageCount || 0) + 1;
      
      transaction.update(userRef, {
        messageCount,
        lastMessageAt: new Date().toISOString()
      });
      
      return messageCount;
    });
    
    return true;
  } catch (error) {
    console.error('Error recording message usage:', error);
    throw error;
  }
};

module.exports = {
  getUserPlanInfo,
  canSendMessage,
  recordMessageUsage
};
