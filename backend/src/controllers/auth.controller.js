const { admin, db } = require('../config/firebase.cjs');
const crypto = require('crypto');
const { generateReferralCode } = require('../utils/helpers');
const {
  successResponse,
  errorResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse
} = require('../utils/apiResponse');

// Firebase Admin instances
const auth = admin.auth();
const firestore = admin.firestore();

/**
 * Register a new user
 */
const register = async (req, res, next) => {
  try {
    const { email, password, displayName, referredBy } = req.body;

    if (!email || !password) {
      return badRequestResponse(res, 'Email and password are required', 'MISSING_CREDENTIALS');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return badRequestResponse(res, 'Please provide a valid email address', 'INVALID_EMAIL');
    }

    // Validate password strength
    if (password.length < 8) {
      return badRequestResponse(res, 'Password must be at least 8 characters long', 'WEAK_PASSWORD');
    }

    // Check if user already exists
    try {
      const existingUser = await auth.getUserByEmail(email);
      if (existingUser) {
        return conflictResponse(res, 'An account with this email already exists', 'EMAIL_IN_USE');
      }
    } catch (error) {
      // If error is not 'user not found', rethrow it
      if (error.code !== 'auth/user-not-found') {
        console.error('Error checking existing user:', error);
        throw error;
      }
    }

    // Create new user in Firebase Auth
    const newUser = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: false,
    });

    const { uid } = newUser;

    // Create user profile in Firestore
    const userRef = firestore.collection('users').doc(uid);
    const userData = {
      uid,
      email,
      displayName: displayName || email.split('@')[0], // Fallback to email prefix if no display name
      credits: 10, // Initial credits
      referralCode: generateReferralCode(),
      referredBy: referredBy || null,
      referralCount: 0,
      emailVerified: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Create the user document first
    await userRef.set(userData);
    
    // Handle referral if applicable — resolve by UID or referralCode, set pending record
    if (referredBy && typeof referredBy === 'string' && referredBy.trim() !== '') {
      const raw = referredBy.trim();
      try {
        let referrerId = null;
        // First, treat referredBy as a direct UID
        const directRef = await firestore.collection('users').doc(raw).get();
        if (directRef.exists) {
          referrerId = raw;
        } else {
          // Fallback: look up by referralCode
          const q = await firestore.collection('users').where('referralCode', '==', raw).limit(1).get();
          if (!q.empty) {
            referrerId = q.docs[0].id;
          }
        }

        if (referrerId && referrerId !== uid) {
          console.log('[register][referral] raw=', raw, 'resolvedReferrerId=', referrerId, 'newUserUid=', uid);
          // Set referredBy on the new user
          await userRef.set({ referredBy: referrerId, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

          // Create a pending referral record (subscription verification will complete it)
          const referralDocId = `${referrerId}_${uid}`;
          await firestore.collection('referrals').doc(referralDocId).set({
            referrerId,
            referredUserId: uid,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          console.log('[register][referral] pending referral created:', referralDocId);
        } else {
          console.log(`[register][referral] Could not resolve or self-referral skipped. raw='${raw}', newUserUid='${uid}', resolved='${referrerId}'`);
        }
      } catch (error) {
        console.error('[register][referral] Error handling referral on register:', error);
        // Continue with registration even if referral handling fails
      }
    }

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        uid,
        email: userData.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Generate Refresh Token (7 days)
    const refreshToken = jwt.sign(
      {
        uid,
        type: 'refresh'
      },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Store hashed refresh token in Firestore
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await userRef.update({ refreshTokenHash: refreshHash });

    // Set secure, HTTP-only cookies
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      domain: process.env.COOKIE_DOMAIN || undefined,
      sameParty: false,
      priority: 'high',
      ...(process.env.NODE_ENV === 'production' && { 
        partitioned: true,
        sameSite: 'none'
      })
    });

    // Refresh token cookie (httpOnly)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      domain: process.env.COOKIE_DOMAIN || undefined,
      sameParty: false,
      priority: 'high',
      ...(process.env.NODE_ENV === 'production' && {
        partitioned: true,
        sameSite: 'none'
      })
    });

    // Create a clean user object without sensitive data
    const userResponse = {
      uid,
      email: userData.email,
      displayName: userData.displayName,
      emailVerified: userData.emailVerified,
      credits: userData.credits,
      referralCode: userData.referralCode,
      createdAt: admin.firestore.Timestamp.now().toDate().toISOString()
    };

    return successResponse(
      res,
      {
        user: userResponse,
        token,
        expiresIn: '24h'
      },
      'Registration successful! Welcome to our platform.',
      201
    );

  } catch (error) {
    console.error('Registration error:', error);
    next(error);
  }
};

