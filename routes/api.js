// routes/api.js

// Import controllers
const itemController = require('../controllers/itemController');
const categoryController = require('../controllers/categoryController');
const invoiceController = require('../controllers/invoiceController');
const authController = require('../controllers/authController');
const unitController = require('../controllers/unitController');

// Import middleware
const { authenticateUser } = require('../middleware/authMiddleware');

// Import route files
const settingsRoutes = require('./settings');

module.exports = (app) => {
    // Auth routes
    app.post('/api/auth/login', authController.login);
    app.post('/api/auth/register', authController.register);

    // === Units Routes ===
    app.get('/api/units', unitController.getAllUnits);
    app.get('/api/units/categories/:categoryId', unitController.getUnitsByCategory);
    app.get('/api/units/validate', unitController.validateUnitForCategory);

    // === Item Routes ===
    // Get all items
    app.get('/api/items', authenticateUser, itemController.getAllItems);
    // Get one item
    app.get('/api/items/:id', authenticateUser, itemController.getItemById);
    // Create item
    app.post('/api/items', authenticateUser, itemController.createItem);
    // Update item
    app.put('/api/items/:id', authenticateUser, itemController.updateItem);
    // Delete item
    app.delete('/api/items/:id', authenticateUser, itemController.deleteItem);
    // Get items by category
    app.get('/api/categories/:categoryId/items', authenticateUser, itemController.getItemsByCategory);

    // === Category Routes ===
    // Get all categories
    app.get('/api/categories', authenticateUser, categoryController.getAllCategories);
    // Get one category
    app.get('/api/categories/:id', authenticateUser, categoryController.getCategoryById);
    // Create category
    app.post('/api/categories', authenticateUser, categoryController.createCategory);
    // Update category
    app.put('/api/categories/:id', authenticateUser, categoryController.updateCategory);
    // Delete category
    app.delete('/api/categories/:id', authenticateUser, categoryController.deleteCategory);

    // === Invoice Routes ===
    // Get all invoices
    app.get('/api/invoices', authenticateUser, invoiceController.getAllInvoices);
    // Get one invoice
    app.get('/api/invoices/:id', authenticateUser, invoiceController.getInvoiceById);
    // Create invoice
    app.post('/api/invoices', authenticateUser, invoiceController.createInvoice);
    // Update invoice
    app.put('/api/invoices/:id', authenticateUser, invoiceController.updateInvoice);
    // Delete invoice
    app.delete('/api/invoices/:id', authenticateUser, invoiceController.deleteInvoice);

    // === Settings Routes ===
    app.use('/api/settings', settingsRoutes);

    // Static uploads folder for serving QR codes and logos
    app.use('/uploads', express.static('uploads'));
}; 