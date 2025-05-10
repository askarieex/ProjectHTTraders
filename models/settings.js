'use strict';

module.exports = (sequelize, DataTypes) => {
    const Settings = sequelize.define('Settings', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'payment, company, gst, invoice, appearance, etc.'
        },
        key: {
            type: DataTypes.STRING,
            allowNull: false
        },
        value: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'User ID for user-specific settings, null for global settings'
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        updatedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'settings',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['category', 'key', 'userId'],
                name: 'settings_category_key_userId_unique'
            }
        ]
    });

    // Define associations
    Settings.associate = function (models) {
        // Settings can belong to a user (optional)
        Settings.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });
    };

    return Settings;
}; 