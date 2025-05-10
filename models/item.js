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
    },
    reorder_level: { // New Field for reorder threshold
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 10,
      validate: {
        min: 0
      }
    },
    length: { // Store length separately for easier manipulation
      type: DataTypes.FLOAT,
      allowNull: true
    },
    breadth: { // Store breadth separately
      type: DataTypes.FLOAT,
      allowNull: true
    },
    height: { // Store height separately
      type: DataTypes.FLOAT,
      allowNull: true
    },
    dim_unit: { // Dimension unit (cm, in, ft, m)
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'ft'
    },
    pieces: { // Number of pieces
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1
    },
    weight_per_piece: { // Weight per piece for weighted items
      type: DataTypes.FLOAT,
      allowNull: true
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
