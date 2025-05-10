// controllers/unitController.js
const unitConfig = require('../config/units');

// Get all units
exports.getAllUnits = (req, res) => {
    try {
        res.json({
            units: unitConfig.UNITS,
            unitTypes: unitConfig.UNIT_TYPES,
            dimensionUnits: unitConfig.DIMENSION_UNITS
        });
    } catch (error) {
        console.error("Error fetching units:", error);
        res.status(500).json({ message: 'Error fetching units', error: error.message });
    }
};

// Get units for a specific category
exports.getUnitsByCategory = (req, res) => {
    try {
        const { categoryId } = req.params;

        if (!categoryId) {
            return res.status(400).json({ message: 'Category ID is required' });
        }

        const units = unitConfig.getUnitsForCategory(categoryId);

        res.json(units);
    } catch (error) {
        console.error("Error fetching units for category:", error);
        res.status(500).json({ message: 'Error fetching units for category', error: error.message });
    }
};

// Validate if a unit is compatible with a category
exports.validateUnitForCategory = (req, res) => {
    try {
        const { unit, categoryId } = req.query;

        if (!unit || !categoryId) {
            return res.status(400).json({ message: 'Unit and category ID are required' });
        }

        const isValid = unitConfig.isUnitValidForCategory(unit, categoryId);

        res.json({ isValid });
    } catch (error) {
        console.error("Error validating unit for category:", error);
        res.status(500).json({ message: 'Error validating unit for category', error: error.message });
    }
}; 