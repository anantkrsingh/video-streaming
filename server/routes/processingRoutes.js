const express = require("express");
const {
  verifyProcessingToken,
  updateProcessingProgress,
  completeProcessing,
  failProcessing,
} = require("../controllers/processingController");

const router = express.Router();

/**
 * Processing Routes
 * API endpoints for Cloud Run container to update video processing status
 * All routes require a valid processing JWT token
 */

/**
 * @route   POST /api/processing/:videoId/progress
 * @desc    Update video processing progress
 * @access  Processing Token Required
 * @body    { progress: number (0-100), stage: string (optional) }
 */
router.post("/:videoId/progress", verifyProcessingToken, updateProcessingProgress);

/**
 * @route   POST /api/processing/:videoId/complete
 * @desc    Mark video processing as complete
 * @access  Processing Token Required
 * @body    { videoUrl: string, hlsUrl: string, duration: number, resolution: { width, height } }
 */
router.post("/:videoId/complete", verifyProcessingToken, completeProcessing);

/**
 * @route   POST /api/processing/:videoId/failed
 * @desc    Mark video processing as failed
 * @access  Processing Token Required
 * @body    { error: string, stage: string (optional) }
 */
router.post("/:videoId/failed", verifyProcessingToken, failProcessing);

module.exports = router;

