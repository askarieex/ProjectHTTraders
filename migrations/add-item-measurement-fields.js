'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn(
            'Items',
            'dim_unit',
            {
                type: Sequelize.STRING,
                allowNull: true,
                defaultValue: 'ft'
            }
        );

        await queryInterface.addColumn(
            'Items',
            'pieces',
            {
                type: Sequelize.INTEGER,
                allowNull: true,
                defaultValue: 1
            }
        );

        await queryInterface.addColumn(
            'Items',
            'weight_per_piece',
            {
                type: Sequelize.FLOAT,
                allowNull: true
            }
        );
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('Items', 'dim_unit');
        await queryInterface.removeColumn('Items', 'pieces');
        await queryInterface.removeColumn('Items', 'weight_per_piece');
    }
}; 