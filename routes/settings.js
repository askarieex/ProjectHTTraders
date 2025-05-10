const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateUser } = require('../middleware/authMiddleware');

// Apply authentication middleware to all settings routes
router.use(authenticateUser);

// Get all settings
router.get('/', settingsController.getAllSettings);

// Get settings by category (payment, company, gst, invoice, etc.)
router.get('/:category', settingsController.getSettingsByCategory);

// Save settings for a category
router.post('/:category', settingsController.uploadFiles, settingsController.saveSettings);

// Delete a specific setting
router.delete('/:category/:key', settingsController.deleteSetting);

// Reset settings to default for a category
router.post('/:category/reset', settingsController.resetSettings);

module.exports = router; 