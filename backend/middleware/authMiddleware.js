const jwt = require("jsonwebtoken");

const authMiddlware = (req, res, next) => {
  const authToken = req.cookies?.auth_token;
  if (!authToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const decode = jwt.verify(authToken, process.env.JWT_SECRET);
    req.user = decode;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

module.exports = authMiddlware;
