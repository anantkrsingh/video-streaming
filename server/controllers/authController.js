const User = require("../models/User");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { validationResult } = require("express-validator");
const { AppError } = require("../middleware/errorHandler");

/**
 * Authentication Controller
 * Handles user registration, login, and authentication-related operations
 */

/**
 * Generate JWT token for authenticated user
 * @param {string} userId - User's MongoDB ObjectId
 * @returns {string} - JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d", // Default: 7 days
  });
};

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
const register = async (req, res, next) => {
  try {
    // Check for validation errors from express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }

    const { name, email, password, organizationId } = req.body;

    // Check if user with email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists.",
      });
    }

    // Create new user
    // Password will be automatically hashed by pre-save middleware in User model
    // Role defaults to "viewer" for all manual registrations
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: "viewer", // Always default to viewer for manual registration
      organizationId: organizationId || null,
    });

    // Generate JWT token for the new user
    const token = generateToken(user._id);

    // Return success response with user data and token
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
        },
        token,
      },
    });
  } catch (error) {
    // Pass error to error handler middleware
    next(error);
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
const login = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Find user by email and include password field (normally excluded)
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Please contact administrator.",
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Return success response with user data and token
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    // Pass error to error handler middleware
    next(error);
  }
};

/**
 * Get current authenticated user's profile
 * @route GET /api/auth/me
 * @access Private
 */
const getMe = async (req, res, next) => {
  try {
    // User information is already attached to req.user by authenticate middleware
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          organizationId: req.user.organizationId,
          isActive: req.user.isActive,
          createdAt: req.user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify token validity
 * @route GET /api/auth/verify
 * @access Private
 */
const verifyToken = async (req, res, next) => {
  try {
    // If we reach here, token is valid (authenticate middleware already verified it)
    res.status(200).json({
      success: true,
      message: "Token is valid",
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          organizationId: req.user.organizationId,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Google OAuth Login
 * Authenticate user with Google OAuth credential (JWT)
 * @route POST /api/auth/google
 * @access Public
 */
const googleLogin = async (req, res, next) => {
  try {
    // Check for validation errors from express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }

    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Google token is required.",
      });
    }

    // Verify Google credential JWT and get user info
    // The token from @react-oauth/google is a JWT that contains user information
    // We'll verify it using Google's tokeninfo endpoint
    let googleResponse;
    try {
      googleResponse = await axios.get(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
      );
    } catch (googleError) {
      // Handle Google API errors
      if (googleError.response?.status === 401 || googleError.response?.status === 400) {
        return res.status(401).json({
          success: false,
          message: "Invalid Google token. Please try again.",
        });
      }
      // Re-throw other errors to be handled by outer catch
      throw googleError;
    }

    const { sub: googleId, email, name, picture } = googleResponse.data;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Unable to retrieve email from Google account.",
      });
    }

    // Check if user already exists
    let user = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { googleId }],
    });

    if (user) {
      // User exists - update Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: "Account is deactivated. Please contact administrator.",
        });
      }
    } else {
      // Create new user with Google OAuth
      user = await User.create({
        name: name || email.split("@")[0],
        email: email.toLowerCase(),
        googleId,
        role: "viewer", // Default role for Google OAuth users
        isActive: true,
      });
    }

    // Generate JWT token
    const jwtToken = generateToken(user._id);

    // Return success response
    res.status(200).json({
      success: true,
      message: "Google login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
        },
        token: jwtToken,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    // Pass error to error handler middleware
    // Ensure next is a function before calling it
    if (typeof next === 'function') {
      return next(error);
    }
    // Fallback: send error response directly if next is not available
    return res.status(500).json({
      success: false,
      message: error.message || "An error occurred during Google login",
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  verifyToken,
  googleLogin,
};

