const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/authMiddleware'); // Ensure authentication

// Apply authentication middleware to all item routes
router.use(authMiddleware);

// Define CRUD routes for Items
router.get('/', asyncHandler(itemController.getAllItems));
router.post('/', asyncHandler(itemController.createItem));
router.get('/:id', asyncHandler(itemController.getItemById));
router.put('/:id', asyncHandler(itemController.updateItem));
router.delete('/:id', asyncHandler(itemController.deleteItem));

module.exports = router;
