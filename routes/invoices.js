// routes/invoices.js
const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateUser);

// GET endpoint for fetching invoices with filters
router.get('/', asyncHandler(invoiceController.getInvoices));

// POST endpoint for creating a new invoice
router.post('/', asyncHandler(invoiceController.createInvoice));

// NEW: GET endpoint for fetching the latest invoice number
router.get('/latest', asyncHandler(invoiceController.getLatestInvoice));

// NEW: Get invoice by ID
router.get('/:id', asyncHandler(invoiceController.getInvoiceById));

// routes/invoices.js
router.delete('/:id', asyncHandler(invoiceController.deleteInvoice));

// ... other invoice routes if needed ...
router.put('/:id', asyncHandler(invoiceController.updateInvoice));

// **NEW ROUTE**: GET endpoint to get the total number of invoices for a specific customer by customer ID
// Example: GET /api/invoices/total/8
router.get('/total/:customerId', asyncHandler(invoiceController.getTotalInvoicesByUser));

// Generate PDF for invoice
router.get('/:id/pdf', asyncHandler(invoiceController.generateInvoicePDF));

// Get invoice totals by customer
router.get('/customer/:customerId', asyncHandler(invoiceController.getInvoicesByCustomer));

module.exports = router;
