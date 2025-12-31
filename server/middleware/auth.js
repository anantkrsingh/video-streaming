const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user information to request object
 * Used to protect routes that require authentication
 */

/**
 * Middleware to verify JWT token and authenticate user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    // Expected format: "Bearer <token>"
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please provide a valid token.",
      });
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing.",
      });
    }

    // Verify token using JWT secret from environment variables
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID from token payload
    // Exclude password field from query result
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Token may be invalid.",
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Please contact administrator.",
      });
    }

    // Attach user information to request object for use in route handlers
    req.user = user;
    req.userId = user._id;

    // Proceed to next middleware or route handler
    next();
  } catch (error) {
    // Handle different JWT error types
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token has expired. Please login again.",
      });
    }

    // Handle other errors
    console.error("Authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed. Please try again.",
    });
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks if user has required role(s) to access a route
 * @param {...string} roles - One or more allowed roles
 * @returns {Function} - Express middleware function
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user is authenticated (should be set by authenticate middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // Check if user's role is in the allowed roles list
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}.`,
      });
    }

    // User has required role, proceed to next middleware
    next();
  };
};

/**
 * Multi-tenant middleware: Ensure user can only access their organization's data
 * This enforces data isolation between different organizations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const checkOrganizationAccess = (req, res, next) => {
  // Admin users can access all organizations
  if (req.user.role === "admin") {
    return next();
  }

  // For non-admin users, ensure they can only access their own organization's data
  // This will be used when querying videos and other resources
  req.organizationFilter = {
    organizationId: req.user.organizationId,
  };

  next();
};

module.exports = {
  authenticate,
  authorize,
  checkOrganizationAccess,
};

