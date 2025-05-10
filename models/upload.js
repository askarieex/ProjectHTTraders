'use strict';

module.exports = (sequelize, DataTypes) => {
    const Upload = sequelize.define('Upload', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Type of upload (qrCode, logo, etc)'
        },
        originalName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        fileName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        filePath: {
            type: DataTypes.STRING,
            allowNull: false
        },
        fileSize: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        mimeType: {
            type: DataTypes.STRING,
            allowNull: false
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'User ID for user-specific uploads, null for global uploads'
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
        tableName: 'uploads',
        timestamps: true
    });

    // Define associations
    Upload.associate = function (models) {
        // Uploads can belong to a user
        Upload.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });
    };

    return Upload;
}; 