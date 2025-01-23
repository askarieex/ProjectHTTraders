// migrations/YYYYMMDDHHMMSS_add-totals-to-customers.js

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Customers', 'totalInvoices', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('Customers', 'totalTransactions', {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Customers', 'totalInvoices');
    await queryInterface.removeColumn('Customers', 'totalTransactions');
  }
};
