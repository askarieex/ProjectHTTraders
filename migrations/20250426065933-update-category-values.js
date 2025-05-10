'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Update Categories with default values for predefined categories
    
    // Timber/Wood category
    await queryInterface.bulkUpdate(
      'Categories',
      {
        defaultUnit: 'CFT',
        hasDimensions: true,
        hasSecondaryUnit: true,
        defaultSecondaryUnit: 'Pieces',
        updatedAt: new Date()
      },
      { name: 'Timber/Wood' }
    );
    
    // Construction Material category
    await queryInterface.bulkUpdate(
      'Categories',
      {
        defaultUnit: 'Bags',
        hasDimensions: false,
        hasSecondaryUnit: false,
        updatedAt: new Date()
      },
      { name: 'Construction Material' }
    );
    
    // Hardware category
    await queryInterface.bulkUpdate(
      'Categories',
      {
        defaultUnit: 'Kg',
        hasDimensions: false,
        hasSecondaryUnit: false,
        updatedAt: new Date()
      },
      { name: 'Hardware' }
    );
    
    // Packaging category
    await queryInterface.bulkUpdate(
      'Categories',
      {
        defaultUnit: 'Pieces',
        hasDimensions: false,
        hasSecondaryUnit: false,
        updatedAt: new Date()
      },
      { name: 'Packaging' }
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Revert changes to Categories table
    await queryInterface.bulkUpdate(
      'Categories',
      {
        defaultUnit: null,
        hasDimensions: false,
        hasSecondaryUnit: false,
        defaultSecondaryUnit: null,
        updatedAt: new Date()
      },
      {} // All records
    );
  }
};
