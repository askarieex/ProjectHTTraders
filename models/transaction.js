// backend/models/Transaction.js

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
    /**
     * ADD THIS FIELD so that 'item_id' actually exists in the Transactions table.
     * Make it nullable if some transactions do not belong to any item.
     */
    item_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'item_id'
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
      type: DataTypes.ENUM('Credit', 'Debit', 'Refund', 'PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'CUT'),
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
    },
    quantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('details');
        return value ? JSON.parse(value) : null;
      },
      set(value) {
        this.setDataValue('details', value ? JSON.stringify(value) : null);
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    transaction_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'Transactions',
    timestamps: true
  });

  // Define Associations
  Transaction.associate = models => {
    Transaction.belongsTo(models.Customer, {
      foreignKey: 'customer_id',
      as: 'customer',
      onDelete: 'CASCADE'
    });
    Transaction.belongsTo(models.Invoice, {
      foreignKey: 'invoice_id',
      as: 'invoice',
      onDelete: 'SET NULL'
    });
    /**
     * ADD THIS BELONGS-TO to match Item.hasMany(... { foreignKey: 'item_id' })
     */
    Transaction.belongsTo(models.Item, {
      foreignKey: 'item_id',
      as: 'item',
      onDelete: 'CASCADE'
    });
  };

  return Transaction;
};
