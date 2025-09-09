const admin = require('firebase-admin');
const { db, auth } = require('../config/firebase.cjs');
const { AppError } = require('../utils/errors');
const { generateToken } = require('../services/auth.service.js');

/**
 * Get current user profile
 */
const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // Remove sensitive data
    const { password, ...safeUserData } = userData;
    
    res.json(safeUserData);
  } catch (error) {
    console.error('Get user profile error:', error);
    next(error);
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { displayName, photoURL } = req.body;
    
    // Update in Firebase Auth
    await auth.updateUser(userId, {
      displayName,
      ...(photoURL && { photoURL }),
    });
    
    // Update in Firestore
    await db.collection('users').doc(userId).update({
      displayName,
      ...(photoURL && { photoURL }),
      updatedAt: new Date().toISOString(),
    });
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    next(error);
  }
};

/**
 * Update user password
 */
const updatePassword = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { currentPassword, newPassword } = req.body;
    
    // Get user
    const user = await admin.auth().getUser(userId);
    
    // In a real app, you would verify the current password
    // This is a simplified example
    
    // Update password in Firebase Auth
    await admin.auth().updateUser(userId, {
      password: newPassword
    });
    
    // Invalidate all sessions (optional)
    await admin.auth().revokeRefreshTokens(userId);
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    next(error);
  }
};

/**
 * Delete user account
 */
const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    
    // Delete from Firebase Auth
    await admin.auth().deleteUser(userId);
    
    // Delete from Firestore
    await db.collection('users').doc(userId).delete();
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    next(error);
  }
};

/**
 * Get user's referrals
 */
const getUserReferrals = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    
    // Get user's referral code
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const referralCode = userDoc.data().referralCode;
    
    // Find users who were referred by this user
    const querySnapshot = await db.collection('users')
      .where('referredBy', '==', userId)
      .get();
    const referrals = [];
    querySnapshot.forEach((doc) => {
      referrals.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({
      referralCode,
      totalReferrals: referrals.length,
      referrals,
    });
  } catch (error) {
    console.error('Get referrals error:', error);
    next(error);
  }
};

/**
 * Add credits to user's account (admin only)
 */
const addCredits = async (req, res, next) => {
  try {
    const { userId, amount } = req.body;
    
    // In a real app, check if the current user is an admin
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({ message: 'Forbidden' });
    // }
    
    // Update user's credits
    await db.collection('users').doc(userId).update({
      credits: admin.firestore.FieldValue.increment(amount)
    });
    
    res.json({ message: `Added ${amount} credits to user ${userId}` });
  } catch (error) {
    console.error('Add credits error:', error);
    next(error);
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  updatePassword,
  deleteAccount,
  getUserReferrals,
  addCredits
};
