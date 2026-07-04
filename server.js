const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { sequelize, User, Setting } = require('./models');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const intakeRoutes = require('./routes/intake');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/intake', intakeRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Seed admin and default settings helper
async function seedDatabase() {
  try {
    // 1. Seed global settings if not present
    const defaultGoal = await Setting.findOne({ where: { key: 'recommended_daily_goal' } });
    if (!defaultGoal) {
      await Setting.create({
        key: 'recommended_daily_goal',
        value: '2000'
      });
      console.log('Seeded default global recommended daily water goal (2000ml).');
    }

    // 2. Seed or update the admin account with the configured credentials
    const adminEmail = (process.env.ADMIN_EMAIL || 'kravixtech@gmail.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin12';
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });

    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      await User.create({
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        dailyGoal: null // Uses default
      });
      console.log('----------------------------------------------------');
      console.log('Seeded default Admin user:');
      console.log(`Email:    ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
      console.log('----------------------------------------------------');
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      await existingAdmin.update({
        password: hashedPassword,
        role: 'admin'
      });
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// Start Server and Sync DB
async function startServer() {
  try {
    // Sync database (creates tables if not exists)
    await sequelize.sync();
    console.log('Database synced successfully.');

    // Seed database
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
