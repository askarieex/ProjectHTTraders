// routes/customers.js
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Existing CRUD routes for Customers
router.get('/', asyncHandler(customerController.getAllCustomers));
router.post('/', asyncHandler(customerController.createCustomer));
router.get('/:id', asyncHandler(customerController.getCustomerById));
router.put('/:id', asyncHandler(customerController.updateCustomer));
router.delete('/:id', asyncHandler(customerController.deleteCustomer));

// NEW: Endpoint to get invoices for a specific customer
router.get('/:id/invoices', asyncHandler(customerController.getCustomerInvoices));

module.exports = router;
