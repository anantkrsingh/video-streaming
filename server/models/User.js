const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/**
 * User Schema
 * Defines the structure for user documents in MongoDB
 * Includes role-based access control (RBAC) with three roles:
 * - viewer: Read-only access to assigned videos
 * - editor: Upload, edit, and manage video content
 * - admin: Full system access including user management
 */
const userSchema = new mongoose.Schema(
  {
    // User's full name
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    // Unique email address used for login
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },

    // Hashed password (never stored in plain text)
    // Optional for Google OAuth users
    password: {
      type: String,
      required: function() {
        // Password is required only if user is not using Google OAuth
        return !this.googleId;
      },
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't return password in queries by default
    },

    // Google OAuth ID (for users who sign in with Google)
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
      default: null,
    },

    // User role for RBAC (Role-Based Access Control)
    role: {
      type: String,
      enum: ["viewer", "editor", "admin"],
      default: "viewer",
    },

    // Multi-tenant support: organization/tenant identifier
    // Allows data segregation for different organizations
    organizationId: {
      type: String,
      default: null,
      index: true, // Indexed for efficient queries
    },

    // Account status flags
    isActive: {
      type: Boolean,
      default: true,
    },

    // Timestamp for when user was created
    createdAt: {
      type: Date,
      default: Date.now,
    },

    // Timestamp for last update
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
  }
);

/**
 * Pre-save middleware: Hash password before saving to database
 * This ensures passwords are never stored in plain text
 * Only hash password if it exists (Google OAuth users don't have passwords)
 */
userSchema.pre("save", async function () {
  // If password isn't modified or doesn't exist, skip hashing
  if (!this.isModified("password") || !this.password) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});


/**
 * Instance method: Compare provided password with stored hash
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} - True if passwords match
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Instance method: Convert user document to JSON
 * Removes sensitive information before sending to client
 */
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password; // Never send password to client
  return userObject;
};

// Create and export User model
const User = mongoose.model("User", userSchema);

module.exports = User;

