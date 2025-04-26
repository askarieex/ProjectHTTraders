// controllers/itemController.js 
const { Item, Category, Department } = require('../models'); // Adjust the path as necessary

// Fetch all items, optionally filtered by category_id
exports.getAllItems = async (req, res) => {
  try {
    const { category_id } = req.query;
    const filter = category_id ? { category_id } : {};

    const items = await Item.findAll({
      where: filter,
      include: [{
        model: Category,
        attributes: ['id', 'name', 'department_id'],
        include: [{
          model: Department,
          attributes: ['id', 'name']
        }]
      }]
    });

    res.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ message: 'Error fetching items', error: error.message });
  }
};

// Create a new item
exports.createItem = async (req, res) => {
  try {
    const { name, type, quantity, length, breadth, height, selling_price, purchasing_price, unit, category_id } = req.body;

    // Validate required fields
    if (!name || !unit || category_id === undefined || purchasing_price === undefined) {
      return res.status(400).json({ message: 'Name, unit, category_id, and purchasing_price are required.' });
    }

    // Ensure the category exists
    const category = await Category.findByPk(category_id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    // Validate numeric fields to prevent sending empty strings
    if (isNaN(quantity) || isNaN(selling_price) || isNaN(purchasing_price)) {
      return res.status(400).json({ message: 'Quantity and prices must be valid numbers.' });
    }

    // Construct dimension string conditionally
    let dimension = `${length} x ${breadth}`;
    if (height !== undefined && height !== null && height !== '') {
      dimension += ` x ${height}`;
    }

    const newItem = await Item.create({
      name,
      type,
      quantity: Number(quantity),
      dimension,
      selling_price: Number(selling_price),
      purchasing_price: Number(purchasing_price), // Handle purchasing_price
      unit,
      category_id
    });

    // Fetch the newly created item with associations
    const createdItem = await Item.findByPk(newItem.id, {
      include: [{
        model: Category,
        attributes: ['id', 'name'],
        include: [{
          model: Department,
          attributes: ['id', 'name']
        }]
      }]
    });

    res.status(201).json(createdItem);
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
};

// Get item by ID
exports.getItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Item.findByPk(id, {
      include: [{
        model: Category,
        attributes: ['id', 'name'],
        include: [{
          model: Department,
          attributes: ['id', 'name']
        }]
      }]
    });

    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    res.json(item);
  } catch (error) {
    console.error("Error fetching item:", error);
    res.status(500).json({ message: 'Error fetching item', error: error.message });
  }
};

// Update an item
exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, quantity, length, breadth, height, selling_price, purchasing_price, unit, category_id } = req.body;

    const item = await Item.findByPk(id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    // If category_id is being updated, ensure the new category exists
    if (category_id && category_id !== item.category_id) {
      const category = await Category.findByPk(category_id);
      if (!category) {
        return res.status(404).json({ message: 'New category not found.' });
      }
    }

    // Validate numeric fields if they are being updated
    if ((quantity !== undefined && isNaN(quantity)) ||
        (selling_price !== undefined && isNaN(selling_price)) ||
        (purchasing_price !== undefined && isNaN(purchasing_price))) {
      return res.status(400).json({ message: 'Quantity and prices must be valid numbers.' });
    }

    // Construct dimension string conditionally
    let dimension = item.dimension; // Default to existing dimension
    if (length !== undefined && breadth !== undefined) {
      dimension = `${length} x ${breadth}`;
      if (height !== undefined && height !== null && height !== '') {
        dimension += ` x ${height}`;
      }
    }

    await item.update({
      name: name !== undefined ? name : item.name,
      type: type !== undefined ? type : item.type,
      quantity: quantity !== undefined ? Number(quantity) : item.quantity,
      dimension, // Updated dimension
      selling_price: selling_price !== undefined ? Number(selling_price) : item.selling_price,
      purchasing_price: purchasing_price !== undefined ? Number(purchasing_price) : item.purchasing_price, // Handle purchasing_price
      unit: unit !== undefined ? unit : item.unit,
      category_id: category_id !== undefined ? category_id : item.category_id,
    });

    // Fetch the updated item with associations
    const updatedItem = await Item.findByPk(item.id, {
      include: [{
        model: Category,
        attributes: ['id', 'name'],
        include: [{
          model: Department,
          attributes: ['id', 'name']
        }]
      }]
    });

    res.json(updatedItem);
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ message: 'Error updating item', error: error.message });
  }
};

// Delete an item
exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Item.findByPk(id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    await item.destroy();

    res.json({ message: 'Item deleted successfully.' });
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ message: 'Error deleting item.', error: error.message });
  }
};
