module.exports = (sequelize, DataTypes) => {
    const Transaction = sequelize.define('Transaction', {
      transaction_type: { type: DataTypes.ENUM('Sale', 'Purchase'), allowNull: false },
      quantity: { type: DataTypes.FLOAT, allowNull: false },
      price_per_unit: { type: DataTypes.FLOAT, allowNull: false },
      total_price: { type: DataTypes.FLOAT, allowNull: false }
    }, { timestamps: false });
  
    Transaction.associate = models => {
      Transaction.belongsTo(models.Item, { foreignKey: 'item_id', onDelete: 'CASCADE' });
    };
  
    Transaction.beforeCreate(transaction => {
      transaction.total_price = transaction.quantity * transaction.price_per_unit;
    });
  
    return Transaction;
  };
  