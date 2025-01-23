// models/invoiceItem.js
module.exports = (sequelize, DataTypes) => {
  const InvoiceItem = sequelize.define('InvoiceItem', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: { // New category field
      type: DataTypes.STRING,
      allowNull: true,
    },
    dimension: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    selling_price: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1,
    },
    subtotal: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    timestamps: false
  });

  // Define associations
  InvoiceItem.associate = models => {
    InvoiceItem.belongsTo(models.Invoice, { foreignKey: 'invoice_id', onDelete: 'CASCADE' });
    InvoiceItem.belongsTo(models.Item, { foreignKey: 'item_id', onDelete: 'SET NULL' });
  };

  return InvoiceItem;
};
