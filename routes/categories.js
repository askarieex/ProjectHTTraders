const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const categoryController = require('../controllers/categoryController');

// Define category CRUD routes wrapped with asyncHandler for error catching
router.get('/', asyncHandler(categoryController.getAll));
router.post('/', asyncHandler(categoryController.create));
router.get('/:id', asyncHandler(categoryController.getById));
router.put('/:id', asyncHandler(categoryController.update));
router.delete('/:id', asyncHandler(categoryController.remove));

module.exports = router;
