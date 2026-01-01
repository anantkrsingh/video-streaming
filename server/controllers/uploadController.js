const { Storage } = require("@google-cloud/storage");
const Video = require("../models/Video");
const Organization = require("../models/Organization");
const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const { exec } = require("child_process");
const execAsync = promisify(exec);

const storage = new Storage({
  keyFilename: process.env.GCP_CREDENTIALS,
});
const bucket = storage.bucket(process.env.GCP_BUCKET_NAME);

/**
 * Upload Video Controller
 * Handles video upload with real-time progress tracking via Socket.io
 * @route POST /api/videos/upload
 * @access Private (Organization owner, admin, or editor)
 */
const uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const { title, description, tags, organizationId: bodyOrgId } = req.body;
    const io = req.app.get("io"); // Get Socket.io instance
    const userId = req.user._id;
    // Use organizationId from body if provided (for organization dashboard), otherwise use user's organizationId
    const organizationId = bodyOrgId || req.user.organizationId;

    // Check organization-level permissions if organizationId is provided
    if (organizationId) {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        // Clean up uploaded file
        if (req.file && req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      // Check if user has upload permission in this organization
      const userRole = organization.getUserRole(userId);
      const canUpload = userRole === "owner" || userRole === "admin" || userRole === "editor";
      
      if (!canUpload) {
        // Clean up uploaded file
        if (req.file && req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(403).json({
          success: false,
          message: "You don't have permission to upload videos to this organization",
        });
      }
    }

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    // Parse tags
    const tagsArray = tags ? (Array.isArray(tags) ? tags : tags.split(",").map((t) => t.trim())) : [];

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = req.file.originalname;
    const fileExtension = path.extname(originalName);
    const gcsFileName = `${timestamp}-${path.basename(originalName, fileExtension)}${fileExtension}`;

    // Create video document in database with status "Uploading"
    const video = await Video.create({
      title: title.trim(),
      description: description || "",
      tags: tagsArray,
      rawFileName: originalName,
      status: "Uploading",
      uploadProgress: 0,
      uploadedBy: userId,
      organizationId: organizationId,
      metadata: {
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
    });

    const videoId = video._id.toString();
    const roomId = `video-${videoId}`;

    // Emit initial upload start
    if (io) {
      io.to(roomId).emit("upload-progress", {
        videoId,
        progress: 0,
        status: "Uploading",
      });
    }

    // Upload to Google Cloud Storage with progress tracking
    const file = bucket.file(gcsFileName);
    const stream = fs.createReadStream(req.file.path);

    // Track upload progress
    let uploadedBytes = 0;
    const totalBytes = req.file.size;

    stream.on("data", (chunk) => {
      uploadedBytes += chunk.length;
      const progress = Math.round((uploadedBytes / totalBytes) * 100);

      // Update database
      Video.findByIdAndUpdate(videoId, { uploadProgress: progress }, { new: true })
        .then((updatedVideo) => {
          // Emit progress update via Socket.io
          if (io) {
            io.to(roomId).emit("upload-progress", {
              videoId,
              progress,
              status: "Uploading",
            });
          }
        })
        .catch((err) => console.error("Error updating progress:", err));
    });

    // Upload file to GCS
    await new Promise((resolve, reject) => {
      stream
        .pipe(
          file.createWriteStream({
            metadata: {
              contentType: req.file.mimetype,
            },
            resumable: false,
          })
        )
        .on("error", (error) => {
          console.error("Upload error:", error);
          reject(error);
        })
        .on("finish", async () => {
          try {
            // Make file publicly accessible (or use signed URL)
            await file.makePublic();

            // Get public URL
            const publicUrl = `https://storage.googleapis.com/${process.env.GCP_BUCKET_NAME}/${gcsFileName}`;

            // Update video document
            video.rawView = publicUrl;
            video.uploadProgress = 100;
            video.status = "Processing";
            video.processingProgress = 0;
            await video.save();

            // Emit upload complete
            if (io) {
              io.to(roomId).emit("upload-complete", {
                videoId,
                progress: 100,
                status: "Processing",
                rawView: publicUrl,
              });
            }

            // Generate thumbnail from video
            await generateThumbnail(req.file.path, videoId, io, roomId);

            // Clean up temporary file
            fs.unlinkSync(req.file.path);

            // Start video processing (you can trigger your video processor here)
            // For now, we'll just update status to "Uploaded" after a delay
            // In production, you'd trigger your video processing worker
            setTimeout(async () => {
              video.status = "Uploaded";
              video.processingProgress = 100;
              await video.save();

              if (io) {
                io.to(roomId).emit("processing-complete", {
                  videoId,
                  status: "Uploaded",
                  videoUrl: video.videoUrl,
                });
              }
            }, 2000); // Simulate processing delay

            resolve();
          } catch (error) {
            reject(error);
          }
        });
    });

    res.status(201).json({
      success: true,
      message: "Video uploaded successfully",
      data: {
        video: {
          id: video._id,
          title: video.title,
          status: video.status,
          uploadProgress: video.uploadProgress,
        },
        roomId, // Return roomId for Socket.io connection
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    next(error);
  }
};

/**
 * Generate thumbnail from video frame
 * @param {string} videoPath - Path to video file
 * @param {string} videoId - Video document ID
 * @param {Object} io - Socket.io instance
 * @param {string} roomId - Socket.io room ID
 */
const generateThumbnail = async (videoPath, videoId, io, roomId) => {
  try {
    const thumbnailPath = path.join(path.dirname(videoPath), `thumb-${videoId}.jpg`);

    // Extract frame at 1 second using ffmpeg
    const command = `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 "${thumbnailPath}"`;

    try {
      await execAsync(command);

      // Upload thumbnail to GCS
      const thumbnailFileName = `thumbnails/${videoId}.jpg`;
      const thumbnailFile = bucket.file(thumbnailFileName);

      await bucket.upload(thumbnailPath, {
        destination: thumbnailFileName,
        metadata: {
          contentType: "image/jpeg",
        },
      });

      await thumbnailFile.makePublic();
      const thumbnailUrl = `https://storage.googleapis.com/${process.env.GCP_BUCKET_NAME}/${thumbnailFileName}`;

      // Update video document with thumbnail URL
      await Video.findByIdAndUpdate(videoId, { thumbnailUrl });

      // Clean up local thumbnail file
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }

      if (io) {
        io.to(roomId).emit("thumbnail-generated", {
          videoId,
          thumbnailUrl,
        });
      }
    } catch (ffmpegError) {
      console.error("FFmpeg error generating thumbnail:", ffmpegError);
      // Continue without thumbnail if ffmpeg fails
    }
  } catch (error) {
    console.error("Thumbnail generation error:", error);
    // Don't fail the upload if thumbnail generation fails
  }
};

/**
 * Upload thumbnail for existing video
 * @route POST /api/videos/:id/thumbnail
 * @access Private (Owner or Admin)
 */
const uploadThumbnail = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No thumbnail file uploaded",
      });
    }

    const { id } = req.params;
    const query = { _id: id };

    // Multi-tenant: Filter by organization (admin can see all)
    if (req.user.role !== "admin") {
      query.organizationId = req.user.organizationId;
      query.uploadedBy = req.user._id;
    }

    const video = await Video.findOne(query);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Upload thumbnail to GCS
    const thumbnailFileName = `thumbnails/${id}.jpg`;
    const thumbnailFile = bucket.file(thumbnailFileName);

    await bucket.upload(req.file.path, {
      destination: thumbnailFileName,
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    await thumbnailFile.makePublic();
    const thumbnailUrl = `https://storage.googleapis.com/${process.env.GCP_BUCKET_NAME}/${thumbnailFileName}`;

    // Update video document
    video.thumbnailUrl = thumbnailUrl;
    await video.save();

    // Clean up temporary file
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      success: true,
      message: "Thumbnail uploaded successfully",
      data: {
        thumbnailUrl,
      },
    });
  } catch (error) {
    console.error("Thumbnail upload error:", error);
    next(error);
  }
};

module.exports = {
  uploadVideo,
  uploadThumbnail,
};
