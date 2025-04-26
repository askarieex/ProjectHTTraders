module.exports = (sequelize, DataTypes) => {
    const Ledger = sequelize.define('Ledger', {
      account_of: { type: DataTypes.STRING, allowNull: false },
      address: DataTypes.STRING,
      phone: DataTypes.STRING,
    }, { timestamps: true });
  
    return Ledger;
  };
  