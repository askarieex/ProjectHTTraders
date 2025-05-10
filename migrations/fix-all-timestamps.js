'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Helper function to fix timestamps for a table
    const fixTableTimestamps = async (tableName) => {
      try {
        // Check if table exists
        const tables = await queryInterface.sequelize.query(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${tableName}'`,
          { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        
        if (tables.length === 0) {
          console.log(`Table ${tableName} does not exist. Skipping.`);
          return;
        }
        
        // Check if createdAt column exists
        const columns = await queryInterface.describeTable(tableName);
        
        // Add createdAt if needed
        if (!columns.createdAt) {
          try {
            await queryInterface.addColumn(tableName, 'createdAt', {
              type: Sequelize.DATE,
              allowNull: true
            });
            console.log(`Added createdAt to ${tableName}`);
          } catch (error) {
            console.log(`Error adding createdAt to ${tableName}:`, error.message);
          }
        }
        
        // Add updatedAt if needed
        if (!columns.updatedAt) {
          try {
            await queryInterface.addColumn(tableName, 'updatedAt', {
              type: Sequelize.DATE,
              allowNull: true
            });
            console.log(`Added updatedAt to ${tableName}`);
          } catch (error) {
            console.log(`Error adding updatedAt to ${tableName}:`, error.message);
          }
        }
        
        // Update existing records with current timestamp
        await queryInterface.sequelize.query(`
          UPDATE "${tableName}" 
          SET "createdAt" = NOW(), "updatedAt" = NOW() 
          WHERE "createdAt" IS NULL OR "updatedAt" IS NULL
        `);
        
        // Change columns to NOT NULL
        try {
          await queryInterface.changeColumn(tableName, 'createdAt', {
            type: Sequelize.DATE,
            allowNull: false
          });
          
          await queryInterface.changeColumn(tableName, 'updatedAt', {
            type: Sequelize.DATE,
            allowNull: false
          });
          console.log(`Set NOT NULL constraints on ${tableName} timestamps`);
        } catch (error) {
          console.error(`Error making timestamps NOT NULL in ${tableName}:`, error.message);
        }
      } catch (error) {
        console.error(`Error processing ${tableName}:`, error.message);
      }
    };
    
    // List of tables to fix (add any other tables that need timestamps)
    const tablesToFix = [
      'Items',
      'Categories',
      'Customers',
      'Invoices',
      'InvoiceItems',
      'Transactions'
    ];
    
    // Fix timestamps for each table
    for (const table of tablesToFix) {
      await fixTableTimestamps(table);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // No down migration for this fix
    console.log('No down migration implemented for timestamp fixes');
  }
}; 