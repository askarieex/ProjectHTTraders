const express = require('express');
const router = express.Router();
const unitController = require('../controllers/unitController');
const { authenticateUser } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Get all units
router.get('/', unitController.getAllUnits);

// Get units by category
router.get('/categories/:categoryId', unitController.getUnitsByCategory);

// Validate if a unit is valid for a given category
router.get('/validate', unitController.validateUnitForCategory);

module.exports = router; 