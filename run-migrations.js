// run-migrations.js
require('dotenv').config();
const { sequelize } = require('./models');
const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');

async function runMigrations() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    console.log('Syncing database models...');
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized successfully.');

    // Run the category seeder
    console.log('Running category seeder...');
    const seeder = require('./migrations/seed-categories');
    await seeder.up(sequelize.getQueryInterface(), Sequelize);
    console.log('Categories seeded successfully.');

    console.log('All migrations completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations(); 