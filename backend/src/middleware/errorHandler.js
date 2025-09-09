/**
 * Error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Log the error with request details
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, {
    error: {
      message: err.message,
      name: err.name,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      code: err.code,
      ...(err.errors && { errors: err.errors })
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      params: req.params,
      query: req.query,
      headers: {
        'user-agent': req.headers['user-agent'],
        'x-forwarded-for': req.headers['x-forwarded-for']
      }
    }
  });
  
  // Default error status and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors;
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  
  // Handle specific error types
  switch (err.name) {
    case 'ValidationError':
      statusCode = 400;
      message = 'Validation Error';
      errorCode = 'VALIDATION_ERROR';
      errors = {};
      
      // Format validation errors
      for (const field in err.errors) {
        errors[field] = err.errors[field].message;
      }
      break;
      
    case 'MongoServerError':
      if (err.code === 11000) { // Duplicate key error
        statusCode = 409;
        const field = Object.keys(err.keyValue)[0];
        message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
        errorCode = 'DUPLICATE_KEY_ERROR';
      }
      break;
      
    case 'JsonWebTokenError':
      statusCode = 401;
      message = 'Invalid or malformed token';
      errorCode = 'INVALID_TOKEN';
      // Clear the invalid token cookie
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      break;
      
    case 'TokenExpiredError':
      statusCode = 401;
      message = 'Your session has expired. Please log in again.';
      errorCode = 'TOKEN_EXPIRED';
      // Clear the expired token cookie
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      break;
      
    case 'UnauthorizedError':
      statusCode = 401;
      message = 'You are not authorized to access this resource';
      errorCode = 'UNAUTHORIZED';
      break;
      
    case 'RateLimitError':
      statusCode = 429;
      message = 'Too many requests, please try again later';
      errorCode = 'RATE_LIMIT_EXCEEDED';
      break;
      
    default:
      // For unhandled errors, be generic in production
      if (process.env.NODE_ENV === 'production') {
        message = 'An unexpected error occurred';
      }
  }
  
  // Send error response
  const response = {
    success: false,
    message,
    code: errorCode,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      originalError: {
        name: err.name,
        message: err.message,
        ...(err.code && { code: err.code })
      }
    })
  };
  
  res.status(statusCode).json(response);
};

module.exports = { errorHandler };
