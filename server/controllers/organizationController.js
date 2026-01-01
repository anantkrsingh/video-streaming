const Organization = require("../models/Organization");
const User = require("../models/User");
const { validationResult } = require("express-validator");

/**
 * Organization Controller
 * Handles organization creation, management, and access control
 */

/**
 * Create a new organization
 * @route POST /api/organizations
 * @access Private
 */
const createOrganization = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }

    const { name, description } = req.body;
    const userId = req.user._id;

    // Create organization with current user as owner
    const organization = await Organization.create({
      name: name.trim(),
      description: description || "",
      owner: userId,
      members: [], // Owner is not in members array, they're the owner
    });

    // Update user's organizationId to the new organization
    await User.findByIdAndUpdate(userId, {
      organizationId: organization._id.toString(),
    });

    res.status(201).json({
      success: true,
      message: "Organization created successfully",
      data: {
        organization: {
          id: organization._id,
          name: organization.name,
          slug: organization.slug,
          description: organization.description,
          owner: organization.owner,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all organizations owned by user
 * @route GET /api/organizations
 * @access Private
 */
const getMyOrganizations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get organizations where user is owner or member
    const organizations = await Organization.find({
      $or: [
        { owner: userId },
        { "members.user": userId },
      ],
    })
      .populate("owner", "name email")
      .populate("members.user", "name email")
      .select("-__v")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        organizations: organizations.map((org) => ({
          id: org._id,
          name: org.name,
          slug: org.slug,
          description: org.description,
          owner: {
            id: org.owner._id,
            name: org.owner.name,
            email: org.owner.email,
          },
          isOwner: org.owner._id.toString() === userId.toString(),
          memberCount: org.members.length + 1, // +1 for owner
          createdAt: org.createdAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single organization by ID (also accepts slug for backward compatibility)
 * @route GET /api/organizations/:organizationId
 * @access Private (Member only)
 */
const getOrganization = async (req, res, next) => {
  try {
    const { organizationId } = req.params;
    const userId = req.user._id;

    // Find organization by ID or slug (for backward compatibility)
    const organization = await Organization.findOne({
      $or: [{ _id: organizationId }, { slug: organizationId }],
    })
      .populate("owner", "name email")
      .populate("members.user", "name email role")
      .select("-__v");

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Check if user is member
    if (!organization.isMember(userId)) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this organization",
      });
    }

    const userRole = organization.getUserRole(userId);

    res.status(200).json({
      success: true,
      data: {
        organization: {
          id: organization._id,
          name: organization.name,
          slug: organization.slug,
          description: organization.description,
          owner: {
            id: organization.owner._id,
            name: organization.owner.name,
            email: organization.owner.email,
          },
          members: organization.members.map((member) => ({
            user: {
              id: member.user._id,
              name: member.user.name,
              email: member.user.email,
            },
            role: member.role,
            addedAt: member.addedAt,
          })),
          userRole,
          isOwner: userRole === "owner",
          createdAt: organization.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add member to organization
 * @route POST /api/organizations/:organizationId/members
 * @access Private (Owner or Admin only)
 */
const addMember = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }

    const { organizationId } = req.params;
    const { email, role } = req.body;
    const userId = req.user._id;

    // Find organization by ID or slug (for backward compatibility)
    const organization = await Organization.findOne({
      $or: [{ _id: organizationId }, { slug: organizationId }],
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Check permissions (owner or admin)
    const userRole = organization.getUserRole(userId);
    if (userRole !== "owner" && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to add members",
      });
    }

    // Find user by email
    const userToAdd = await User.findOne({ email: email.toLowerCase() });
    if (!userToAdd) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Add member
    try {
      organization.addMember(userToAdd._id, role || "viewer", userId);
      await organization.save();

      // Update user's organizationId if they don't have one
      if (!userToAdd.organizationId) {
        await User.findByIdAndUpdate(userToAdd._id, {
          organizationId: organization._id.toString(),
        });
      }

      res.status(200).json({
        success: true,
        message: "Member added successfully",
        data: {
          member: {
            user: {
              id: userToAdd._id,
              name: userToAdd.name,
              email: userToAdd.email,
            },
            role: role || "viewer",
          },
        },
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Remove member from organization
 * @route DELETE /api/organizations/:organizationId/members/:memberId
 * @access Private (Owner or Admin only)
 */
const removeMember = async (req, res, next) => {
  try {
    const { organizationId, memberId } = req.params;
    const userId = req.user._id;

    // Find organization by ID or slug (for backward compatibility)
    const organization = await Organization.findOne({
      $or: [{ _id: organizationId }, { slug: organizationId }],
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Check permissions (owner or admin)
    const userRole = organization.getUserRole(userId);
    if (userRole !== "owner" && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to remove members",
      });
    }

    // Remove member
    try {
      organization.removeMember(memberId);
      await organization.save();

      res.status(200).json({
        success: true,
        message: "Member removed successfully",
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Update member role
 * @route PUT /api/organizations/:organizationId/members/:memberId
 * @access Private (Owner or Admin only)
 */
const updateMemberRole = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }

    const { organizationId, memberId } = req.params;
    const { role } = req.body;
    const userId = req.user._id;

    // Find organization by ID or slug (for backward compatibility)
    const organization = await Organization.findOne({
      $or: [{ _id: organizationId }, { slug: organizationId }],
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Check permissions (owner or admin)
    const userRole = organization.getUserRole(userId);
    if (userRole !== "owner" && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update member roles",
      });
    }

    // Update member role
    try {
      organization.updateMemberRole(memberId, role);
      await organization.save();

      res.status(200).json({
        success: true,
        message: "Member role updated successfully",
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrganization,
  getMyOrganizations,
  getOrganization,
  addMember,
  removeMember,
  updateMemberRole,
};

