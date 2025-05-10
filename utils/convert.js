/**
 * Utility functions for stock quantity conversions
 */

const unitConfig = require('../config/units');

// Conversion factors
const CONVERSION_FACTORS = {
    // Length conversions to meters
    LENGTH: {
        m: 1,
        cm: 0.01,
        ft: 0.3048,
        in: 0.0254
    },
    // Volume conversions
    VOLUME: {
        CFT: 1, // Base unit for volume
        m3: 35.3147 // 1 cubic meter = 35.3147 cubic feet
    },
    // Area conversions
    AREA: {
        SFT: 1, // Base unit for area
        m2: 10.7639 // 1 square meter = 10.7639 square feet
    }
};

/**
 * Compute quantity based on dimensions, weight, or direct quantity
 */
exports.computeQuantity = function ({
    unit,
    length,
    breadth,
    height,
    dim_unit = 'ft',
    pieces = 1,
    quantityRaw = null,
    weightPerPiece = null
}) {
    // If raw quantity is provided and no dimensions or weight, use it directly
    if (quantityRaw !== null && !length && !breadth && !weightPerPiece) {
        return parseFloat(quantityRaw);
    }

    // For weight-based units
    if (unitConfig.isWeightRequired(unit) && weightPerPiece) {
        return parseFloat(weightPerPiece) * parseInt(pieces);
    }

    // For dimension-based units
    if (unitConfig.isDimensionsSupported(unit) && length && breadth) {
        // Calculate volume
        let volume = parseFloat(length) * parseFloat(breadth);
        if (height) {
            volume *= parseFloat(height);
        }

        // Convert from the dimension unit to the target unit (e.g., from feet to CFT)
        volume = convertDimensionToVolume(volume, dim_unit, unit);

        // Multiply by number of pieces
        return volume * parseInt(pieces);
    }

    // Fallback to raw quantity or default to 0
    return parseFloat(quantityRaw || 0);
};

/**
 * Format dimensions into a string
 */
exports.formatDimensions = function (length, breadth, height, dim_unit = 'ft') {
    if (!length || !breadth) return null;

    let dimString = `${length} x ${breadth}`;
    if (height && parseFloat(height) > 0) {
        dimString += ` x ${height}`;
    }

    return dimString;
};

/**
 * Check if dimensions are supported for this unit
 */
exports.isDimensionsSupported = function (unit) {
    return unitConfig.isDimensionsSupported(unit);
};

/**
 * Get available units for a category
 */
exports.getCategoryUnits = async function (categoryId) {
    return unitConfig.getUnitsForCategory(categoryId);
};

/**
 * Convert a volume from one unit to another
 */
exports.convertDimensionToVolume = function (volume, fromUnit, toUnit) {
    return convertDimensionToVolume(volume, fromUnit, toUnit);
};

/**
 * Calculate how many pieces of target dimensions can be cut from source dimensions
 */
exports.calculateCutPieces = function ({
    sourceLength,
    sourceBreadth,
    sourceHeight,
    sourceVolume,
    targetLength,
    targetBreadth,
    targetHeight,
    dim_unit = 'ft',
    unit
}) {
    // If we have source dimensions, calculate source volume
    if (sourceLength && sourceBreadth && sourceHeight) {
        sourceVolume = sourceLength * sourceBreadth * sourceHeight;
    }

    // Calculate target volume
    let targetVolume = targetLength * targetBreadth * targetHeight;

    // Both volumes are in the same unit (dim_unit), so no conversion needed

    // Number of pieces that can be cut (floor division)
    const pieces = Math.floor(sourceVolume / targetVolume);

    // Volume that will be consumed
    const consumedVolume = pieces * targetVolume;

    // Leftover volume
    const leftoverVolume = sourceVolume - consumedVolume;

    return {
        pieces,
        consumedVolume,
        leftoverVolume
    };
};

/**
 * Helper function to convert dimension-based volume between units
 */
function convertDimensionToVolume(volume, fromUnit, toUnit) {
    // If units are the same, no conversion needed
    if (fromUnit === toUnit) return volume;

    // Define conversion factors to cubic feet (CFT) as the canonical unit
    const toCFT = {
        'ft': 1,         // cubic feet is already in CFT
        'in': 1 / 1728,    // cubic inches to CFT (12^3 = 1728)
        'cm': 1 / 28316.8, // cubic cm to CFT
        'm': 35.3147     // cubic meters to CFT
    };

    // First convert to CFT
    let volumeInCFT = volume;
    if (fromUnit in toCFT) {
        volumeInCFT = volume * toCFT[fromUnit];
    }

    // Convert to unit-specific canonical volume
    if (toUnit === 'CFT') {
        return volumeInCFT;
    } else if (toUnit === 'CUM') {
        return volumeInCFT / 35.3147; // CFT to cubic meters
    }

    // For other units, return the CFT value as a reasonable fallback
    return volumeInCFT;
}

/**
 * Round to a specific precision to avoid floating point errors
 * @param {number} value - Value to round
 * @param {number} precision - Decimal places (default: 6)
 * @returns {number} Rounded value
 */
const roundToPrecision = (value, precision = 6) => {
    // For integer values like 336, this will return the exact integer
    // For values with many decimal places, it will round appropriately
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
}; 