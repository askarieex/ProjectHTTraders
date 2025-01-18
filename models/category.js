module.exports = (sequelize, DataTypes) => {
    const Category = sequelize.define('Category', {
      name: { type: DataTypes.STRING, allowNull: false }
    }, { timestamps: false });
  
    Category.associate = models => {
      Category.belongsTo(models.Department, { foreignKey: 'department_id', onDelete: 'CASCADE' });
      Category.hasMany(models.Item, { foreignKey: 'category_id', onDelete: 'CASCADE' });
    };
  
    return Category;
  };
  