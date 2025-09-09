const jwt = require('jsonwebtoken');
const { admin } = require('../config/firebase-simple');
const { AppError } = require('../utils/errors');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

// Get auth instance
const auth = admin.auth();

/**
 * Generate JWT token
 * @param {string} userId - User ID
 * @param {boolean} isRefreshToken - Whether to generate a refresh token
 * @returns {string} JWT token
 */
const generateToken = (userId, isRefreshToken = false) => {
  const expiresIn = isRefreshToken ? REFRESH_TOKEN_EXPIRES_IN : JWT_EXPIRES_IN;
  return jwt.sign(
    { 
      uid: userId,
      type: isRefreshToken ? 'refresh' : 'access',
      iss: 'charm-line-ai',
      aud: 'charm-line-ai-api'
    },
    JWT_SECRET,
    { expiresIn }
  );
};

/**
 * Create custom tokens (access and refresh)
 * @param {string} uid - User ID
 * @returns {Promise<{accessToken: string, refreshToken: string}>} Tokens
 */
const createCustomToken = async (uid) => {
  try {
    // Verify user exists
    await auth.getUser(uid);
    
    // Generate tokens
    const accessToken = generateToken(uid);
    const refreshToken = generateToken(uid, true);

    return { accessToken, refreshToken };
  } catch (error) {
    console.error('Error creating custom token:', error);
    if (error.code === 'auth/user-not-found') {
      throw new AppError('User not found', 404);
    }
    throw new AppError('Failed to create authentication tokens', 500);
  }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @param {boolean} isRefreshToken - Whether the token is a refresh token
 * @returns {Promise<Object>} Decoded token payload
 */
const verifyIdToken = async (token, isRefreshToken = false) => {
  try {
    // First verify the JWT signature and expiration
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'charm-line-ai',
      audience: 'charm-line-ai-api'
    });
    
    // Check token type
    if (isRefreshToken && decoded.type !== 'refresh') {
      throw new AppError('Invalid token type', 401);
    } else if (!isRefreshToken && decoded.type !== 'access') {
      throw new AppError('Invalid token type', 401);
    }

    // Verify the user still exists in Firebase Auth
    await auth.getUser(decoded.uid);
    
    return decoded;
  } catch (error) {
    console.error('Token verification error:', error);
    
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token has expired', 401);
    } else if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token', 401);
    } else if (error.code === 'auth/user-not-found') {
      throw new AppError('User no longer exists', 404);
    }
    
    // Re-throw the error if it's already an AppError
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError('Authentication failed', 401);
  }
};

/**
 * Middleware to authenticate requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError('No token provided', 401);
    }

    // Verify token
    const decoded = await verifyIdToken(token);
    
    // Get user data from Firebase Auth
    const userRecord = await auth.getUser(decoded.uid);
    
    // Add user to request object
    req.user = {
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      displayName: userRecord.displayName,
      type: decoded.type,
      customClaims: userRecord.customClaims || {}
    };

    next();
  } catch (error) {
    // Handle specific auth errors
    if (error.code === 'auth/user-not-found') {
      return next(new AppError('User not found', 404));
    } else if (error.code === 'auth/invalid-uid') {
      return next(new AppError('Invalid user ID', 400));
    }
    
    next(error);
  }
};

module.exports = {
  generateToken,
  verifyIdToken,
  createCustomToken,
  authenticate
};
