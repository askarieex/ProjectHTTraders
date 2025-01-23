// routes/users.js

const express = require('express');
const router = express.Router();

// Make sure this path is correct to your controller:
const userController = require('../controllers/userController');

// If you want to wrap controller methods in asyncHandler:
const asyncHandler = require('../utils/asyncHandler');

// Example usage of userController methods
// and wrapping them with asyncHandler to catch async errors:

// POST /api/users/  -> create a new user
router.post('/', asyncHandler(userController.createUser));

// POST /api/users/register -> call userController.register
router.post('/register', asyncHandler(userController.register));

// POST /api/users/login -> call userController.login
router.post('/login', asyncHandler(userController.login));

// GET /api/users/ -> get all users
router.get('/', asyncHandler(userController.getAllUsers));

// GET /api/users/:id -> get single user
router.get('/:id', asyncHandler(userController.getUserById));

// PUT /api/users/:id -> update user
router.put('/:id', asyncHandler(userController.updateUser));

// DELETE /api/users/:id -> delete user
router.delete('/:id', asyncHandler(userController.deleteUser));

module.exports = router;
