'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('uploads', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            type: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: 'Type of upload (qrCode, logo, etc)'
            },
            originalName: {
                type: Sequelize.STRING,
                allowNull: false
            },
            fileName: {
                type: Sequelize.STRING,
                allowNull: false
            },
            filePath: {
                type: Sequelize.STRING,
                allowNull: false
            },
            fileSize: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            mimeType: {
                type: Sequelize.STRING,
                allowNull: false
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

        // Add index for faster lookups
        await queryInterface.addIndex('uploads', ['type', 'userId']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('uploads');
    }
}; 