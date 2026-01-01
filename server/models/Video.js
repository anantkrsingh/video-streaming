const mongoose = require("mongoose");

/**
 * Video Schema
 * Defines the structure for video documents in MongoDB
 * Stores video metadata, file information, and processing status
 */
const videoSchema = new mongoose.Schema(
  {
    // Video title
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },

    // Video description
    description: {
      type: String,
      trim: true,
      maxlength: [5000, "Description cannot exceed 5000 characters"],
      default: "",
    },

    // Tags for categorization and search
    tags: {
      type: [String],
      default: [],
    },

    // Raw file name (original filename)
    rawFileName: {
      type: String,
      required: [true, "Raw file name is required"],
    },

    // GCS file name (stored in cloud)
    gcsFileName: {
      type: String,
      default: null,
    },

    // Video processing status
    status: {
      type: String,
      enum: ["Uploading", "Processing", "Flagged", "Uploaded", "Deleted", "Failed"],
      default: "Uploading",
      index: true, // Indexed for efficient queries
    },

    // Flag reason (if status is Flagged)
    flagReason: {
      type: String,
      enum: ["Spam", "Nudity", "Violence", "Copyright", "Other"],
      default: null,
    },

    // Raw video file URL (original uploaded file)
    rawView: {
      type: String,
      default: null,
    },

    // Processed video URL (HLS or streaming URL)
    videoUrl: {
      type: String,
      default: null,
    },

    // HLS playlist URL (for adaptive streaming)
    hlsUrl: {
      type: String,
      default: null,
    },

    // Thumbnail URL
    thumbnailUrl: {
      type: String,
      default: null,
    },

    // Video metadata
    metadata: {
      duration: {
        type: Number, // Duration in seconds
        default: null,
      },
      fileSize: {
        type: Number, // File size in bytes
        default: null,
      },
      mimeType: {
        type: String,
        default: null,
      },
      resolution: {
        width: {
          type: Number,
          default: null,
        },
        height: {
          type: Number,
          default: null,
        },
      },
      codec: {
        video: {
          type: String,
          default: null,
        },
        audio: {
          type: String,
          default: null,
        },
      },
    },

    // Upload progress percentage (0-100)
    uploadProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Processing progress percentage (0-100)
    processingProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Current processing stage (e.g., "Downloading", "Converting", "Uploading")
    processingStage: {
      type: String,
      default: null,
    },

    // Processing JWT token (for Cloud Run container authentication)
    processingToken: {
      type: String,
      default: null,
      select: false, // Don't include in queries by default for security
    },

    // Error message if processing failed
    errorMessage: {
      type: String,
      default: null,
    },

    // User who uploaded the video (reference to User model)
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploader is required"],
      index: true,
    },

    // Organization ID for multi-tenant support
    organizationId: {
      type: String,
      default: null,
      index: true,
    },

    // Timestamps
    uploadedAt: {
      type: Date,
      default: Date.now,
    },

    processedAt: {
      type: Date,
      default: null,
    },

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
    timestamps: true, // Automatically manage createdAt and updatedAt
  }
);

// Indexes for efficient queries
videoSchema.index({ title: "text", description: "text", tags: "text" }); // Text search index
videoSchema.index({ status: 1, uploadedBy: 1 }); // Compound index for user's videos by status
videoSchema.index({ organizationId: 1, status: 1 }); // Multi-tenant index

/**
 * Instance method: Check if video is ready for viewing
 */
videoSchema.methods.isReady = function () {
  return this.status === "Uploaded" && this.videoUrl !== null;
};

/**
 * Instance method: Check if video is processing
 */
videoSchema.methods.isProcessing = function () {
  return this.status === "Processing" || this.status === "Uploading";
};

// Create and export Video model
const Video = mongoose.model("Video", videoSchema);

module.exports = Video;

