module.exports = (sequelize, DataTypes) => {
    return sequelize.define('User', 
      {
        username: { type: DataTypes.STRING, allowNull: false },
        email:    { type: DataTypes.STRING, allowNull: false, unique: true },
        password: { type: DataTypes.STRING, allowNull: false }
      }, 
      { 
        freezeTableName: true,
        tableName: 'users',  // Use the desired table name
        timestamps: true 
      }
    );
  };
  