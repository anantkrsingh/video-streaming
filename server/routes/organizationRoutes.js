const express = require("express");
const { body } = require("express-validator");
const { authenticate } = require("../middleware/auth");
const {
  createOrganization,
  getMyOrganizations,
  getOrganization,
  addMember,
  removeMember,
  updateMemberRole,
} = require("../controllers/organizationController");

const router = express.Router();

/**
 * Organization Routes
 * Handles all organization-related endpoints
 */

/**
 * @route   POST /api/organizations
 * @desc    Create a new organization
 * @access  Private
 * @validation
 *   - name: Required, max 100 characters
 *   - description: Optional, max 500 characters
 */
router.post(
  "/",
  authenticate,
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Organization name is required")
      .isLength({ max: 100 })
      .withMessage("Organization name cannot exceed 100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),
  ],
  createOrganization
);

/**
 * @route   GET /api/organizations
 * @desc    Get all organizations owned by or accessible to user
 * @access  Private
 */
router.get("/", authenticate, getMyOrganizations);

/**
 * @route   GET /api/organizations/:organizationId
 * @desc    Get single organization by ID (also accepts slug for backward compatibility)
 * @access  Private (Member only)
 */
router.get("/:organizationId", authenticate, getOrganization);

/**
 * @route   POST /api/organizations/:organizationId/members
 * @desc    Add member to organization
 * @access  Private (Owner or Admin only)
 * @validation
 *   - email: Required, valid email
 *   - role: Optional, must be viewer, editor, or admin
 */
router.post(
  "/:organizationId/members",
  authenticate,
  [
    body("email")
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("role")
      .optional()
      .isIn(["viewer", "editor", "admin"])
      .withMessage("Role must be one of: viewer, editor, admin"),
  ],
  addMember
);

/**
 * @route   DELETE /api/organizations/:organizationId/members/:memberId
 * @desc    Remove member from organization
 * @access  Private (Owner or Admin only)
 */
router.delete("/:organizationId/members/:memberId", authenticate, removeMember);

/**
 * @route   PUT /api/organizations/:organizationId/members/:memberId
 * @desc    Update member role in organization
 * @access  Private (Owner or Admin only)
 * @validation
 *   - role: Required, must be viewer, editor, or admin
 */
router.put(
  "/:organizationId/members/:memberId",
  authenticate,
  [
    body("role")
      .isIn(["viewer", "editor", "admin"])
      .withMessage("Role must be one of: viewer, editor, admin"),
  ],
  updateMemberRole
);

module.exports = router;

