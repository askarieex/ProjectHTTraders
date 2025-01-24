// migrations/20250124-remove-item-id-from-transactions.js

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove 'item_id' column if it exists
    const tableInfo = await queryInterface.describeTable('Transactions');
    if (tableInfo.hasOwnProperty('item_id')) {
      await queryInterface.removeColumn('Transactions', 'item_id');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Re-add 'item_id' column if needed
    await queryInterface.addColumn('Transactions', 'item_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Items', // Ensure this matches your Items table name
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  }
};
