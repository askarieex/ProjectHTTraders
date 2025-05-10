// controllers/itemController.js 
const { Item, Category } = require('../models'); // Adjust the path as necessary
const { computeQuantity } = require('../utils/convert'); // Import our quantity computation utility
const unitConfig = require('../config/units'); // Import the unit configuration

// Fetch all items, optionally filtered by category_id
exports.getAllItems = async (req, res) => {
  try {
    const { category_id } = req.query;
    const filter = category_id ? { category_id } : {};

    const items = await Item.findAll({
      where: filter,
      include: [{
        model: Category,
        attributes: ['id', 'name']
      }]
    });

    res.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ message: 'Error fetching items', error: error.message });
  }
};

// Get items by category ID - new endpoint for Stock.jsx
exports.getItemsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const items = await Item.findAll({
      where: { category_id: categoryId },
      include: [{
        model: Category,
        attributes: ['id', 'name']
      }]
    });

    res.json(items);
  } catch (error) {
    console.error("Error fetching items by category:", error);
    res.status(500).json({ message: 'Error fetching items by category', error: error.message });
  }
};

// Create a new item
exports.createItem = async (req, res) => {
  try {
    const {
      name,
      quantity: quantityRaw,
      length,
      breadth,
      height,
      selling_price,
      purchasing_price,
      unit,
      category_id,
      reorder_level,
      dimension,
      dim_unit,
      pieces,
      weight_per_piece
    } = req.body;

    // Validate required fields
    if (!name || !unit || category_id === undefined || !selling_price || !purchasing_price || !reorder_level) {
      return res.status(400).json({ message: 'Name, unit, category_id, selling_price, purchasing_price, and reorder_level are required.' });
    }

    // Ensure the category exists
    const category = await Category.findByPk(category_id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    // Validate that the unit is allowed for this category
    if (!unitConfig.isUnitValidForCategory(unit, category_id)) {
      return res.status(400).json({
        message: `Unit '${unit}' is not valid for the selected category.`,
        allowedUnits: unitConfig.getUnitsForCategory(category_id)
      });
    }

    // Validate numeric fields
    if (isNaN(quantityRaw) || isNaN(selling_price) || isNaN(purchasing_price) || isNaN(reorder_level)) {
      return res.status(400).json({ message: 'Quantity, prices, and reorder level must be valid numbers.' });
    }

    // Check if dimensions are provided and required
    const hasDimensions = length || breadth || height;
    // If dimensions are being used, validate they're complete
    if (hasDimensions && unitConfig.isDimensionsSupported(unit) && (!length || !breadth)) {
      return res.status(400).json({
        message: `When specifying dimensions for '${unit}', both length and breadth are required.`
      });
    }

    // Check if weight is required for this unit type
    const isWeightRequired = unitConfig.isWeightRequired(unit);
    if (isWeightRequired && !weight_per_piece) {
      return res.status(400).json({
        message: `Weight per piece is required for unit type '${unit}'.`
      });
    }

    // Calculate dimension string if not provided but individual dimensions are
    let dimensionString = dimension;
    if (!dimensionString && length && breadth) {
      dimensionString = `${length} x ${breadth}${height ? ` x ${height}` : ''}`;
    }

    // Calculate normalized quantity using our utility function
    const computedQuantity = computeQuantity({
      unit,
      length: parseFloat(length) || null,
      breadth: parseFloat(breadth) || null,
      height: parseFloat(height) || null,
      dim_unit: dim_unit || 'ft',
      pieces: parseInt(pieces) || 1,
      quantityRaw: parseFloat(quantityRaw) || 0,
      weightPerPiece: parseFloat(weight_per_piece) || null
    });

    // Create the item with all the fields from the request
    const newItem = await Item.create({
      name,
      quantity: computedQuantity,
      selling_price: Number(selling_price),
      purchasing_price: Number(purchasing_price),
      unit,
      category_id,
      reorder_level: Number(reorder_level),
      // Handle dimensions
      length: length ? Number(length) : null,
      breadth: breadth ? Number(breadth) : null,
      height: height ? Number(height) : null,
      dimension: dimensionString,
      // New fields
      dim_unit: dim_unit || 'ft',
      pieces: parseInt(pieces) || 1,
      weight_per_piece: weight_per_piece ? Number(weight_per_piece) : null
    });

    // Fetch the newly created item with its category
    const createdItem = await Item.findByPk(newItem.id, {
      include: [{
        model: Category,
        attributes: ['id', 'name']
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
        attributes: ['id', 'name']
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
    const {
      name,
      quantity: quantityRaw,
      length,
      breadth,
      height,
      selling_price,
      purchasing_price,
      unit,
      category_id,
      reorder_level,
      dimension,
      dim_unit,
      pieces,
      weight_per_piece
    } = req.body;

    const item = await Item.findByPk(id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    // If category_id is being updated, ensure the new category exists
    const newCategoryId = category_id !== undefined ? category_id : item.category_id;

    if (newCategoryId !== item.category_id) {
      const category = await Category.findByPk(newCategoryId);
      if (!category) {
        return res.status(404).json({ message: 'New category not found.' });
      }
    }

    // If unit is being changed, validate it against the category
    const newUnit = unit !== undefined ? unit : item.unit;

    if (newUnit !== item.unit && !unitConfig.isUnitValidForCategory(newUnit, newCategoryId)) {
      return res.status(400).json({
        message: `Unit '${newUnit}' is not valid for the selected category.`,
        allowedUnits: unitConfig.getUnitsForCategory(newCategoryId)
      });
    }

    // Validate numeric fields if they are being updated
    if ((quantityRaw !== undefined && isNaN(quantityRaw)) ||
      (selling_price !== undefined && isNaN(selling_price)) ||
      (purchasing_price !== undefined && isNaN(purchasing_price)) ||
      (reorder_level !== undefined && isNaN(reorder_level))) {
      return res.status(400).json({ message: 'Quantity, prices, and reorder level must be valid numbers.' });
    }

    // Check dimensions only if they're being modified in this update
    const hasDimensions = length !== undefined || breadth !== undefined || height !== undefined;
    // If dimensions are being modified, validate they're complete for units that support dimensions
    if (hasDimensions && unitConfig.isDimensionsSupported(newUnit)) {
      const newLength = length !== undefined ? length : item.length;
      const newBreadth = breadth !== undefined ? breadth : item.breadth;

      if (!newLength || !newBreadth) {
        return res.status(400).json({
          message: `When specifying dimensions for '${newUnit}', both length and breadth are required.`
        });
      }
    }

    // Check if weight is required for this unit type
    const isWeightRequired = unitConfig.isWeightRequired(newUnit);
    if (isWeightRequired && unit !== item.unit) {
      const newWeightPerPiece = weight_per_piece !== undefined ? weight_per_piece : item.weight_per_piece;

      if (!newWeightPerPiece) {
        return res.status(400).json({
          message: `Weight per piece is required for unit type '${newUnit}'.`
        });
      }
    }

    // Calculate dimension string if individual dimensions are provided
    let dimensionString = dimension;
    const newLength = length !== undefined ? (length ? Number(length) : null) : item.length;
    const newBreadth = breadth !== undefined ? (breadth ? Number(breadth) : null) : item.breadth;
    const newHeight = height !== undefined ? (height ? Number(height) : null) : item.height;
    const newDimUnit = dim_unit !== undefined ? dim_unit : item.dim_unit || 'ft';
    const newPieces = pieces !== undefined ? parseInt(pieces) : item.pieces || 1;
    const newWeightPerPiece = weight_per_piece !== undefined ?
      (weight_per_piece ? Number(weight_per_piece) : null) : item.weight_per_piece;

    if (dimensionString === undefined && (newLength !== item.length || newBreadth !== item.breadth || newHeight !== item.height)) {
      // Calculate a new dimension string only if the dimensions have changed
      if (newLength && newBreadth) {
        dimensionString = `${newLength} x ${newBreadth}${newHeight ? ` x ${newHeight}` : ''}`;
      } else {
        dimensionString = null;  // Clear dimension if length or breadth is null
      }
    }

    // Calculate normalized quantity using our utility function
    const computedQuantity = computeQuantity({
      unit: newUnit,
      length: newLength,
      breadth: newBreadth,
      height: newHeight,
      dim_unit: newDimUnit,
      pieces: newPieces,
      quantityRaw: quantityRaw !== undefined ? parseFloat(quantityRaw) : item.quantity,
      weightPerPiece: newWeightPerPiece
    });

    // Update the item with all provided fields
    await item.update({
      name: name !== undefined ? name : item.name,
      quantity: computedQuantity,
      selling_price: selling_price !== undefined ? Number(selling_price) : item.selling_price,
      purchasing_price: purchasing_price !== undefined ? Number(purchasing_price) : item.purchasing_price,
      unit: newUnit,
      category_id: newCategoryId,
      reorder_level: reorder_level !== undefined ? Number(reorder_level) : item.reorder_level,
      // Handle dimensions
      length: newLength,
      breadth: newBreadth,
      height: newHeight,
      dimension: dimensionString !== undefined ? dimensionString : item.dimension,
      // New fields
      dim_unit: newDimUnit,
      pieces: newPieces,
      weight_per_piece: newWeightPerPiece
    });

    // Fetch the updated item with its category
    const updatedItem = await Item.findByPk(item.id, {
      include: [{
        model: Category,
        attributes: ['id', 'name']
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
    res.status(500).json({ message: 'Error deleting item', error: error.message });
  }
};
