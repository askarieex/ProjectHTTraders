module.exports = (sequelize, DataTypes) => {
    const Item = sequelize.define('Item', {
      name: { type: DataTypes.STRING, allowNull: false },
      dimension: DataTypes.STRING,
      quantity: { type: DataTypes.FLOAT, defaultValue: 0 },
      unit: DataTypes.STRING,
      selling_price: DataTypes.FLOAT
    }, { timestamps: false });
  
    Item.associate = models => {
      Item.belongsTo(models.Category, { foreignKey: 'category_id', onDelete: 'CASCADE' });
      Item.hasMany(models.Transaction, { foreignKey: 'item_id', onDelete: 'CASCADE' });
    };
  
    return Item;
  };
  