// routes/transactions.js

const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/authMiddleware');

// If you want to protect these routes, use authMiddleware
router.use(authMiddleware);

// CRUD endpoints
router.get('/', asyncHandler(transactionController.getAllTransactions));
router.post('/', asyncHandler(transactionController.createTransaction));
router.get('/:id', asyncHandler(transactionController.getTransactionById));
router.put('/:id', asyncHandler(transactionController.updateTransaction));
router.delete('/:id', asyncHandler(transactionController.deleteTransaction));

module.exports = router;
