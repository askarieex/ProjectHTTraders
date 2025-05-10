module.exports = (sequelize, DataTypes) => {
    const Category = sequelize.define('Category', {
      name: { type: DataTypes.STRING, allowNull: false }
    }, { timestamps: false });
  
    Category.associate = models => {
      Category.hasMany(models.Item, { foreignKey: 'category_id' });
    };
  
    return Category;
  };
  