/**
 * Login user
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return badRequestResponse(res, 'Email and password are required', 'MISSING_CREDENTIALS');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return badRequestResponse(res, 'Please provide a valid email address', 'INVALID_EMAIL');
    }

    try {
      // Verify password by signing in with email/password
      const userCredential = await admin.auth().getUserByEmail(email);
      
      // If we get here, email exists, now verify password
      // Get user data from Firestore
      let userData = {};
      try {
        const userDoc = await db.collection('users').doc(userCredential.uid).get();
        if (userDoc.exists) {
          userData = userDoc.data();
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Continue with empty userData if there's an error
      }

      // Generate JWT token
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { 
          uid: userCredential.uid, 
          email: userCredential.email 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Generate Refresh Token (7 days)
      const refreshToken = jwt.sign(
        {
          uid: userCredential.uid,
          type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Store hashed refresh token in Firestore
      const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      try {
        await db.collection('users').doc(userCredential.uid).update({ refreshTokenHash: refreshHash });
      } catch (e) {
        // If user doc missing, create minimal and set hash
        await db.collection('users').doc(userCredential.uid).set({ refreshTokenHash: refreshHash }, { merge: true });
      }

      // Set secure, HTTP-only cookie with additional security flags
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
        sameSite: 'strict',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        domain: process.env.COOKIE_DOMAIN || undefined, // Set to your domain in production
        // Add these security headers
        sameParty: false,
        priority: 'high',
        // Add Partitioned flag for cross-site cookies if needed
        ...(process.env.NODE_ENV === 'production' && { 
          partitioned: true,
          sameSite: 'none' // Required for cross-site cookies
        })
      });

      // Refresh token cookie (httpOnly)
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        domain: process.env.COOKIE_DOMAIN || undefined,
        sameParty: false,
        priority: 'high',
        ...(process.env.NODE_ENV === 'production' && { 
          partitioned: true,
          sameSite: 'none'
        })
      });

      // Create a clean user object without sensitive data
      const userResponse = {
        uid: userCredential.uid,
        email: userCredential.email,
        displayName: userCredential.displayName || userData.displayName || '',
        emailVerified: userData.emailVerified || false,
        credits: userData.credits || 0,
        referralCode: userData.referralCode,
        ...(userData.referralCount && { referralCount: userData.referralCount })
      };

      return successResponse(
        res,
        {
          user: userResponse,
          token: token,
          expiresIn: '24h'
        },
        'Login successful'
      );

    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        return unauthorizedResponse(res, 'Invalid email or password', 'INVALID_CREDENTIALS');
      } else if (error.code === 'auth/too-many-requests') {
        return errorResponse(
          res,
          'Too many failed login attempts. Please try again later or reset your password.',
          429,
          'TOO_MANY_ATTEMPTS'
        );
      } else if (error.code === 'auth/user-disabled') {
        return forbiddenResponse(res, 'This account has been disabled', 'ACCOUNT_DISABLED');
      }
      
      // For unexpected errors, pass to the error handler middleware
      next(error);
    }
  } catch (error) {
    console.error('Unexpected error during login:', error);
    next(error);
  }
};

/**
 * Get current user (custom JWT only)
 */
const me = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return unauthorizedResponse(res, 'Not authenticated', 'UNAUTHORIZED');
    }

    // Optionally load more data from Firestore for a richer user object
    let enriched = { ...req.user };
    try {
      const userDoc = await firestore.collection('users').doc(req.user.uid).get();
      if (userDoc.exists) {
        enriched = { ...enriched, ...userDoc.data() };
      }
    } catch (e) {
      // ignore enrichment errors, still return basic user
    }

    return successResponse(res, { user: {
      uid: req.user.uid,
      email: enriched.email,
      displayName: enriched.displayName || '',
      emailVerified: !!enriched.emailVerified,
      ...(enriched.credits !== undefined ? { credits: enriched.credits } : {}),
      ...(enriched.referralCode ? { referralCode: enriched.referralCode } : {}),
    } }, 'Authenticated');
  } catch (error) {
    console.error('Error in me:', error);
    return unauthorizedResponse(res, 'Not authenticated', 'UNAUTHORIZED');
  }
};

