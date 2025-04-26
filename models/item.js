// models/item.js
module.exports = (sequelize, DataTypes) => {
  const Item = sequelize.define('Item', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    dimension: {
      type: DataTypes.STRING,
      allowNull: true
    },
    quantity: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      allowNull: false
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false
    },
    selling_price: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    purchasing_price: { // New Field
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0
      }
    }
  }, {
    timestamps: false,
    tableName: 'Items' // Ensure table name consistency
  });

  Item.associate = models => {
    Item.belongsTo(models.Category, { foreignKey: 'category_id', onDelete: 'CASCADE' });
    Item.hasMany(models.Transaction, { foreignKey: 'item_id', onDelete: 'CASCADE' });
  };

  return Item;
};
