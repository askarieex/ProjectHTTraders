module.exports = (sequelize, DataTypes) => {
  const Invoice = sequelize.define('Invoice', {
    invoiceNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    invoiceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    discount: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    tax: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    taxType: {
      type: DataTypes.STRING,
      defaultValue: 'GST',
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: '₹',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    paymentTerms: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    total: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },

    // NEW FIELDS for Payment Method & Received Amount:
    paymentMethod: {
      type: DataTypes.STRING, // e.g., 'Cash', 'Bank', 'Cheque', 'UPI', 'Net Banking'
      allowNull: true,
    },
    receivedAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    invoicePendingAmount: { // NEW FIELD for pending amount
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

  }, {
    timestamps: true
  });

  // Associations
  Invoice.associate = models => {
    // Existing Associations
    Invoice.belongsTo(models.Customer, { foreignKey: 'customer_id', onDelete: 'SET NULL' });
    Invoice.hasMany(models.InvoiceItem, { foreignKey: 'invoice_id', onDelete: 'CASCADE' });

    // **NEW ASSOCIATION**: Invoice has one Transaction
    Invoice.hasOne(models.Transaction, { foreignKey: 'invoice_id', onDelete: 'CASCADE' });
  };

  return Invoice;
};
