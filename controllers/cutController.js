const { Item, Transaction, sequelize } = require('../models');
const { calculateCutPieces, formatDimensions, computeQuantity } = require('../utils/convert');

/**
 * Cut a piece from an existing inventory item
 */
exports.cutItem = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const {
            itemId,
            targetDims: { length, breadth, height },
            pieces = 1,
            createOffcut = false,
            dim_unit = 'ft'
        } = req.body;

        // Validate request
        if (!itemId || !length || !breadth || !height) {
            return res.status(400).json({
                message: 'Required fields missing: itemId and targetDims (length, breadth, height)'
            });
        }

        // Find the source item
        const sourceItem = await Item.findByPk(itemId, { transaction });
        if (!sourceItem) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Item not found' });
        }

        // Ensure the item has dimensions
        if (!sourceItem.length || !sourceItem.breadth || !sourceItem.height) {
            await transaction.rollback();
            return res.status(400).json({
                message: 'Source item does not have dimensions specified'
            });
        }

        // Calculate how many pieces can be cut
        const sourceVolume = sourceItem.length * sourceItem.breadth * sourceItem.height;
        const targetVolume = length * breadth * height;

        const {
            pieces: maxPieces,
            consumedVolume,
            leftoverVolume
        } = calculateCutPieces({
            sourceLength: sourceItem.length,
            sourceBreadth: sourceItem.breadth,
            sourceHeight: sourceItem.height,
            targetLength: length,
            targetBreadth: breadth,
            targetHeight: height,
            dim_unit: dim_unit || sourceItem.dim_unit,
            unit: sourceItem.unit
        });

        // Check if request exceeds available stock
        const requestedPieces = parseInt(pieces);
        if (requestedPieces > maxPieces) {
            await transaction.rollback();
            return res.status(400).json({
                message: `Cannot cut ${requestedPieces} pieces. Maximum available: ${maxPieces}`,
                maxPieces,
                availableVolume: sourceVolume
            });
        }

        // Calculate actual consumed volume based on requested pieces
        const actualConsumedVolume = targetVolume * requestedPieces;
        const actualLeftoverVolume = sourceVolume - actualConsumedVolume;

        // Update source item's volume
        const updatedQuantity = computeQuantity({
            unit: sourceItem.unit,
            length: sourceItem.length,
            breadth: sourceItem.breadth,
            height: sourceItem.height,
            dim_unit: sourceItem.dim_unit,
            pieces: sourceItem.pieces,
            quantityRaw: actualLeftoverVolume
        });

        await sourceItem.update({
            quantity: updatedQuantity,
            // If all volume used, clear dimensions
            length: actualLeftoverVolume > 0 ? sourceItem.length : null,
            breadth: actualLeftoverVolume > 0 ? sourceItem.breadth : null,
            height: actualLeftoverVolume > 0 ? sourceItem.height : null,
            dimension: actualLeftoverVolume > 0 ? sourceItem.dimension : null,
            // Decrement pieces count if tracking pieces
            pieces: sourceItem.pieces > requestedPieces
                ? sourceItem.pieces - requestedPieces
                : 0
        }, { transaction });

        // Create transaction record
        const transactionRecord = await Transaction.create({
            item_id: itemId,
            transaction_type: 'CUT',
            quantity: actualConsumedVolume,
            unit: sourceItem.unit,
            details: JSON.stringify({
                source: {
                    dimensions: sourceItem.dimension,
                    volume: sourceVolume
                },
                target: {
                    dimensions: formatDimensions(length, breadth, height, dim_unit),
                    volume: targetVolume,
                    pieces: requestedPieces
                },
                leftover: {
                    volume: actualLeftoverVolume
                }
            }),
            notes: `Cut ${requestedPieces} piece(s) of ${formatDimensions(length, breadth, height, dim_unit)}`
        }, { transaction });

        // If requested, create a new item for the offcut
        let offcutItem = null;
        if (createOffcut && actualLeftoverVolume > 0) {
            offcutItem = await Item.create({
                name: `${sourceItem.name} - Offcut`,
                category_id: sourceItem.category_id,
                length: sourceItem.length,
                breadth: sourceItem.breadth,
                height: sourceItem.height,
                dimension: sourceItem.dimension,
                quantity: computeQuantity({
                    unit: sourceItem.unit,
                    length: sourceItem.length,
                    breadth: sourceItem.breadth,
                    height: sourceItem.height,
                    dim_unit: sourceItem.dim_unit,
                    pieces: 1,
                    quantityRaw: actualLeftoverVolume
                }),
                unit: sourceItem.unit,
                selling_price: sourceItem.selling_price,
                purchasing_price: sourceItem.purchasing_price,
                reorder_level: 0,
                dim_unit: sourceItem.dim_unit,
                pieces: 1
            }, { transaction });
        }

        await transaction.commit();

        // Return updated item and transaction details
        return res.status(200).json({
            message: 'Item cut successfully',
            sourceItem: await Item.findByPk(itemId),
            transaction: transactionRecord,
            offcutItem: offcutItem,
            cutDetails: {
                pieces: requestedPieces,
                dimensions: formatDimensions(length, breadth, height, dim_unit),
                consumedVolume: actualConsumedVolume,
                leftoverVolume: actualLeftoverVolume
            }
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error cutting item:', error);
        return res.status(500).json({
            message: 'Error processing cut operation',
            error: error.message
        });
    }
};

/**
 * Calculate cutting possibilities without modifying the item
 */
exports.calculateCut = async (req, res) => {
    try {
        const {
            itemId,
            targetDims: { length, breadth, height },
            dim_unit = 'ft'
        } = req.body;

        // Validate request
        if (!itemId || !length || !breadth || !height) {
            return res.status(400).json({
                message: 'Required fields missing: itemId and targetDims (length, breadth, height)'
            });
        }

        // Find the source item
        const sourceItem = await Item.findByPk(itemId);
        if (!sourceItem) {
            return res.status(404).json({ message: 'Item not found' });
        }

        // Ensure the item has dimensions
        if (!sourceItem.length || !sourceItem.breadth || !sourceItem.height) {
            return res.status(400).json({
                message: 'Source item does not have dimensions specified'
            });
        }

        // Calculate how many pieces can be cut
        const {
            pieces: maxPieces,
            consumedVolume,
            leftoverVolume
        } = calculateCutPieces({
            sourceLength: sourceItem.length,
            sourceBreadth: sourceItem.breadth,
            sourceHeight: sourceItem.height,
            targetLength: length,
            targetBreadth: breadth,
            targetHeight: height,
            dim_unit: dim_unit || sourceItem.dim_unit,
            unit: sourceItem.unit
        });

        // Return calculation results
        return res.status(200).json({
            maxPieces,
            sourceItem: {
                id: sourceItem.id,
                name: sourceItem.name,
                dimensions: sourceItem.dimension,
                volume: sourceItem.length * sourceItem.breadth * sourceItem.height,
                unit: sourceItem.unit
            },
            targetDimensions: formatDimensions(length, breadth, height, dim_unit),
            consumedVolume,
            leftoverVolume
        });
    } catch (error) {
        console.error('Error calculating cut:', error);
        return res.status(500).json({
            message: 'Error calculating cut operation',
            error: error.message
        });
    }
}; 