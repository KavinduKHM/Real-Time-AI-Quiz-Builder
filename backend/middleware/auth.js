const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No authentication token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // For existing route handlers that expect req.user.id / req.user.username
    req.user = {
      id: decoded.id,
      username: decoded.username
    };

    // Also expose flat properties for newer code paths
    req.userId = decoded.id;
    req.username = decoded.username;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = auth;