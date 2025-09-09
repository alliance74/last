const { admin, db } = require('../config/firebase.cjs');

/**
 * Get referral statistics for the current user
 */
const getReferralStats = async (req, res) => {
  try {
    const userId = req.user.uid; // Assuming you have authentication middleware that sets req.user
    
    // Get user document
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // Get recent referrals
    const referralsSnapshot = await db
      .collection('referrals')
      .where('referrerId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    const recentReferrals = [];
    
    // Get details for each referred user
    for (const doc of referralsSnapshot.docs) {
      try {
        const refData = doc.data() || {};
        const referredUserId = refData.referredUserId;
        if (!referredUserId) continue;
        const rUserDoc = await db.collection('users').doc(referredUserId).get();
        if (rUserDoc.exists) {
          const rUser = rUserDoc.data() || {};
          recentReferrals.push({
            email: rUser.email || referredUserId,
            date: refData.createdAt?.toDate?.() ? refData.createdAt.toDate().toISOString() : new Date().toISOString(),
            status: refData.status || 'completed'
          });
        }
      } catch (e) {
        console.warn('Skipping bad referral row:', e);
      }
    }
    
    // Calculate total credits earned (10 per completed referral)
    const creditsEarned = (userData.referralCount || 0) * 10;
    const referralEarnings = userData.referralEarnings || 0;
    
    // Prepare response
    const stats = {
      referralCode: userData.referralCode || userId.substring(0, 8).toUpperCase(),
      referralCount: userData.referralCount || 0,
      creditsEarned,
      referralEarnings,
      recentReferrals
    };
    
    res.json(stats);
    
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ message: 'Failed to fetch referral statistics' });
  }
};

module.exports = {
  getReferralStats
};
