const express = require('express');
const router = express.Router();
const { User, Setting } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/users - Admin only. View all registered users.
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'email', 'role', 'dailyGoal', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// DELETE /api/users/:id - Admin only. Delete a user account.
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);

    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Edge Case: Admin tries to delete their own account
    if (req.user.id === targetUserId) {
      return res.status(400).json({ error: 'Admin cannot delete their own account' });
    }

    const user = await User.findByPk(targetUserId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.destroy();
    res.json({ message: 'User account deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// PUT /api/users/me/goal - User/Admin. Update own custom daily goal.
router.put('/me/goal', authenticateToken, async (req, res) => {
  try {
    const { dailyGoal } = req.body;

    if (dailyGoal !== null && (isNaN(dailyGoal) || dailyGoal <= 0)) {
      return res.status(400).json({ error: 'Daily goal must be a positive integer or null' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.dailyGoal = dailyGoal === null ? null : parseInt(dailyGoal, 10);
    await user.save();

    res.json({
      message: 'Daily goal updated successfully',
      dailyGoal: user.dailyGoal
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update daily goal' });
  }
});

// GET /api/users/settings/daily-goal - All authenticated users. Get global default daily goal.
router.get('/settings/daily-goal', authenticateToken, async (req, res) => {
  try {
    const setting = await Setting.findOne({ where: { key: 'recommended_daily_goal' } });
    const value = setting ? parseInt(setting.value, 10) : 2000; // default to 2000ml (8 glasses / 2 litres)
    res.json({ recommended_daily_goal: value });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve global recommended daily goal' });
  }
});

// PUT /api/users/settings/daily-goal - Admin only. Set or update global default daily goal.
router.put('/settings/daily-goal', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { recommended_daily_goal } = req.body;

    if (!recommended_daily_goal || isNaN(recommended_daily_goal) || recommended_daily_goal <= 0) {
      return res.status(400).json({ error: 'Recommended daily goal must be a positive integer' });
    }

    let setting = await Setting.findOne({ where: { key: 'recommended_daily_goal' } });
    if (setting) {
      setting.value = recommended_daily_goal.toString();
      await setting.save();
    } else {
      setting = await Setting.create({
        key: 'recommended_daily_goal',
        value: recommended_daily_goal.toString()
      });
    }

    res.json({
      message: 'Global recommended daily goal updated successfully',
      recommended_daily_goal: parseInt(setting.value, 10)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update global recommended daily goal' });
  }
});

module.exports = router;
