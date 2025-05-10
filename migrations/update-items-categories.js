'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Step 1: Update Categories table with new fields
    await queryInterface.addColumn('Categories', 'defaultUnit', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    
    await queryInterface.addColumn('Categories', 'hasDimensions', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    
    await queryInterface.addColumn('Categories', 'hasSecondaryUnit', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    
    await queryInterface.addColumn('Categories', 'defaultSecondaryUnit', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    
    // Step 2: Update Items table with new fields
    await queryInterface.removeColumn('Items', 'dimension');
    
    await queryInterface.addColumn('Items', 'thickness', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    
    await queryInterface.addColumn('Items', 'width', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    
    await queryInterface.addColumn('Items', 'length', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    
    await queryInterface.addColumn('Items', 'dimensionUnit', {
      type: Sequelize.ENUM('feet', 'inches'),
      allowNull: true,
    });
    
    await queryInterface.addColumn('Items', 'cftPerPiece', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    
    await queryInterface.addColumn('Items', 'secondaryUnit', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    
    await queryInterface.addColumn('Items', 'secondaryQuantity', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    
    await queryInterface.addColumn('Items', 'reorderLevel', {
      type: Sequelize.FLOAT,
      defaultValue: 10,
      allowNull: true,
    });
    
    // Step 3: Update Categories with default values for predefined categories
    // Timber/Wood category
    await queryInterface.bulkUpdate(
      'Categories',
      {
        defaultUnit: 'CFT',
        hasDimensions: true,
        hasSecondaryUnit: true,
        defaultSecondaryUnit: 'Pieces'
      },
      { name: 'Timber/Wood' }
    );
    
    // Construction Material category
    await queryInterface.bulkUpdate(
      'Categories',
      {
        defaultUnit: 'Bags',
        hasDimensions: false,
        hasSecondaryUnit: false
      },
      { name: 'Construction Material' }
    );
    
    // Hardware category
    await queryInterface.bulkUpdate(
      'Categories',
      {
        defaultUnit: 'Kg',
        hasDimensions: false,
        hasSecondaryUnit: false
      },
      { name: 'Hardware' }
    );
    
    // Packaging category
    await queryInterface.bulkUpdate(
      'Categories',
      {
        defaultUnit: 'Pieces',
        hasDimensions: false,
        hasSecondaryUnit: false
      },
      { name: 'Packaging' }
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Revert changes to Categories table
    await queryInterface.removeColumn('Categories', 'defaultUnit');
    await queryInterface.removeColumn('Categories', 'hasDimensions');
    await queryInterface.removeColumn('Categories', 'hasSecondaryUnit');
    await queryInterface.removeColumn('Categories', 'defaultSecondaryUnit');
    
    // Revert changes to Items table
    await queryInterface.addColumn('Items', 'dimension', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    
    await queryInterface.removeColumn('Items', 'thickness');
    await queryInterface.removeColumn('Items', 'width');
    await queryInterface.removeColumn('Items', 'length');
    await queryInterface.removeColumn('Items', 'dimensionUnit');
    await queryInterface.removeColumn('Items', 'cftPerPiece');
    await queryInterface.removeColumn('Items', 'secondaryUnit');
    await queryInterface.removeColumn('Items', 'secondaryQuantity');
    await queryInterface.removeColumn('Items', 'reorderLevel');
  }
}; 