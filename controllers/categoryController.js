require('dotenv').config();
const { Category, Item } = require('../models');

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      include: [{ model: Item, attributes: ['id'] }]
    });
    
    // Add item count to each category
    const categoriesWithCount = categories.map(category => {
      const plainCategory = category.get({ plain: true });
      plainCategory.itemCount = plainCategory.Items ? plainCategory.Items.length : 0;
      delete plainCategory.Items; // Remove the items array
      return plainCategory;
    });
    
    res.json(categoriesWithCount);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
};

// Get a single category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id, {
      include: [{ model: Item }]
    });
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ message: 'Error fetching category', error: error.message });
  }
};

// Get items by category
exports.getItemsByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id, {
      include: [{ model: Item }]
    });
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(category.Items || []);
  } catch (error) {
    console.error('Error fetching items by category:', error);
    res.status(500).json({ message: 'Error fetching items', error: error.message });
  }
};
