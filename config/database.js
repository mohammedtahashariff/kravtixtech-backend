const { Sequelize } = require('sequelize');
require('dotenv').config();

const storagePath = process.env.DATABASE_URL || './database.sqlite';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: storagePath,
  logging: false // disable logging for cleaner terminal output
});

module.exports = sequelize;
