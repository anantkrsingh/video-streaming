const express = require("express");
const { body } = require("express-validator");
const {
  register,
  login,
  getMe,
  verifyToken,
  googleLogin,
} = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

/**
 * Authentication Routes
 * Handles all authentication-related endpoints
 */

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (defaults to viewer role)
 * @access  Public
 * @validation
 *   - name: Required, 2-100 characters
 *   - email: Required, valid email format
 *   - password: Required, minimum 6 characters
 */
router.post(
  "/register",
  [
    body("name")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Name must be between 2 and 100 characters"),
    body("email")
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return JWT token
 * @access  Public
 * @validation
 *   - email: Required, valid email format
 *   - password: Required, minimum 6 characters
 */
router.post(
  "/login",
  [
    body("email")
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("password")
      .notEmpty()
      .withMessage("Password is required"),
  ],
  login
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user's profile
 * @access  Private (requires authentication)
 */
router.get("/me", authenticate, getMe);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify JWT token validity
 * @access  Private (requires authentication)
 */
router.get("/verify", authenticate, verifyToken);

/**
 * @route   POST /api/auth/google
 * @desc    Login/Register with Google OAuth
 * @access  Public
 * @validation
 *   - token: Required, Google OAuth access token
 */
router.post(
  "/google",
  [
    body("token")
      .notEmpty()
      .withMessage("Google token is required"),
  ],
  googleLogin
);

module.exports = router;

