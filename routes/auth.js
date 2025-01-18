const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const asyncHandler = require('../utils/asyncHandler');

// Wrap the login route with asyncHandler for error catching
router.post('/login', asyncHandler(authController.login));

module.exports = router;
