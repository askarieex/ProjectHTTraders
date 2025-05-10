const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { authenticateUser } = require('../middleware/authMiddleware'); // Ensure authentication

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Get all items
router.get('/', itemController.getAllItems);

// Get item by ID
router.get('/:id', itemController.getItemById);

// Create a new item
router.post('/', itemController.createItem);

// Update an item
router.put('/:id', itemController.updateItem);

// Delete an item
router.delete('/:id', itemController.deleteItem);

module.exports = router;
