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
    // Index is defined separately with sparse: true to allow multiple null/undefined values
    googleId: {
      type: String,
      // Note: Don't set default: null - let it be undefined for sparse unique to work
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

// Explicitly define the sparse unique index for googleId
// sparse: true allows multiple documents to have undefined/missing googleId
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

// Create and export User model
const User = mongoose.model("User", userSchema);

module.exports = User;

