// models/customer.js
module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define('Customer', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: { // New field
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    balance: { // New field
      type: DataTypes.FLOAT,
      defaultValue: 0,
      allowNull: false,
    },
    totalInvoices: { // New field
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    totalTransactions: { // New field
      type: DataTypes.FLOAT,
      defaultValue: 0,
      allowNull: false,
    },
  }, {
    timestamps: true, // Enable createdAt and updatedAt
    hooks: {
      // Optional: Remove or comment out this hook
      // since default values are already set via migrations
      afterCreate: async (customer, options) => {
        // If you need to perform additional operations after creation
      },
    },
  });

  // Define associations
  Customer.associate = models => {
    Customer.hasMany(models.Invoice, { foreignKey: 'customer_id', onDelete: 'SET NULL' });
  };

  return Customer;
};
