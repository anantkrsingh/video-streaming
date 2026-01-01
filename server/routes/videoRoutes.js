const express = require("express");
const { body } = require("express-validator");
const multer = require("multer");
const { authenticate, authorize } = require("../middleware/auth");
const { uploadVideo, uploadThumbnail } = require("../controllers/uploadController");
const {
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
} = require("../controllers/videoController");

const router = express.Router();

// Configure multer for video uploads
const videoUpload = multer({
  dest: "temp/",
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept video files only
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed"), false);
    }
  },
});

// Configure multer for thumbnail uploads
const thumbnailUpload = multer({
  dest: "temp/",
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept image files only
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

/**
 * Video Routes
 * Handles all video-related endpoints
 */

/**
 * @route   GET /api/videos/public
 * @desc    Get all public videos (status: Uploaded) - No auth required
 * @access  Public
 * @query   search, page, limit
 */
router.get("/public", getAllVideos);

/**
 * @route   GET /api/videos
 * @desc    Get all videos with search and filtering
 * @access  Private
 * @query   search, status, page, limit
 */
router.get("/", authenticate, getAllVideos);

/**
 * @route   GET /api/videos/public/:id
 * @desc    Get single public video by ID (status: Uploaded) - No auth required
 * @access  Public
 */
router.get("/public/:id", getVideoById);

/**
 * @route   GET /api/videos/:id
 * @desc    Get single video by ID
 * @access  Private
 */
router.get("/:id", authenticate, getVideoById);

/**
 * @route   POST /api/videos/upload
 * @desc    Upload a new video
 * @access  Private (Organization owner, admin, or editor)
 * @note    Authorization is handled in the controller based on organization role
 * @validation
 *   - title: Required
 *   - description: Optional
 *   - tags: Optional (comma-separated or array)
 *   - video: Required (multipart/form-data)
 */
router.post(
  "/upload",
  authenticate,
  // Removed authorize middleware - authorization handled in controller based on org role
  [
    body("title")
      .trim()
      .notEmpty()
      .withMessage("Title is required")
      .isLength({ max: 200 })
      .withMessage("Title cannot exceed 200 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage("Description cannot exceed 5000 characters"),
    body("tags")
      .optional()
      .custom((value) => {
        if (typeof value === "string") {
          return true; // Will be parsed in controller
        }
        if (Array.isArray(value)) {
          return value.every((tag) => typeof tag === "string");
        }
        return false;
      })
      .withMessage("Tags must be a string or array of strings"),
  ],
  videoUpload.single("video"),
  uploadVideo
);

/**
 * @route   POST /api/videos/:id/thumbnail
 * @desc    Upload thumbnail for existing video
 * @access  Private (Owner or Admin)
 */
router.post(
  "/:id/thumbnail",
  authenticate,
  thumbnailUpload.single("thumbnail"),
  uploadThumbnail
);

/**
 * @route   PUT /api/videos/:id
 * @desc    Update video metadata
 * @access  Private (Owner or Admin)
 * @validation
 *   - title: Optional
 *   - description: Optional
 *   - tags: Optional (array)
 *   - thumbnailUrl: Optional
 */
router.put(
  "/:id",
  authenticate,
  [
    body("title")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Title cannot exceed 200 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage("Description cannot exceed 5000 characters"),
    body("tags")
      .optional()
      .isArray()
      .withMessage("Tags must be an array"),
    body("thumbnailUrl")
      .optional()
      .isURL()
      .withMessage("Thumbnail URL must be a valid URL"),
  ],
  updateVideo
);

/**
 * @route   DELETE /api/videos/:id
 * @desc    Delete video (soft delete)
 * @access  Private (Owner or Admin)
 */
router.delete("/:id", authenticate, deleteVideo);

module.exports = router;
