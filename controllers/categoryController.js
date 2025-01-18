require('dotenv').config();
const { Category, Department } = require('../models');

// Fetch all categories with associated department info
exports.getAll = async (req, res) => {
  try {
    const categories = await Category.findAll({
      include: [{
        model: Department,
        attributes: ['id', 'name']  // Adjust attributes as needed
      }]
    });
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: 'Error fetching categories', error });
  }
};

// Create a new category
exports.create = async (req, res) => {
  try {
    const newCategory = await Category.create(req.body);
    // Optionally include the associated department in the response
    const createdCategory = await Category.findByPk(newCategory.id, {
      include: [{
        model: Department,
        attributes: ['id', 'name']
      }]
    });
    res.status(201).json(createdCategory);
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ message: 'Error creating category', error });
  }
};

// Get category by ID with associated department info
exports.getById = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id, {
      include: [{
        model: Department,
        attributes: ['id', 'name']
      }]
    });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({ message: 'Error fetching category', error });
  }
};

// Update a category
exports.update = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    await category.update(req.body);
    // Fetch updated category with department info
    const updatedCategory = await Category.findByPk(category.id, {
      include: [{
        model: Department,
        attributes: ['id', 'name']
      }]
    });
    res.json(updatedCategory);
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ message: 'Error updating category', error });
  }
};

// Delete a category
exports.remove = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    await category.destroy();
    res.json({ message: 'Category deleted' });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ message: 'Error deleting category', error });
  }
};