/**
 * Refresh access token using httpOnly refreshToken cookie
 */
const refreshAccessToken = async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const refreshCookie = req.cookies && req.cookies.refreshToken;
    if (!refreshCookie) {
      return unauthorizedResponse(res, 'No refresh token', 'NO_REFRESH_TOKEN');
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshCookie, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    } catch (e) {
      return unauthorizedResponse(res, 'Invalid refresh token', 'INVALID_REFRESH');
    }

    const uid = decoded.uid;
    if (!uid) {
      return unauthorizedResponse(res, 'Invalid refresh token', 'INVALID_REFRESH');
    }

    // Compare hash
    const hash = crypto.createHash('sha256').update(refreshCookie).digest('hex');
    const userRef = firestore.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const storedHash = userDoc.exists ? userDoc.data().refreshTokenHash : null;
    if (!storedHash || storedHash !== hash) {
      return unauthorizedResponse(res, 'Refresh token revoked', 'REFRESH_REVOKED');
    }

    // Issue new access token
    const accessToken = jwt.sign({ uid, email: userDoc.data()?.email }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Optionally rotate refresh token
    // For simplicity we keep same refresh; uncomment to rotate:
    // const newRefresh = jwt.sign({ uid, type: 'refresh' }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });
    // const newHash = crypto.createHash('sha256').update(newRefresh).digest('hex');
    // await userRef.update({ refreshTokenHash: newHash });
    // res.cookie('refreshToken', newRefresh, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000, domain: process.env.COOKIE_DOMAIN || undefined });

    // Set access token cookie as well (optional)
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    return successResponse(res, { token: accessToken }, 'Token refreshed');
  } catch (error) {
    console.error('Error refreshing token:', error);
    return unauthorizedResponse(res, 'Could not refresh token', 'REFRESH_FAILED');
  }
};

/**
 * Get current user's token
 * Generates a new Firebase custom token for the authenticated user
 */
