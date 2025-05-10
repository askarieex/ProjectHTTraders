'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Step 1: First add timestamp columns as nullable
    try {
      await queryInterface.addColumn('Categories', 'createdAt', {
        type: Sequelize.DATE,
        allowNull: true
      });
      
      await queryInterface.addColumn('Categories', 'updatedAt', {
        type: Sequelize.DATE,
        allowNull: true
      });
    } catch (error) {
      console.log('Columns might already exist:', error.message);
    }
    
    // Step 2: Update all existing records with current timestamp
    await queryInterface.sequelize.query(`
      UPDATE "Categories" 
      SET "createdAt" = NOW(), "updatedAt" = NOW() 
      WHERE "createdAt" IS NULL OR "updatedAt" IS NULL
    `);
    
    // Step 3: Change columns to NOT NULL after populating them
    try {
      await queryInterface.changeColumn('Categories', 'createdAt', {
        type: Sequelize.DATE,
        allowNull: false
      });
      
      await queryInterface.changeColumn('Categories', 'updatedAt', {
        type: Sequelize.DATE,
        allowNull: false
      });
    } catch (error) {
      console.error('Error making columns NOT NULL:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // This is a fix migration, so down would be complex.
    // Consider if you really want to support reversing this.
    console.log('No down migration implemented for fix-timestamps');
  }
}; 