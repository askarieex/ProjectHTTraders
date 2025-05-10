require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize, Category } = require('./models');
const asyncHandler = require('./utils/asyncHandler');
const categoryRoutes = require('./routes/categories');  // Import categories route

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const departmentRoutes = require('./routes/departments');
const itemsRoutes = require('./routes/items'); // Import items routes
const customersRoutes = require('./routes/customers'); // Import customers routes
const { authenticateUser } = require('./middleware/authMiddleware');
const invoiceRoutes = require('./routes/invoices');
const transactionRoutes = require('./routes/transactions');
const cutRoutes = require('./routes/cut'); // Import new cut routes
const unitsRoutes = require('./routes/units'); // Import units routes
const settingsRoutes = require('./routes/settings'); // Import settings routes

// Setup routes using asyncHandler if necessary
app.use('/api/auth', authRoutes);             // e.g., login route
app.use('/api/users', userRoutes);
app.use('/api/departments', authenticateUser, departmentRoutes);
app.use('/api/categories', authenticateUser, categoryRoutes);
app.use('/api/items', authenticateUser, itemsRoutes);
app.use('/api/customers', authenticateUser, customersRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/transactions', authenticateUser, transactionRoutes);
app.use('/api/cut', authenticateUser, cutRoutes); // Register new cut routes
app.use('/api/units', unitsRoutes); // Register units routes
app.use('/api/settings', settingsRoutes); // Register settings routes

// Global error-handling middleware
app.use((err, req, res, next) => {
  console.error(err); // Log error details

  // Handle Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      message: 'Unique constraint violation',
      errors: err.errors.map(e => e.message),
    });
  }

  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      message: 'Validation error',
      errors: err.errors.map(e => e.message),
    });
  }

  // Default to 500 Internal Server Error
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    // stack: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
});

// Seed categories to make sure they exist
const seedCategories = async () => {
  try {
    const categories = [
      { id: 1, name: 'Timber/Wood' },
      { id: 2, name: 'Construction Materials' },
      { id: 3, name: 'Hardware' },
      { id: 4, name: 'Packaging' }
    ];

    for (const category of categories) {
      // Use upsert to create or update (if already exists)
      await Category.upsert(category);
    }
    console.log('Categories seeded successfully');
  } catch (error) {
    console.error('Error seeding categories:', error);
  }
};

// Connect to DB, sync models, and start server
sequelize.authenticate()
  .then(() => {
    console.log('Database connected...');
    // ***********  CRITICAL CHANGE HERE  ***********
    // Use { alter: true } so Sequelize adds missing columns like 'item_id'.
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    console.log('All models synchronized successfully.');
    app.listen(port, async () => {
      console.log(`Server running on port ${port}`);

      // Seed categories
      await seedCategories();
    });
  })
  .catch(err => console.error('Error connecting to the database or syncing models:', err));
