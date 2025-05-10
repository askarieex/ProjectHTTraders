const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const itemController = require('../controllers/itemController');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Routes for categories
router.get('/', asyncHandler(categoryController.getAllCategories));
router.post('/', asyncHandler(categoryController.createCategory));
router.get('/:id', asyncHandler(categoryController.getCategoryById));
router.put('/:id', asyncHandler(categoryController.updateCategory));
router.delete('/:id', asyncHandler(categoryController.deleteCategory));

// Add route for getting items by category ID
router.get('/:categoryId/items', asyncHandler(itemController.getItemsByCategory));

module.exports = router;
