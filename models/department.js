module.exports = (sequelize, DataTypes) => {
    const Department = sequelize.define('Department', 
      {
        name: { type: DataTypes.STRING, allowNull: false }
      }, 
      { 
        freezeTableName: true,
        tableName: 'departments',  // Use actual table name
        timestamps: false 
      }
    );
  
    Department.associate = models => {
      Department.hasMany(models.Category, { foreignKey: 'department_id', onDelete: 'CASCADE' });
    };
  
    return Department;
  };
  