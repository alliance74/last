const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase.cjs');

/**
 * Middleware to verify JWT token
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Try to get token from Authorization header first
    let token;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } 
    // If not in header, try to get from cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
        code: 'UNAUTHORIZED'
      });
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user data from Firestore
      const userDoc = await db.collection('users').doc(decoded.uid).get();
      
      if (userDoc.exists) {
        // Attach user info to request object with Firestore data
        req.user = {
          uid: decoded.uid,
          email: decoded.email,
          ...userDoc.data()
        };
      } else {
        // Fallback: allow request with minimal decoded claims
        // This avoids logging users out if the Firestore profile hasn't been created yet
        req.user = {
          uid: decoded.uid,
          email: decoded.email,
        };
      }
      
      next();
    } catch (error) {
      console.error('Error verifying token:', error);
      // Clear invalid token cookie
      res.clearCookie('token');
      
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      code: 'AUTH_ERROR'
    });
  }
};

module.exports = {
  authenticateToken
};
