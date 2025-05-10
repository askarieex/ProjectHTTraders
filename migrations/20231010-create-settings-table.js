'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('settings', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            category: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: 'payment, company, gst, invoice, appearance, etc.'
            },
            key: {
                type: Sequelize.STRING,
                allowNull: false
            },
            value: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            userId: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            createdAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updatedAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // Add a unique constraint for category, key and userId
        await queryInterface.addIndex('settings', ['category', 'key', 'userId'], {
            unique: true,
            name: 'settings_category_key_userId_unique'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('settings');
    }
}; 