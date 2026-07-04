const sequelize = require('../config/database');
const User = require('./User');
const IntakeLog = require('./IntakeLog');
const Setting = require('./Setting');

// Define Relationships
User.hasMany(IntakeLog, { foreignKey: 'userId', as: 'logs', onDelete: 'CASCADE' });
IntakeLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User,
  IntakeLog,
  Setting
};
