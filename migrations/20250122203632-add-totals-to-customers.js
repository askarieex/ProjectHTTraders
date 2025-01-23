'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add totalInvoices if it doesn't exist
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='Customers' and column_name='totalInvoices'
        ) THEN
          ALTER TABLE "Customers" ADD COLUMN "totalInvoices" INTEGER NOT NULL DEFAULT 0;
        END IF;
      END
      $$;
    `);

    // Add totalTransactions if it doesn't exist
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='Customers' and column_name='totalTransactions'
        ) THEN
          ALTER TABLE "Customers" ADD COLUMN "totalTransactions" FLOAT NOT NULL DEFAULT 0;
        END IF;
      END
      $$;
    `);

    // Add createdAt if it doesn't exist
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='Customers' and column_name='createdAt'
        ) THEN
          ALTER TABLE "Customers" ADD COLUMN "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW();
        END IF;
      END
      $$;
    `);

    // Add updatedAt if it doesn't exist
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='Customers' and column_name='updatedAt'
        ) THEN
          ALTER TABLE "Customers" ADD COLUMN "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW();
        END IF;
      END
      $$;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns if they exist
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='Customers' and column_name='totalInvoices'
        ) THEN
          ALTER TABLE "Customers" DROP COLUMN "totalInvoices";
        END IF;
      END
      $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='Customers' and column_name='totalTransactions'
        ) THEN
          ALTER TABLE "Customers" DROP COLUMN "totalTransactions";
        END IF;
      END
      $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='Customers' and column_name='createdAt'
        ) THEN
          ALTER TABLE "Customers" DROP COLUMN "createdAt";
        END IF;
      END
      $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='Customers' and column_name='updatedAt'
        ) THEN
          ALTER TABLE "Customers" DROP COLUMN "updatedAt";
        END IF;
      END
      $$;
    `);
  }
};
