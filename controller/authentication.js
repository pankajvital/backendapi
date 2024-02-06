const jwt = require('jsonwebtoken');
const secretKey = 'your-secret-key'; // Replace this with your secret key

const authenticateUser = (req, res, next) => {
  try {
    const token = req.headers.authorization; // Assuming token is passed in the Authorization header

    if (!token) {
      return res.status(401).json({ code: 401, message: 'Authorization token not provided' });
    }

    // Verify the token
    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        return res.status(401).json({ code: 401, message: 'Invalid token' });
      }

      // If token is valid, attach user information to the request object
      req.user = decoded;
      next(); // Move to the next middleware/route handler
    });
  } catch (error) {
    return res.status(500).json({ code: 500, message: 'Server Error', error: error.message });
  }
};

module.exports = authenticateUser;
