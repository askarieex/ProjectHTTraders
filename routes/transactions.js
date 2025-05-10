// routes/transactions.js

const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Get all transactions
router.get('/', asyncHandler(transactionController.getAllTransactions));

// Get transaction by ID
router.get('/:id', asyncHandler(transactionController.getTransactionById));

// Create a new transaction
router.post('/', asyncHandler(transactionController.createTransaction));

// Update a transaction
router.put('/:id', asyncHandler(transactionController.updateTransaction));

// Delete a transaction
router.delete('/:id', asyncHandler(transactionController.deleteTransaction));

module.exports = router;
