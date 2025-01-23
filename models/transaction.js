module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'customer_id'
    },
    invoice_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'invoice_id'
    },
    referenceId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    transactionDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'transactionDate'
    },
    transactionType: {
      type: DataTypes.ENUM('Credit', 'Debit'),
      allowNull: false,
      field: 'transaction_type'
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    paymentMode: {
      type: DataTypes.STRING,
      allowNull: false
    },
    pendingAmount: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    transactionStatus: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    gstDetails: {
      type: DataTypes.STRING,
      allowNull: true
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true
    }
 
  }, {
    tableName: 'Transactions',
    timestamps: true
  });

  Transaction.associate = models => {
    Transaction.belongsTo(models.Customer, {
      foreignKey: 'customer_id',
      onDelete: 'CASCADE'
    });
    Transaction.belongsTo(models.Invoice, {
      foreignKey: 'invoice_id',
      onDelete: 'SET NULL'
    });
    // Additional associations if needed...
  };

  return Transaction;
};
