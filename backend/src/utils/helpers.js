/**
 * Generate a random referral code
 * @returns {string} 8-character alphanumeric code
 */
const generateReferralCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Format error message for validation errors
 * @param {Array} errors - Array of validation errors
 * @returns {Object} Formatted error response
 */
const formatValidationErrors = (errors) => {
  const formattedErrors = {};
  errors.array().forEach(error => {
    if (!formattedErrors[error.param]) {
      formattedErrors[error.param] = [];
    }
    formattedErrors[error.param].push(error.msg);
  });
  return formattedErrors;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Format date to readable string
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Calculate the difference between two dates in days
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number} Difference in days
 */
const dateDiffInDays = (date1, date2) => {
  const diffTime = Math.abs(date2 - date1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

module.exports = {
  generateReferralCode,
  formatValidationErrors,
  isValidEmail,
  formatDate,
  dateDiffInDays,
};
