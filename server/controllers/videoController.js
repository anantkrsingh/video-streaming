const Video = require("../models/Video");
const { validationResult } = require("express-validator");

/**
 * Video Controller
 * Handles video listing, searching, and metadata operations
 */

/**
 * Get all videos with optional search and filtering
 * @route GET /api/videos
 * @access Private
 */
const getAllVideos = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {};

    // Multi-tenant: Filter by organization
    // If organizationId is provided in query, use it (for organization dashboard)
    // Otherwise, use user's organizationId
    const organizationId = req.query.organizationId || req.user.organizationId;
    if (organizationId) {
      query.organizationId = organizationId;
    } else if (req.user.role !== "admin") {
      // Non-admin users without organizationId see nothing
      query.organizationId = null;
    }

    // Filter by status if provided
    if (status && status !== "all") {
      query.status = status;
    }

    // Text search in title, description, and tags
    if (search && search.trim()) {
      query.$text = { $search: search.trim() };
    }

    // Exclude deleted videos unless specifically requested
    if (status !== "Deleted") {
      query.status = { ...query.status, $ne: "Deleted" };
    }

    // Execute query with pagination
    const videos = await Video.find(query)
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("-__v");

    // Get total count for pagination
    const total = await Video.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        videos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single video by ID
 * @route GET /api/videos/:id
 * @access Private
 */
const getVideoById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = { _id: id };

    // Multi-tenant: Filter by organization (admin can see all)
    if (req.user.role !== "admin") {
      query.organizationId = req.user.organizationId;
    }

    const video = await Video.findOne(query)
      .populate("uploadedBy", "name email")
      .select("-__v");

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        video,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update video metadata (title, description, tags, thumbnail)
 * @route PUT /api/videos/:id
 * @access Private (Owner or Admin)
 */
const updateVideo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, tags, thumbnailUrl } = req.body;

    const query = { _id: id };

    // Multi-tenant: Filter by organization (admin can see all)
    if (req.user.role !== "admin") {
      query.organizationId = req.user.organizationId;
      query.uploadedBy = req.user._id; // Only owner can update
    }

    const video = await Video.findOne(query);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Update fields
    if (title !== undefined) video.title = title;
    if (description !== undefined) video.description = description;
    if (tags !== undefined) video.tags = Array.isArray(tags) ? tags : [];
    if (thumbnailUrl !== undefined) video.thumbnailUrl = thumbnailUrl;

    await video.save();

    res.status(200).json({
      success: true,
      message: "Video updated successfully",
      data: {
        video,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete video (soft delete - sets status to Deleted)
 * @route DELETE /api/videos/:id
 * @access Private (Owner or Admin)
 */
const deleteVideo = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = { _id: id };

    // Multi-tenant: Filter by organization (admin can see all)
    if (req.user.role !== "admin") {
      query.organizationId = req.user.organizationId;
      query.uploadedBy = req.user._id; // Only owner can delete
    }

    const video = await Video.findOne(query);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Soft delete
    video.status = "Deleted";
    await video.save();

    res.status(200).json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
};

