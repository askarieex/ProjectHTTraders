const express = require('express');
const router = express.Router();
const cutController = require('../controllers/cutController');
const { authenticateUser } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Calculate cutting possibilities
router.post('/calculate', cutController.calculateCut);

// Cut a piece from an existing inventory item
router.post('/item', cutController.cutItem);

module.exports = router; 