const mongoose = require("mongoose");

/**
 * Organization Schema
 * Defines the structure for organization documents in MongoDB
 * Supports multi-tenant architecture with user access management
 */
const organizationSchema = new mongoose.Schema(
  {
    // Organization name
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
      maxlength: [100, "Organization name cannot exceed 100 characters"],
    },

    // URL-friendly slug for organization
    // Auto-generated from name in pre-save hook
    slug: {
      type: String,
      required: false, // Not required since it's auto-generated
      unique: true,
      sparse: true, // Allows multiple null values before slug is generated
      lowercase: true,
      trim: true,
      // Note: index defined separately below to avoid duplicates
    },

    // Owner of the organization (reference to User model)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner is required"],
      // Note: index defined separately below to avoid duplicates
    },

    // Members with their roles and access levels
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["viewer", "editor", "admin"],
          default: "viewer",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],

    // Organization description
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
// Note: slug index is already created by unique: true constraint
organizationSchema.index({ owner: 1 });
organizationSchema.index({ "members.user": 1 });

/**
 * Pre-save middleware: Generate slug from name
 * This runs before validation, so slug is always generated
 */
organizationSchema.pre("save", async function () {
  // Always generate slug if name exists and slug is not already set or name changed
  if ((this.isModified("name") || this.isNew || !this.slug) && this.name) {
    // Generate slug from name
    let slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

    // Ensure uniqueness by appending number if needed
    let baseSlug = slug;
    let counter = 1;
    const OrganizationModel = this.constructor;
    const currentId = this._id ? this._id.toString() : null;
    
    // Check if slug already exists (excluding current document if updating)
    let existingDoc = await OrganizationModel.findOne({ slug });
    while (existingDoc && existingDoc._id.toString() !== currentId) {
      slug = `${baseSlug}-${counter}`;
      existingDoc = await OrganizationModel.findOne({ slug });
      counter++;
    }

    this.slug = slug;
  }
});

/**
 * Instance method: Check if user is member of organization
 * Handles both populated and non-populated owner/members
 */
organizationSchema.methods.isMember = function (userId) {
  // Handle owner - check if populated (object) or ObjectId
  const ownerId = this.owner._id ? this.owner._id.toString() : this.owner.toString();
  
  // Handle members - check if populated (object) or ObjectId
  const isOwner = ownerId === userId.toString();
  const isMember = this.members.some((member) => {
    const memberUserId = member.user._id ? member.user._id.toString() : member.user.toString();
    return memberUserId === userId.toString();
  });
  
  return isOwner || isMember;
};

/**
 * Instance method: Get user's role in organization
 * Handles both populated and non-populated owner/members
 */
organizationSchema.methods.getUserRole = function (userId) {
  // Handle owner - check if populated (object) or ObjectId
  const ownerId = this.owner._id ? this.owner._id.toString() : this.owner.toString();
  
  if (ownerId === userId.toString()) {
    return "owner";
  }
  
  // Handle members - check if populated (object) or ObjectId
  const member = this.members.find((m) => {
    const memberUserId = m.user._id ? m.user._id.toString() : m.user.toString();
    return memberUserId === userId.toString();
  });
  
  return member ? member.role : null;
};

/**
 * Instance method: Add member to organization
 */
organizationSchema.methods.addMember = function (userId, role, addedBy) {
  // Check if user is already a member
  if (this.isMember(userId)) {
    throw new Error("User is already a member of this organization");
  }

  this.members.push({
    user: userId,
    role: role || "viewer",
    addedBy: addedBy || this.owner,
  });
};

/**
 * Instance method: Remove member from organization
 * Handles both populated and non-populated owner/members
 */
organizationSchema.methods.removeMember = function (userId) {
  // Handle owner - check if populated (object) or ObjectId
  const ownerId = this.owner._id ? this.owner._id.toString() : this.owner.toString();
  
  if (ownerId === userId.toString()) {
    throw new Error("Cannot remove owner from organization");
  }
  
  // Handle members - check if populated (object) or ObjectId
  this.members = this.members.filter((member) => {
    const memberUserId = member.user._id ? member.user._id.toString() : member.user.toString();
    return memberUserId !== userId.toString();
  });
};

/**
 * Instance method: Update member role
 * Handles both populated and non-populated owner/members
 */
organizationSchema.methods.updateMemberRole = function (userId, newRole) {
  // Handle owner - check if populated (object) or ObjectId
  const ownerId = this.owner._id ? this.owner._id.toString() : this.owner.toString();
  
  if (ownerId === userId.toString()) {
    throw new Error("Cannot change owner role");
  }
  
  // Handle members - check if populated (object) or ObjectId
  const member = this.members.find((m) => {
    const memberUserId = m.user._id ? m.user._id.toString() : m.user.toString();
    return memberUserId === userId.toString();
  });
  
  if (member) {
    member.role = newRole;
  } else {
    throw new Error("User is not a member of this organization");
  }
};

// Create and export Organization model
const Organization = mongoose.model("Organization", organizationSchema);

module.exports = Organization;

