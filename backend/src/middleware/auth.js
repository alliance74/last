const { auth } = require('../config/firebase.cjs');
const { AppError } = require('../utils/errors');
const { verifyIdToken } = require('../services/auth.service.js');

/**
 * Middleware to authenticate requests
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyIdToken(token);
    
    // Add user to request object
    req.user = { 
      uid: decoded.uid,
      // Add any additional user data you want to attach to the request
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    res.status(401).json({ message: 'Authentication failed' });
  }
};

/**
 * Middleware to check if user has admin role
 */
const isAdmin = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists() || userDoc.data().role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Middleware to check if user has a specific plan
 * @param {string} requiredPlan - Required plan (e.g., 'premium', 'pro')
 */
const hasPlan = (requiredPlan) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.uid;
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const userPlan = userDoc.data().plan;
      const planHierarchy = ['free', 'premium', 'pro'];
      
      if (planHierarchy.indexOf(userPlan) < planHierarchy.indexOf(requiredPlan)) {
        return res.status(403).json({ 
          message: `This feature requires a ${requiredPlan} plan` 
        });
      }
      
      next();
    } catch (error) {
      console.error('Plan check error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};

module.exports = { authenticate, isAdmin, hasPlan };
