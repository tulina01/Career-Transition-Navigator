const jwt = require("jsonwebtoken")
const User = require("../models/user")

// Environment variable for JWT secret (should be set in production)
const JWT_SECRET = process.env.JWT_SECRET || "career-navigator-secret-key"

// Create JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: "7d", // Token expires in 7 days
  })
}

// Middleware to check if user is authenticated
const isAuthenticated = async (req, res, next) => {
  try {
    // Get token from cookie or authorization header
    const token =
      req.cookies.token ||
      (req.headers.authorization && req.headers.authorization.startsWith("Bearer")
        ? req.headers.authorization.split(" ")[1]
        : null)

    console.log(`Auth middleware - Token present: ${!!token}`)

    if (!token) {
      console.log("No token found, continuing as unauthenticated")
      req.user = null
      return next()
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET)
      console.log(`Token verified for user ID: ${decoded.id}`)

      // Find user by id
      const user = await User.findById(decoded.id).select("-password")

      if (!user) {
        console.log(`User not found for ID: ${decoded.id}`)
        req.user = null
        return next()
      }

      // Set user in request
      req.user = user
      console.log(`User authenticated: ${user.email}`)
      next()
    } catch (tokenError) {
      console.error("Token verification failed:", tokenError.message)
      req.user = null
      next()
    }
  } catch (error) {
    console.error("Auth middleware error:", error)
    req.user = null
    next()
  }
}

module.exports = {
  generateToken,
  isAuthenticated,
}
