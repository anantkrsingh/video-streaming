const Video = require("../models/Video");
const jwt = require("jsonwebtoken");

/**
 * Processing Controller
 * Handles video processing status updates from Cloud Run containers
 * Uses separate JWT tokens for processing authentication
 */

/**
 * Generate a processing token for Cloud Run container
 * Token is valid for 20 minutes
 * @param {string} videoId - Video document ID
 * @param {string} fileName - GCS file name for verification
 * @returns {string} JWT token
 */
const generateProcessingToken = (videoId, fileName) => {
  const payload = {
    videoId,
    fileName,
    type: "processing",
  };

  // Token valid for 20 minutes
  return jwt.sign(payload, process.env.PROCESSING_JWT_SECRET || process.env.JWT_SECRET, {
    expiresIn: "20m",
  });
};

/**
 * Verify processing token middleware
 * Authenticates requests from Cloud Run container
 */
const verifyProcessingToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Processing token required",
      });
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(
      token,
      process.env.PROCESSING_JWT_SECRET || process.env.JWT_SECRET
    );

    if (decoded.type !== "processing") {
      return res.status(401).json({
        success: false,
        message: "Invalid token type",
      });
    }

    // Attach decoded data to request
    req.processingData = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Processing token expired",
      });
    }
    return res.status(401).json({
      success: false,
      message: "Invalid processing token",
    });
  }
};

/**
 * Update processing progress
 * @route POST /api/processing/:videoId/progress
 * @access Processing Token Required
 */
const updateProcessingProgress = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { progress, stage } = req.body;

    // Verify videoId matches token
    if (req.processingData.videoId !== videoId) {
      return res.status(403).json({
        success: false,
        message: "Token does not match video ID",
      });
    }

    // Validate progress
    const progressNum = parseInt(progress, 10);
    if (isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
      return res.status(400).json({
        success: false,
        message: "Progress must be a number between 0 and 100",
      });
    }

    // Update video processing progress
    const video = await Video.findByIdAndUpdate(
      videoId,
      {
        processingProgress: progressNum,
        processingStage: stage || "Processing",
        status: "Processing",
      },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Emit socket event for real-time updates
    const io = req.app.get("io");
    if (io) {
      const roomId = `video-${videoId}`;
      io.to(roomId).emit("processing-progress", {
        videoId,
        progress: progressNum,
        stage: stage || "Processing",
        status: "Processing",
      });
    }

    res.status(200).json({
      success: true,
      message: "Processing progress updated",
      data: {
        videoId,
        progress: progressNum,
        stage: stage || "Processing",
      },
    });
  } catch (error) {
    console.error("Error updating processing progress:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update processing progress",
    });
  }
};

/**
 * Complete video processing
 * @route POST /api/processing/:videoId/complete
 * @access Processing Token Required
 */
const completeProcessing = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { videoUrl, hlsUrl, duration, resolution } = req.body;

    // Verify videoId matches token
    if (req.processingData.videoId !== videoId) {
      return res.status(403).json({
        success: false,
        message: "Token does not match video ID",
      });
    }

    // Update video with processed data
    const updateData = {
      status: "Uploaded",
      processingProgress: 100,
      processingStage: "Complete",
      processedAt: new Date(),
    };

    if (videoUrl) updateData.videoUrl = videoUrl;
    if (hlsUrl) updateData.hlsUrl = hlsUrl;
    if (duration) updateData["metadata.duration"] = duration;
    if (resolution) {
      if (resolution.width) updateData["metadata.resolution.width"] = resolution.width;
      if (resolution.height) updateData["metadata.resolution.height"] = resolution.height;
    }

    const video = await Video.findByIdAndUpdate(videoId, updateData, { new: true });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Emit socket event for real-time updates
    const io = req.app.get("io");
    if (io) {
      const roomId = `video-${videoId}`;
      io.to(roomId).emit("processing-complete", {
        videoId,
        status: "Uploaded",
        videoUrl: video.videoUrl,
        hlsUrl: video.hlsUrl,
      });
    }

    res.status(200).json({
      success: true,
      message: "Video processing completed",
      data: {
        videoId,
        status: "Uploaded",
        videoUrl: video.videoUrl,
        hlsUrl: video.hlsUrl,
      },
    });
  } catch (error) {
    console.error("Error completing processing:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete processing",
    });
  }
};

/**
 * Mark video processing as failed
 * @route POST /api/processing/:videoId/failed
 * @access Processing Token Required
 */
const failProcessing = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { error, stage } = req.body;

    // Verify videoId matches token
    if (req.processingData.videoId !== videoId) {
      return res.status(403).json({
        success: false,
        message: "Token does not match video ID",
      });
    }

    // Update video status to failed
    const video = await Video.findByIdAndUpdate(
      videoId,
      {
        status: "Failed",
        processingStage: stage || "Failed",
        errorMessage: error || "Processing failed",
      },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Emit socket event for real-time updates
    const io = req.app.get("io");
    if (io) {
      const roomId = `video-${videoId}`;
      io.to(roomId).emit("processing-failed", {
        videoId,
        status: "Failed",
        error: error || "Processing failed",
      });
    }

    res.status(200).json({
      success: true,
      message: "Video marked as failed",
      data: {
        videoId,
        status: "Failed",
      },
    });
  } catch (error) {
    console.error("Error marking processing as failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update video status",
    });
  }
};

module.exports = {
  generateProcessingToken,
  verifyProcessingToken,
  updateProcessingProgress,
  completeProcessing,
  failProcessing,
};

