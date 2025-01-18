require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
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

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const departmentRoutes = require('./routes/departments');
const authMiddleware = require('./middleware/authMiddleware');
// ... import other routes as needed

// Setup routes using asyncHandler if necessary
app.use('/api', authRoutes);             // e.g., login route
app.use('/api/users', userRoutes);
app.use('/api/departments', authMiddleware,departmentRoutes);
app.use('/api/categories', authMiddleware, categoryRoutes);



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
    // Optionally include stack traces in development:
    // stack: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
});

// Connect to DB, sync models, and start server
sequelize.authenticate()
  .then(() => {
    console.log('Database connected...');
    return sequelize.sync();
  })
  .then(() => {
    console.log('All models synchronized successfully.');
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch(err => console.error('Error connecting to the database or syncing models:', err));
