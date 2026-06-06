const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Try to verify with student secret first
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_STUDENT);
    } catch (err) {
      // If student secret fails, try teacher secret
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET_TEACHER);
      } catch (err2) {
        return res.status(401).json({ message: 'Token is not valid' });
      }
    }

    req.user = decoded;
    next();

  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;
