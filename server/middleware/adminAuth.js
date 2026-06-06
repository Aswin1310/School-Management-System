const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const adminKey = req.headers['x-admin-key'];

  if (bearerToken) {
    try {
      const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET_ADMIN);
      if (decoded.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access denied' });
      }

      req.user = decoded;
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
  }

  if (!process.env.ADMIN_API_KEY) {
    return res.status(500).json({ message: 'Admin API key is not configured' });
  }

  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ message: 'Admin access denied' });
  }

  req.user = { role: 'admin', id: 'admin-key-auth' };
  next();
};

module.exports = adminAuth;
