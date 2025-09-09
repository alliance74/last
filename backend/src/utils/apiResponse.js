/**
 * Utility functions for generating consistent API responses
 */

/**
 * Success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object} JSON response
 */
const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...(data !== null && { data }),
  });
};

/**
 * Error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} code - Error code
 * @param {*} errors - Additional error details
 * @returns {Object} JSON response
 */
const errorResponse = (res, message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(errors && { errors }),
  });
};

/**
 * Validation error response
 * @param {Object} res - Express response object
 * @param {Object} errors - Validation errors
 * @param {string} message - Error message (default: 'Validation Error')
 * @returns {Object} JSON response with 400 status code
 */
const validationError = (res, errors, message = 'Validation Error') => {
  return errorResponse(
    res,
    message,
    400,
    'VALIDATION_ERROR',
    errors
  );
};

/**
 * Not found response
 * @param {Object} res - Express response object
 * @param {string} message - Error message (default: 'Resource not found')
 * @returns {Object} JSON response with 404 status code
 */
const notFoundResponse = (res, message = 'Resource not found') => {
  return errorResponse(res, message, 404, 'NOT_FOUND');
};

/**
 * Unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Error message (default: 'Unauthorized')
 * @returns {Object} JSON response with 401 status code
 */
const unauthorizedResponse = (res, message = 'Unauthorized') => {
  return errorResponse(res, message, 401, 'UNAUTHORIZED');
};

/**
 * Forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Error message (default: 'Forbidden')
 * @returns {Object} JSON response with 403 status code
 */
const forbiddenResponse = (res, message = 'Forbidden') => {
  return errorResponse(res, message, 403, 'FORBIDDEN');
};

/**
 * Bad request response
 * @param {Object} res - Express response object
 * @param {string} message - Error message (default: 'Bad Request')
 * @param {*} errors - Additional error details
 * @returns {Object} JSON response with 400 status code
 */
const badRequestResponse = (res, message = 'Bad Request', errors = null) => {
  return errorResponse(res, message, 400, 'BAD_REQUEST', errors);
};

/**
 * Conflict response
 * @param {Object} res - Express response object
 * @param {string} message - Error message (default: 'Conflict')
 * @returns {Object} JSON response with 409 status code
 */
const conflictResponse = (res, message = 'Conflict') => {
  return errorResponse(res, message, 409, 'CONFLICT');
};

module.exports = {
  successResponse,
  errorResponse,
  validationError,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  badRequestResponse,
  conflictResponse,
};
