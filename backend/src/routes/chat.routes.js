const express = require('express');
const { body, query } = require('express-validator');
const { sendMessage, getChatHistory } = require('../controllers/chat.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validateRequest');


const router = express.Router();

// Apply JWT authentication middleware to all routes
router.use(authenticateToken);

// Send a message
router.post(
  '/send',
  [
    body('message')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Message is required')
      .isLength({ max: 4000 })
      .withMessage('Message must be less than 4000 characters'),
    body('style').optional().isString().isIn(['smooth','funny','flirty','confident']),
    body('imageBase64').optional().isString(),
    body('imageType').optional().isString(),
  ],
  validateRequest,
  sendMessage
);

// Get chat history
router.get(
  '/history',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  validateRequest,
  getChatHistory
);

module.exports = router;
