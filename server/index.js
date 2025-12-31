const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
require("./workers/video-processor");

// Import routes
const authRoutes = require("./routes/authRoutes");
const videoRoutes = require("./routes/videoRoutes");
// Import error handling middleware
const { errorHandler, notFound } = require("./middleware/errorHandler");

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

/**
 * Middleware Configuration
 */

// Enable CORS (Cross-Origin Resource Sharing)
// Allows frontend to make requests to backend API
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173", // Vite default port
    credentials: true, // Allow cookies/credentials
  })
);

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

/**
 * API Routes
 */

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Video Streaming API is running",
    version: "1.0.0",
  });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Video routes
app.use("/api/videos", videoRoutes);

/**
 * Error Handling
 */

// Handle 404 - Route not found
app.use(notFound);

// Global error handler (must be last middleware)
app.use(errorHandler);

/**
 * Database Connection and Server Startup
 */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    
    // Start server after successful database connection
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`API endpoint: http://localhost:${port}/api`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit process if database connection fails
  });

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  process.exit(1);
});

module.exports = app;