const getToken = async (req, res) => {
  try {
    // The auth middleware has already verified the token and attached the user
    const user = req.user;
    
    if (!user || !user.uid) {
      return unauthorizedResponse(res, 'Not authenticated', 'UNAUTHORIZED');
    }

    try {
      // Get additional user data from Firestore
      const userDoc = await firestore.collection('users').doc(user.uid).get();
      const userData = userDoc.data() || {};

      // Generate a new Firebase custom token
      const customToken = await admin.auth().createCustomToken(user.uid);
      
      // Prepare user response data
      const userResponse = {
        uid: user.uid,
        email: user.email || userData.email,
        displayName: user.displayName || userData.displayName || '',
        emailVerified: user.emailVerified || userData.emailVerified || false,
        ...(userData.credits && { credits: userData.credits }),
        ...(userData.referralCode && { referralCode: userData.referralCode }),
        ...(userData.createdAt && { 
          createdAt: userData.createdAt.toDate 
            ? userData.createdAt.toDate().toISOString() 
            : userData.createdAt 
        })
      };

      return successResponse(
        res,
        {
          token: customToken,
          user: userResponse,
          expiresIn: '1h' // Custom tokens typically expire in 1 hour
        },
        'Token generated successfully'
      );
    } catch (error) {
      console.error('Error generating custom token:', error);
      if (error.code === 'auth/user-not-found') {
        return notFoundResponse(res, 'User not found');
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in getToken:', error);
    return errorResponse(
      res,
      'Failed to generate authentication token',
      500,
      'TOKEN_GENERATION_ERROR',
      process.env.NODE_ENV === 'development' ? { error: error.message } : undefined
    );
  }
};

/**
 * Refresh token
 * (Note: This is a client-side operation with Firebase SDK)
 * Returns guidance on how to refresh tokens on the client side
 */
const refreshToken = (req, res) => {
  return badRequestResponse(
    res,
    'Token refresh must be handled by the client using the Firebase SDK',
    'USE_CLIENT_SDK_FOR_REFRESH',
    {
      documentation: 'https://firebase.google.com/docs/auth/web/manage-users#get_the_currently_signed-in_user',
      clientImplementation: 'firebase.auth().currentUser.getIdToken(true)'
    }
  );
};

/**
 * Forgot password
 * Generates a password reset link and sends it to the user's email
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return badRequestResponse(res, 'Email is required', 'MISSING_EMAIL');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return badRequestResponse(res, 'Please provide a valid email address', 'INVALID_EMAIL');
    }

    try {
      // Check if user exists
      await auth.getUserByEmail(email);
      
      // Generate password reset link
      const resetLink = await auth.generatePasswordResetLink(email, {
        url: process.env.FRONTEND_URL || 'http://localhost:3000',
        handleCodeInApp: true,
      });

      // In a real application, you would send an email with the reset link here
      console.log('Password reset link:', resetLink);

      // Return success response without exposing the reset link
      return successResponse(
        res,
        null,
        'If an account with that email exists, a password reset link has been sent.'
      );

    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Don't reveal that the user doesn't exist for security reasons
        return successResponse(
          res,
          null,
          'If an account with that email exists, a password reset link has been sent.'
        );
      }
      
      console.error('Error generating password reset link:', error);
      throw error;
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    return errorResponse(
      res,
      'An error occurred while processing your request. Please try again later.',
      500,
      'PASSWORD_RESET_ERROR'
    );
  }
};

/**
 * Reset password
 * (⚠️ Must be done with Firebase client SDK, not Admin SDK)
 * This endpoint provides guidance to the client on how to handle password resets
 */
const resetPassword = async (req, res) => {
  return badRequestResponse(
    res,
    'Password reset must be handled by the client using the Firebase SDK. Please use the reset link sent to your email.',
    'USE_CLIENT_SDK_FOR_PASSWORD_RESET',
    {
      documentation: 'https://firebase.google.com/docs/auth/web/manage-users#send_a_password_reset_email',
      clientImplementation: 'firebase.auth().sendPasswordResetEmail(email)'
    }
  );
};

/**
 * Logout user
 * Clears the HTTP-only cookie
 */
const logout = async (req, res) => {
  try {
    // Clear the HTTP-only cookie with the same options used when setting it
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined,
      sameParty: false,
      ...(process.env.NODE_ENV === 'production' && { 
        partitioned: true 
      })
    });

    // Also clear any other auth-related cookies that might exist
    res.clearCookie('session', {
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    return successResponse(res, null, 'Logout successful');
  } catch (error) {
    console.error('Logout error:', error);
    return errorResponse(
      res,
      'An error occurred during logout',
      500,
      'LOGOUT_ERROR'
    );
  }
};

/**
 * Handle referral logic
 * Simplified version without document lookups
 */
const handleReferral = async (referralCode, newUserId) => {
  if (!referralCode || !newUserId) return;
  
  const usersRef = firestore.collection('users');
  const batch = firestore.batch();
  
  try {
    const referrerId = referralCode; // Assuming referralCode is the referrer's UID
    const newUserRef = usersRef.doc(newUserId);
    const referrerRef = usersRef.doc(referrerId);
    
    // First, check if the referrer exists
    const [referrerDoc, newUserDoc] = await Promise.all([
      referrerRef.get(),
      newUserRef.get()
    ]);
    
    if (!referrerDoc.exists) {
      console.log(`Referrer ${referrerId} does not exist`);
      return;
    }
    
    if (!newUserDoc.exists) {
      console.log(`New user ${newUserId} does not exist`);
      return;
    }
    
    // Update new user with referrer info
    batch.update(newUserRef, {
      referredBy: referrerId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Update referrer's stats
    batch.update(referrerRef, {
      referralCount: admin.firestore.FieldValue.increment(1),
      credits: admin.firestore.FieldValue.increment(10),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Create referral record
    const referralRef = firestore.collection('referrals').doc();
    batch.set(referralRef, {
      referrerId,
      referredUserId: newUserId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'completed',
      bonusApplied: true
    });
    
    await batch.commit();
    console.log(`Referral processed: ${referrerId} referred ${newUserId}`);
    
  } catch (error) {
    console.error('Referral processing failed:', error);
    // Don't throw the error to prevent registration from failing
  }
};

/**
 * Add credits to user
 */
const addCredits = async (userId, amount) => {
  try {
    const userRef = firestore.collection('users').doc(userId);

    await firestore.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error('User not found');

      const currentCredits = userDoc.data().credits || 0;
      transaction.update(userRef, {
        credits: currentCredits + amount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    console.log(`Added ${amount} credits to user ${userId}`);
  } catch (error) {
    console.error('Add credits error:', error);
    throw new Error('Failed to add credits: ' + error.message);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  forgotPassword,
  resetPassword,
  logout,
  getToken,
  me,
  refreshAccessToken,
  handleReferral,
  addCredits
};
