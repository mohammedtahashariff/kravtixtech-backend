const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { IntakeLog, User, Setting, sequelize } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateIntake } = require('../middleware/validation');

// Helper function to resolve the daily goal for a user
async function getUserDailyGoal(user) {
  if (user.dailyGoal) {
    return user.dailyGoal;
  }
  const setting = await Setting.findOne({ where: { key: 'recommended_daily_goal' } });
  return setting ? parseInt(setting.value, 10) : 2000; // fallback to 2000ml (8 glasses / 2 litres)
}

// POST /api/intake - User/Admin. Log water intake.
router.post('/', authenticateToken, validateIntake, async (req, res) => {
  try {
    const { amount, timestamp } = req.body;

    const log = await IntakeLog.create({
      userId: req.user.id,
      amount,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log water intake' });
  }
});

// GET /api/intake/today - User/Admin. View today's total intake vs daily goal.
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const dailyGoal = await getUserDailyGoal(user);

    // Compute start and end of today in local/server time
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await IntakeLog.findAll({
      where: {
        userId: req.user.id,
        timestamp: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      order: [['timestamp', 'DESC']]
    });

    const totalIntake = logs.reduce((sum, log) => sum + log.amount, 0);

    res.json({
      date: new Date().toLocaleDateString('sv'), // YYYY-MM-DD
      logs,
      totalIntake,
      dailyGoal
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve today\'s intake logs' });
  }
});

// GET /api/intake/history - User/Admin. View date-wise intake history with daily totals.
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const logs = await IntakeLog.findAll({
      where: { userId: req.user.id },
      order: [['timestamp', 'DESC']]
    });

    // Group logs by date (YYYY-MM-DD) in local time
    const historyMap = {};
    logs.forEach(log => {
      const dateStr = new Date(log.timestamp).toLocaleDateString('sv');
      historyMap[dateStr] = (historyMap[dateStr] || 0) + log.amount;
    });

    const history = Object.keys(historyMap).map(date => ({
      date,
      total: historyMap[date]
    }));

    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve intake history' });
  }
});

// DELETE /api/intake/:id - User/Admin. Delete log.
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const logId = parseInt(req.params.id, 10);
    if (isNaN(logId)) {
      return res.status(400).json({ error: 'Invalid log ID' });
    }

    const log = await IntakeLog.findByPk(logId);
    if (!log) {
      return res.status(404).json({ error: 'Intake log not found' });
    }

    // Edge Case: User tries to delete an entry that doesn't belong to them
    // Admin is authorized to delete any entry
    if (log.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You cannot delete intake logs belonging to other users' });
    }

    await log.destroy();
    res.json({ message: 'Intake log deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete intake log' });
  }
});

// GET /api/intake/users/:id - Admin only. View water intake history of any user.
router.get('/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await User.findByPk(targetUserId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const dailyGoal = await getUserDailyGoal(user);

    const logs = await IntakeLog.findAll({
      where: { userId: targetUserId },
      order: [['timestamp', 'DESC']]
    });

    // Group logs by date (YYYY-MM-DD)
    const historyMap = {};
    logs.forEach(log => {
      const dateStr = new Date(log.timestamp).toLocaleDateString('sv');
      historyMap[dateStr] = (historyMap[dateStr] || 0) + log.amount;
    });

    const history = Object.keys(historyMap).map(date => ({
      date,
      total: historyMap[date]
    }));

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        dailyGoal
      },
      logs,
      history
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve user\'s water intake history' });
  }
});

module.exports = router;
