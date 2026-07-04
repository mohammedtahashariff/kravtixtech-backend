const validateRegistration = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Simple regex for email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  next();
};

const validateIntake = (req, res, next) => {
  const { amount } = req.body;

  if (amount === undefined || amount === null) {
    return res.status(400).json({ error: 'Amount is required' });
  }

  const numericAmount = Number(amount);
  if (!Number.isInteger(numericAmount)) {
    return res.status(400).json({ error: 'Amount must be an integer' });
  }

  if (numericAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  req.body.amount = numericAmount; // Ensure it's passed as a number
  next();
};

module.exports = {
  validateRegistration,
  validateIntake
};
